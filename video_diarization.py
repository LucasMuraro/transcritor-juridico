#!/usr/bin/env python3
import os, sys, shutil, logging, argparse, re
from pathlib import Path
from datetime import datetime

HF_TOKEN = os.environ.get("HF_TOKEN", "")

# Compatibilidade com PyTorch 2.6+ — força weights_only=False para modelos pyannote/whisperx
try:
    import torch
    _original_torch_load = torch.load
    def _patched_torch_load(*args, **kwargs):
        kwargs['weights_only'] = False
        return _original_torch_load(*args, **kwargs)
    torch.load = _patched_torch_load
except Exception:
    pass

try:
    import whisperx
except ImportError:
    print("ERRO: whisperx não instalado. Execute: pip3 install whisperx")
    sys.exit(1)

def setup_logging(log_dir: Path) -> logging.Logger:
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"pipeline_diarization_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    logger = logging.getLogger("diarization_local")
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
        "root": root,
        "vid":  root / "01_original",
        "out":  root / "05_consolidado",
        "logs": root / "06_logs",
    }
    for v in d.values(): v.mkdir(parents=True, exist_ok=True)
    return d

NAME_PATTERNS = re.compile(
    r'(?i:eu sou|meu nome é|meu nome e|aqui é|aqui e|fala aqui é|fala aqui e|me chamo|pode me chamar de)\s+(?i:a |o |dr\.?\s*|dra\.?\s*|doutor\s+|doutora\s+)?([A-ZÀ-Ú][a-záàãâéêíóôõúüç]+(?:\s+[A-ZÀ-Ú][a-záàãâéêíóôõúüç]+)*)'
)

def detect_speaker_names(segments: list, log) -> dict:
    """Varre os segmentos e tenta associar SPEAKER_XX a um nome real."""
    name_map = {}
    for seg in segments:
        speaker = seg.get("speaker")
        text = seg.get("text", "")
        if not speaker or speaker in name_map:
            continue
        match = NAME_PATTERNS.search(text)
        if match:
            name = match.group(1).strip().upper()
            name_map[speaker] = name
            log.info(f"🏷️ Orador identificado: {speaker} → {name}")
    return name_map

def format_timestamp(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"

def transcribe_with_diarization(media_path: Path, dirs: dict, model_name: str, log):
    if not HF_TOKEN:
        log.error("HF_TOKEN não encontrado. Configure o token do HuggingFace.")
        sys.exit(1)

    log.info(f"📂 Processando: {media_path.name}")

    # Limpa outputs anteriores para não entregar arquivo velho em caso de falha
    out_antigo = dirs["out"] / "transcricao_final.txt"
    if out_antigo.exists():
        out_antigo.unlink()
        log.info("🗑️ Output anterior removido.")

    dest_media = dirs["vid"] / media_path.name
    shutil.copy2(media_path, dest_media)

    device = "cpu"
    compute_type = "int8"

    log.info(f"⚙️ Carregando WhisperX modelo: {model_name}...")
    model = whisperx.load_model(model_name, device, compute_type=compute_type, language="pt")

    log.info("🎙️ Transcrevendo áudio...")
    audio = whisperx.load_audio(str(dest_media))
    result = model.transcribe(audio, language="pt", batch_size=16)

    try:
        log.info("🔗 Alinhando timestamps por palavra...")
        model_a, metadata = whisperx.load_align_model(language_code="pt", device=device)
        result = whisperx.align(result["segments"], model_a, metadata, audio, device)
        log.info("✓ Alinhamento concluído.")
    except Exception as e:
        log.warning(f"⚠️ Alinhamento ignorado (timestamps de segmento mantidos): {e}")
        result = {"segments": result["segments"]}

    log.info("👥 Identificando oradores (pode demorar)...")
    from whisperx.diarize import DiarizationPipeline, assign_word_speakers
    diarize_model = DiarizationPipeline(use_auth_token=HF_TOKEN, device=device)
    diarize_segments = diarize_model(audio)
    result = assign_word_speakers(diarize_segments, result)

    segments = result.get("segments", [])
    name_map = detect_speaker_names(segments, log)
    if name_map:
        log.info(f"✓ {len(name_map)} orador(es) identificado(s) pelo nome.")
    else:
        log.info("ℹ️ Nenhum orador se apresentou pelo nome. Usando SPEAKER_00, SPEAKER_01...")

    out_file = dirs["out"] / "transcricao_final.txt"
    header = [
        f" TRANSCRIÇÃO COM IDENTIFICAÇÃO DE ORADORES — CASO: {dest_media.stem.upper()} ",
        f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        "="*50, ""
    ]
    lines = []
    current_speaker = None
    current_start = None
    current_texts = []

    for seg in segments:
        raw_speaker = seg.get("speaker", "ORADOR")
        speaker = name_map.get(raw_speaker, raw_speaker)
        text = seg.get("text", "").strip()
        
        if not text:
            continue

        if speaker != current_speaker:
            if current_speaker is not None:
                combined_text = " ".join(current_texts)
                lines.append(f"[{format_timestamp(current_start)}] {current_speaker}: {combined_text}")
            current_speaker = speaker
            current_start = seg["start"]
            current_texts = [text]
        else:
            current_texts.append(text)
            
    if current_speaker is not None:
        combined_text = " ".join(current_texts)
        lines.append(f"[{format_timestamp(current_start)}] {current_speaker}: {combined_text}")

    out_file.write_text("\n".join(header + lines), encoding="utf-8")
    log.info(f"✓ transcricao_final.txt salvo em {dirs['out']}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("media_path")
    parser.add_argument("case_name")
    parser.add_argument("model", nargs="?", default="small")
    args = parser.parse_args()

    inp = Path(args.media_path)
    case_slug = args.case_name.lower().replace(" ", "_").strip()

    dirs = create_dirs(Path.cwd(), case_slug)
    log = setup_logging(dirs["logs"])

    log.info("🔥 WhisperX Diarization Engine Iniciada...")
    transcribe_with_diarization(inp, dirs, args.model, log)

if __name__ == "__main__":
    main()
