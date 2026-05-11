#!/usr/bin/env python3
import os, re, sys, json, csv, time, shutil, zipfile, logging, hashlib, tempfile, argparse
from pathlib import Path
from datetime import datetime
from typing import Optional

try:
    import whisper
except ImportError:
    print("ERRO: openai-whisper não instalado.")
    sys.exit(1)

WHISPER_MODEL    = "small" 
WHISPER_LANGUAGE = "pt"
AUDIO_EXT        = {".opus", ".mp3", ".m4a", ".aac", ".wav", ".ogg"}
IMG_EXT          = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic"}
DOC_EXT          = {".pdf", ".docx", ".doc", ".xls", ".xlsx", ".ppt", ".pptx", ".csv"}

PATTERNS = [
    # Cobre iOS Global: [18/12/2025, 13:24:44] or [2026-02-23 20:29] or [12/18/25, 1:25 PM]
    re.compile(r'^\[([0-9\/\-\.]+)[\s,]+([0-9:]+(?:\s?[aApP][mM])?)\]\s([^:]+?):\s(.*)$', re.IGNORECASE),
    # Cobre Android Global: 18/12/2025 13:24 - or 12/18/25, 1:25 PM - 
    re.compile(r'^([0-9\/\-\.]+)[\s,]+([0-9:]+(?:\s?[aApP][mM])?)[\s\-–]+([^:]+?):\s(.*)$', re.IGNORECASE),
]

FILE_REF = re.compile(
    r'<(?:arquivo\s)?(?:anexad[oa]?|attached|adjunto|arquivo)[\s:]+([^>]+)>|'
    r'(\d{8}-(?:AUDIO|PTT|WA).*\.(?:opus|m4a|mp3|aac|ogg|wav|jpg|jpeg|png|pdf|docx|doc|xls|xlsx))',
    re.IGNORECASE
)

def setup_logging(log_dir: Path) -> logging.Logger:
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    logger = logging.getLogger("wpp_local")
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
        "root":    root,
        "orig":    root / "01_original",
        "aud":     root / "02_audios",
        "txt":     root / "04_transcricoes_txt", # Renamed to simplify
        "out":     root / "05_consolidado",
        "anexos":  root / "05_consolidado" / "anexos_provas",
        "logs":    root / "06_logs",
    }
    for v in d.values(): v.mkdir(parents=True, exist_ok=True)
    return d

def extract_input(inp: Path, dest: Path, log):
    if inp.suffix.lower() == ".zip":
        log.info(f"Descompactando {inp.name}...")
        with zipfile.ZipFile(inp) as z: z.extractall(dest)
    elif inp.is_dir():
        shutil.copytree(inp, dest, dirs_exist_ok=True)

def parse_dt(date_s: str, time_s: str) -> Optional[datetime]:
    date_s = date_s.replace(".", "/").replace("-", "/")
    time_s = time_s.strip().upper()
    
    date_fmts = ["%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d/%m/%y", "%m/%d/%y", "%y/%m/%d"]
    time_fmts = ["%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p", "%I:%M:%S%p", "%I:%M%p"]
    
    for d_fmt in date_fmts:
        for t_fmt in time_fmts:
            try:
                return datetime.strptime(f"{date_s} {time_s}", f"{d_fmt} {t_fmt}")
            except ValueError:
                continue
    return None

def detect_file(text: str):
    m = FILE_REF.search(text)
    if m:
        fname = m.group(1) or m.group(2)
        if fname:
            fname = fname.strip()
            ext = Path(fname).suffix.lower()
            return True, fname, ext
    return False, None, None

def parse_chat(txt_path: Path, log) -> list:
    for enc in ("utf-8", "utf-8-sig", "latin-1"):
        try: content = txt_path.read_text(encoding=enc); break
        except: pass
    else: return []

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
            has_f, fname, ext = detect_file(text)
            cur = dict(index=idx, date=d, time=t, dt=parse_dt(d, t),
                       sender=sender.strip(), text=text.strip(),
                       has_file=has_f, file_name=fname, file_ext=ext,
                       is_audio=(ext in AUDIO_EXT),
                       is_image=(ext in IMG_EXT),
                       is_doc=(ext in DOC_EXT),
                       audio_path=None, transcription=None, error=None)
            idx += 1
        elif cur:
            cur["text"] += "\n" + line
    if cur: msgs.append(cur)
    return msgs

def map_and_copy_files(orig_dir: Path, msgs: list, dirs: dict, extract_imgs, extract_docs, log):
    amap = {f.name.lower(): f for f in orig_dir.rglob("*") if f.is_file()}
    count_imgs, count_docs = 0, 0
    for m in msgs:
        if m["has_file"] and m["file_name"]:
            k = m["file_name"].lower()
            tp = amap.get(k)
            if tp:
                if m["is_audio"]: m["audio_path"] = tp
                if (m["is_image"] and extract_imgs) or (m["is_doc"] and extract_docs):
                    dest = dirs["anexos"] / m["file_name"]
                    if not dest.exists():
                        shutil.copy2(tp, dest)
                        if m["is_image"]: count_imgs += 1
                        else: count_docs += 1
    log.info(f"✓ Extraídos: {count_imgs} imagens e {count_docs} documentos/docs.")

def transcribe_all_local(msgs: list, dirs: dict, model, log) -> dict:
    targets = [m for m in msgs if m["is_audio"] and m.get("audio_path")]
    stats = {"total": len(targets), "success": 0, "failed": 0}
    if not targets:
        log.info("Nenhum áudio para transcrever nesta seleção.")
        return stats
    
    log.info(f"⚙️ Carregando Whisper para transcrever {len(targets)} áudios...")
    for i, msg in enumerate(targets, 1):
        ap = msg["audio_path"]
        log.info(f"[{i}/{len(targets)}] Transcrevendo: {ap.name}")
        try:
            res = model.transcribe(str(ap), language=WHISPER_LANGUAGE, verbose=False, fp16=False)
            msg["transcription"] = res["text"].strip()
            stats["success"] += 1
            # Salva TXT individual
            txt_p = dirs["txt"] / f"{ap.stem}.txt"
            txt_p.write_text(f"De: {msg['sender']}\n{msg['transcription']}", encoding="utf-8")
        except Exception as e:
            msg["error"] = str(e)
            stats["failed"] += 1
            log.error(f"FALHA: {e}")
    return stats

def write_master(msgs: list, dirs: dict, case: str, log, only_media=False):
    out = dirs["out"] / "master_transcript.txt"
    title = "RELATÓRIO DE EXTRAÇÃO" if only_media else "TRANSCRIÇÃO MASTER"
    lines = [f" {title} — CASO: {case.upper()} ", f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", "="*50, ""]
    
    for m in msgs:
        dt = m["dt"].strftime("%Y-%m-%d %H:%M") if m["dt"] else f"{m['date']} {m['time']}"
        
        if m["is_audio"]:
            lines.append(f"[{dt}] {m['sender']} — 🎙️ ÁUDIO: {m['file_name']}")
            if m["transcription"]:
                lines.append(f"Transcrição: {m['transcription']}")
            else:
                reason = "Áudio não encontrado no ZIP" if not m.get("audio_path") else f"Falha na leitura (Erro interno do Whisper: {m.get('error', 'desconhecido')})"
                lines.append(f"Transcrição: [NÃO DISPONÍVEL - {reason}]")
            lines.append("")
        elif m["has_file"] and (m["is_image"] or m["is_doc"]):
            lines.append(f"[{dt}] {m['sender']} — 📎 ANEXO: {m['file_name']}")
            lines.append(f"Texto original da mensagem: {m['text']}")
            lines.append("")
        else:
            lines.append(f"[{dt}] {m['sender']}: {m['text']}")
            lines.append("")
        
    out.write_text("\n".join(lines), encoding="utf-8")
    log.info(f"✓ {out.name} salvo com sucesso.")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("zip_path"); parser.add_argument("case_name")
    parser.add_argument("model", nargs="?", default="small")
    parser.add_argument("--start-date"); parser.add_argument("--end-date")
    parser.add_argument("--extract-images", action="store_true")
    parser.add_argument("--extract-docs", action="store_true")
    parser.add_argument("--only-media", action="store_true")
    args = parser.parse_args()
    
    case_slug = args.case_name.lower().replace(" ", "_").strip()
    dirs = create_dirs(Path.cwd(), case_slug)
    log = setup_logging(dirs["logs"])
    
    log.info("🔥 Iniciando ILoveTranscrever Pipeline Engine...")
    extract_input(Path(args.zip_path), dirs["orig"], log)
    
    txts = list(dirs["orig"].rglob("*.txt"))
    if not txts:
        log.error("ERRO: _chat.txt não encontrado no ZIP.")
        return
    
    msgs = parse_chat(txts[0], log)
    if args.start_date:
        try: msgs = [m for m in msgs if m["dt"] and m["dt"] >= datetime.fromisoformat(args.start_date)]
        except: log.warning("Formato de data inicial inválido.")
    if args.end_date:
        try: msgs = [m for m in msgs if m["dt"] and m["dt"] <= datetime.fromisoformat(args.end_date)]
        except: log.warning("Formato de data final inválido.")
    
    log.info(f"Filtro aplicado: {len(msgs)} mensagens encontradas.")
    
    map_and_copy_files(dirs["orig"], msgs, dirs, args.extract_images, args.extract_docs, log)
    
    if not args.only_media:
        model = whisper.load_model(args.model)
        transcribe_all_local(msgs, dirs, model, log)
    else:
        log.info("⚡ Modo Rápido (Somente Extração) ativado. Pulando Whisper.")
    
    write_master(msgs, dirs, args.case_name, log, args.only_media)
    log.info(f"🚀 FINALIZADO! Ver em: {dirs['out']}")

if __name__ == "__main__":
    main()
