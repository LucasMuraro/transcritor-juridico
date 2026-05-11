#!/usr/bin/env python3
"""
Pipeline de Transcrição de Áudios do WhatsApp para Análise Jurídica
Versão 1.1 — compatível com openai >= 1.x e >= 2.x

USO:
    python3 whatsapp_pipeline.py <caminho_do_zip> <nome_do_caso>

EXEMPLO:
    python3 whatsapp_pipeline.py "WhatsApp Chat - Felipe Muraro.zip" "felipe_muraro"

CONFIGURAÇÃO:
    export OPENAI_API_KEY="sk-proj-..."
"""

import os, re, sys, json, csv, time, shutil, zipfile, logging, hashlib, tempfile
from pathlib import Path
from datetime import datetime
from typing import Optional

# ── Dependências externas
try:
    from openai import OpenAI
except ImportError:
    print("ERRO: openai não instalado. Rode: pip3 install openai"); sys.exit(1)

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False

try:
    from dotenv import load_dotenv; load_dotenv()
except ImportError:
    pass

# ── Configurações
OPENAI_API_KEY   = os.environ.get("OPENAI_API_KEY", "")
WHISPER_MODEL    = "whisper-1"
WHISPER_LANGUAGE = "pt"
MAX_AUDIO_MB     = 24
CHUNK_MS         = 10 * 60 * 1000   # 10 min por chunk
RETRY_MAX        = 3
RETRY_WAIT       = 5
AUDIO_EXT        = {".opus", ".mp3", ".m4a", ".aac", ".wav", ".ogg"}

# ── Padrões de parse do WhatsApp
PATTERNS = [
    # iOS:     [DD/MM/YYYY, HH:MM:SS] Remetente: msg
    re.compile(r'^\[(\d{1,2}/\d{1,2}/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?)\]\s([^:]+?):\s(.*)$'),
    # Android: DD/MM/YYYY, HH:MM - Remetente: msg
    re.compile(r'^(\d{1,2}/\d{1,2}/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?)\s[-–]\s([^:]+?):\s(.*)$'),
]
AUDIO_REF = re.compile(
    r'<anexado:\s*(\S+\.(?:opus|m4a|mp3|aac|ogg|wav))|'
    r'((?:PTT|AUD)-\d{8}-WA\d+\.(?:opus|m4a|mp3|aac|ogg|wav))|'
    r'(\d{8}-(?:AUDIO|PTT)-[\d-]+\.(?:opus|m4a|mp3|aac|ogg|wav))',
    re.IGNORECASE
)
MEDIA_OMIT = re.compile(
    r'<.*(arquivo|mídia|media|omitido|omitted|anexado).*>|'
    r'audio omitted|áudio omitido|\(file attached\)',
    re.IGNORECASE
)


# ──────────────────────────────────────
def setup_logging(log_dir: Path) -> logging.Logger:
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    logger = logging.getLogger("wpp")
    logger.setLevel(logging.DEBUG)
    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    fh.setFormatter(fmt); ch.setFormatter(fmt)
    logger.addHandler(fh); logger.addHandler(ch)
    return logger


def create_dirs(base: Path, case: str) -> dict:
    root = base / "casos" / case
    d = {
        "root":  root,
        "orig":  root / "01_original",
        "aud":   root / "02_audios",
        "raw":   root / "03_transcricoes_raw",
        "txt":   root / "04_transcricoes_txt",
        "out":   root / "05_consolidado",
        "logs":  root / "06_logs",
    }
    for v in d.values(): v.mkdir(parents=True, exist_ok=True)
    return d


def extract_input(inp: Path, dest: Path, log):
    if inp.suffix.lower() == ".zip":
        log.info(f"Extraindo ZIP: {inp.name}")
        with zipfile.ZipFile(inp) as z: z.extractall(dest)
    elif inp.is_dir():
        shutil.copytree(inp, dest, dirs_exist_ok=True)
    else:
        raise ValueError(f"Entrada inválida: {inp}")


def parse_dt(date_s: str, time_s: str) -> Optional[datetime]:
    ts = time_s.strip().upper()
    for fmt, val in [
        ("%d/%m/%Y %H:%M:%S", f"{date_s} {ts}"),
        ("%d/%m/%Y %H:%M",    f"{date_s} {ts}"),
        ("%d/%m/%y %H:%M:%S", f"{date_s} {ts}"),
        ("%d/%m/%y %H:%M",    f"{date_s} {ts}"),
    ]:
        try: return datetime.strptime(val, fmt)
        except: pass
    return None


def detect_audio(text: str):
    m = AUDIO_REF.search(text)
    if m:
        fname = m.group(1) or m.group(2) or m.group(3)
        if fname: fname = fname.lstrip()
        return True, fname
    if MEDIA_OMIT.search(text):
        return True, None
    return False, None


def parse_chat(txt_path: Path, log) -> list:
    for enc in ("utf-8", "utf-8-sig", "latin-1"):
        try: content = txt_path.read_text(encoding=enc); break
        except: pass
    else:
        raise RuntimeError(f"Não decodificou {txt_path}")

    msgs, cur, idx = [], None, 0
    for line in content.splitlines():
        line = line.strip().replace('\u200e','').replace('\u200f','').replace('\u202a','').replace('\u202c','')
        parsed = None
        for pat in PATTERNS:
            m = pat.match(line)
            if m: parsed = m.groups(); break
        if parsed:
            if cur: msgs.append(cur)
            d, t, sender, text = parsed
            is_aud, fname = detect_audio(text)
            cur = dict(index=idx, date=d, time=t, dt=parse_dt(d, t),
                       sender=sender.strip(), text=text.strip(),
                       is_audio=is_aud, audio_file=fname,
                       audio_path=None, transcription=None,
                       transcription_file=None, error=None)
            idx += 1
        elif cur:
            cur["text"] += "\n" + line
    if cur: msgs.append(cur)
    n_aud = sum(1 for m in msgs if m["is_audio"])
    log.info(f"Mensagens: {len(msgs)} | Áudios: {n_aud}")
    return msgs


def map_audios(orig_dir: Path, msgs: list, log):
    amap = {f.name.lower(): f for f in orig_dir.rglob("*") if f.suffix.lower() in AUDIO_EXT}
    log.info(f"Arquivos de áudio no ZIP: {len(amap)}")
    matched = 0
    for m in msgs:
        if m["is_audio"] and m["audio_file"]:
            k = m["audio_file"].lower()
            if k in amap:
                m["audio_path"] = amap[k]; matched += 1
            else:
                log.warning(f"Não encontrado: {m['audio_file']}")
    # Associa por ordem os que ficaram sem nome
    sem_path = [m for m in msgs if m["is_audio"] and not m["audio_path"]]
    usados   = {m["audio_file"].lower() for m in msgs if m.get("audio_file")}
    sobras   = sorted([p for n, p in amap.items() if n not in usados], key=lambda p: p.name)
    for m, p in zip(sem_path, sobras):
        m["audio_path"] = p; m["audio_file"] = p.name; matched += 1
    log.info(f"Áudios associados: {matched}")


def split_audio(path: Path, tmp: Path, log) -> list:
    size = path.stat().st_size / 1024 / 1024
    if size <= MAX_AUDIO_MB: return [path]
    if not PYDUB_AVAILABLE:
        log.error(f"{path.name} ({size:.1f}MB) > limite. Instale pydub e ffmpeg para dividir automaticamente.")
        return [path]
    log.info(f"Dividindo {path.name} ({size:.1f}MB)...")
    audio = AudioSegment.from_file(str(path))
    out_dir = tmp / f"chunks_{path.stem}"; out_dir.mkdir(exist_ok=True)
    chunks, start, i = [], 0, 1
    while start < len(audio):
        chunk = audio[start:start+CHUNK_MS]
        cp = out_dir / f"{path.stem}_p{i:03d}.mp3"
        chunk.export(str(cp), format="mp3")
        chunks.append(cp); start += CHUNK_MS; i += 1
    log.info(f"  {len(chunks)} partes")
    return chunks


def transcribe_one(path: Path, client: OpenAI, log) -> dict:
    res = {"text": "", "raw": None, "ok": False, "error": None}
    for attempt in range(1, RETRY_MAX+1):
        try:
            with open(path, "rb") as f:
                resp = client.audio.transcriptions.create(
                    model=WHISPER_MODEL, file=f,
                    language=WHISPER_LANGUAGE, response_format="verbose_json"
                )
            # Compatível com openai v1 e v2
            if hasattr(resp, "text"):
                res["text"] = resp.text.strip()
            else:
                res["text"] = str(resp)
            if hasattr(resp, "model_dump"):
                res["raw"] = resp.model_dump()
            elif hasattr(resp, "dict"):
                res["raw"] = resp.dict()
            else:
                res["raw"] = {"text": res["text"]}
            res["ok"] = True; return res
        except Exception as e:
            log.warning(f"  Tentativa {attempt}/{RETRY_MAX}: {e}")
            if attempt < RETRY_MAX: time.sleep(RETRY_WAIT)
    res["error"] = f"Falhou após {RETRY_MAX} tentativas"; return res


def transcribe_all(msgs: list, dirs: dict, client: OpenAI, log) -> dict:
    targets = [m for m in msgs if m["is_audio"] and m.get("audio_path")]
    stats = {"total": len(targets), "success": 0, "failed": 0}
    if not targets:
        log.warning("Nenhum áudio para transcrever."); return stats
    log.info(f"Transcrevendo {len(targets)} áudio(s)...")
    with tempfile.TemporaryDirectory() as tmp:
        for i, msg in enumerate(targets, 1):
            ap = msg["audio_path"]
            log.info(f"[{i}/{len(targets)}] {ap.name}")
            dest = dirs["aud"] / ap.name
            if not dest.exists(): shutil.copy2(ap, dest)
            chunks = split_audio(ap, Path(tmp), log)
            parts_text, parts_raw, ok = [], [], True
            for chunk in chunks:
                r = transcribe_one(chunk, client, log)
                if r["ok"]:
                    parts_text.append(r["text"]); parts_raw.append(r["raw"])
                else:
                    ok = False; msg["error"] = r["error"]
                    log.error(f"  FALHA: {ap.name} — {r['error']}"); break
            if ok:
                full = " ".join(parts_text).strip()
                msg["transcription"] = full
                stats["success"] += 1
                # Salva raw JSON
                raw_path = dirs["raw"] / f"{ap.stem}_raw.json"
                raw_path.write_text(json.dumps({
                    "audio": ap.name, "index": msg["index"],
                    "datetime": msg["dt"].isoformat() if msg["dt"] else None,
                    "sender": msg["sender"], "transcription": full,
                    "api_response": parts_raw,
                    "md5": hashlib.md5(ap.read_bytes()).hexdigest(),
                }, ensure_ascii=False, indent=2), encoding="utf-8")
                # Salva TXT limpo
                txt_p = dirs["txt"] / f"{ap.stem}.txt"
                txt_p.write_text(
                    f"Arquivo:    {ap.name}\n"
                    f"Data/Hora:  {msg['dt'] or msg['date']+' '+msg['time']}\n"
                    f"Remetente:  {msg['sender']}\n"
                    f"{'─'*50}\n{full}\n", encoding="utf-8")
                msg["transcription_file"] = txt_p.name
                log.info(f"  ✓ OK ({len(full)} chars)")
            else:
                stats["failed"] += 1
    log.info(f"Concluído — OK: {stats['success']} | Falhas: {stats['failed']}")
    return stats


def write_master(msgs: list, dirs: dict, case: str, log) -> Path:
    out = dirs["out"] / "master_transcript.txt"
    lines = [
        f"TRANSCRIÇÃO MASTER — CASO: {case.upper()}",
        f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}",
        f"Total de mensagens: {len(msgs)}",
        "=" * 70, ""
    ]
    for m in msgs:
        dt = m["dt"].strftime("%Y-%m-%d %H:%M") if m["dt"] else f"{m['date']} {m['time']}"
        s  = m["sender"]
        if m["is_audio"]:
            lines.append(f"[{dt}] {s} — 🎙️ ÁUDIO: {m.get('audio_file') or '(omitido)'}")
            if m["transcription"]:
                lines.append(f"Transcrição: {m['transcription']}")
            elif m["error"]:
                lines.append(f"⚠️  ERRO: {m['error']}")
            else:
                lines.append(f"⚠️  Arquivo não encontrado")
        else:
            txt = m["text"]
            if re.search(r'criptografia|end-to-end|protegid', txt, re.I):
                lines.append(f"[{dt}] [SISTEMA] {txt}")
            else:
                lines.append(f"[{dt}] {s}: {txt}")
        lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")
    log.info(f"✓ master_transcript.txt salvo")
    return out


def write_csv(msgs: list, dirs: dict, log):
    out = dirs["out"] / "timeline.csv"
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, ["index","data","hora","remetente","tipo",
                                "arquivo_audio","transcricao","arquivo_transcricao","erro"])
        w.writeheader()
        for m in msgs:
            dt = m["dt"]
            w.writerow(dict(
                index=m["index"],
                data=dt.strftime("%d/%m/%Y") if dt else m["date"],
                hora=dt.strftime("%H:%M:%S") if dt else m["time"],
                remetente=m["sender"],
                tipo="áudio" if m["is_audio"] else "texto",
                arquivo_audio=m.get("audio_file") or "",
                transcricao=m.get("transcription") or "",
                arquivo_transcricao=m.get("transcription_file") or "",
                erro=m.get("error") or "",
            ))
    log.info("✓ timeline.csv salvo")


def write_manifest(msgs: list, dirs: dict, case: str, stats: dict, log):
    out = dirs["out"] / "manifest.json"
    audios = []
    for m in msgs:
        if m["is_audio"]:
            audios.append(dict(
                index=m["index"],
                datetime=m["dt"].isoformat() if m["dt"] else None,
                sender=m["sender"], audio_file=m.get("audio_file"),
                transcription=m.get("transcription"),
                transcription_file=m.get("transcription_file"),
                error=m.get("error"),
                status="ok" if m.get("transcription") else ("erro" if m.get("error") else "sem_arquivo"),
            ))
    out.write_text(json.dumps(dict(
        caso=case, gerado_em=datetime.now().isoformat(),
        total_msgs=len(msgs), **stats, modelo=WHISPER_MODEL,
        idioma=WHISPER_LANGUAGE, audios=audios,
    ), ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("✓ manifest.json salvo")


def write_pending(msgs: list, dirs: dict, log):
    pend = [m for m in msgs if m["is_audio"] and not m.get("transcription")]
    if not pend: return
    out = dirs["out"] / "PENDENCIAS.txt"
    lines = [f"PENDÊNCIAS — {len(pend)} áudio(s) não transcritos", "="*60, ""]
    for m in pend:
        dt = m["dt"].strftime("%Y-%m-%d %H:%M") if m["dt"] else f"{m['date']} {m['time']}"
        lines += [f"[{dt}] {m['sender']}",
                  f"  Arquivo: {m.get('audio_file') or '(não identificado)'}",
                  f"  Motivo:  {m.get('error') or 'Arquivo não encontrado'}",""]
    out.write_text("\n".join(lines), encoding="utf-8")
    log.warning(f"{len(pend)} pendências — ver PENDENCIAS.txt")


# ── MAIN ──────────────────────────────
def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)

    inp       = Path(sys.argv[1])
    case_name = sys.argv[2].lower().replace(" ", "_")

    if not inp.exists():
        print(f"ERRO: não encontrado: {inp}"); sys.exit(1)
    if not OPENAI_API_KEY:
        print("ERRO: OPENAI_API_KEY não definida."); sys.exit(1)

    dirs   = create_dirs(Path.cwd(), case_name)
    log    = setup_logging(dirs["logs"])

    log.info("=" * 60)
    log.info(f"Pipeline WhatsApp → Transcrição Jurídica | Caso: {case_name}")
    log.info("=" * 60)

    extract_input(inp, dirs["orig"], log)

    txt_files = list(dirs["orig"].rglob("_chat.txt")) + list(dirs["orig"].rglob("*.txt"))
    if not txt_files:
        log.error("_chat.txt não encontrado."); sys.exit(1)
    log.info(f"Chat: {txt_files[0].name}")

    msgs = parse_chat(txt_files[0], log)
    map_audios(dirs["orig"], msgs, log)

    client = OpenAI(api_key=OPENAI_API_KEY)
    stats  = transcribe_all(msgs, dirs, client, log)

    write_master(msgs, dirs, case_name, log)
    write_csv(msgs, dirs, log)
    write_manifest(msgs, dirs, case_name, stats, log)
    write_pending(msgs, dirs, log)

    log.info("")
    log.info("=" * 60)
    log.info("PRONTO!")
    log.info(f"  Mensagens:  {len(msgs)}")
    log.info(f"  Áudios:     {stats['total']}")
    log.info(f"  Transcritos:{stats['success']}")
    log.info(f"  Falhas:     {stats['failed']}")
    log.info(f"  Resultado:  {dirs['out']}/master_transcript.txt")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
