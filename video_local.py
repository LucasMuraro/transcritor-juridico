#!/usr/bin/env python3
import os, sys, shutil, logging, argparse, subprocess
from pathlib import Path
from datetime import datetime

try:
    import whisper
except ImportError:
    print("ERRO: openai-whisper não instalado.")
    sys.exit(1)

def setup_logging(log_dir: Path) -> logging.Logger:
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"pipeline_media_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    logger = logging.getLogger("media_local")
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

def format_timestamp(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"

def detect_names(segments):
    """Tenta encontrar 'Meu nome é...' ou 'Sou o/a...' e mapear oradores."""
    # Placeholder para lógica real de diarização. 
    # Por enquanto, foca no formato e detecção via regex simples.
    import re
    name_map = {}
    pattern = re.compile(r"(?:meu nome é|sou o|sou a|fala aqui é o|fala aqui é a)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)", re.IGNORECASE)
    
    for seg in segments:
        text = seg["text"].strip()
        match = pattern.search(text)
        if match:
            # Em uma diarização real, associaríamos ao speaker_id.
            # Aqui vamos apenas registrar que um nome foi citado.
            name = match.group(1)
            name_map["ORADOR_AUTO"] = name.upper()
            break
    return name_map

def transcribe_media(media_path: Path, dirs: dict, model_name: str, log, start_time=None, end_time=None):
    log.info(f"📂 Processando arquivo: {media_path.name}")
    dest_media = dirs["vid"] / media_path.name
    if not dest_media.exists(): shutil.copy2(media_path, dest_media)

    media_to_process = str(dest_media)
    
    # Se houver filtro de tempo (Clipping)
    if start_time or end_time:
        log.info(f"✂️ Recortando trecho solicitado via FFmpeg...")
        temp_audio = dirs["root"] / f"clip_{datetime.now().strftime('%H%M%S')}.wav"
        ffmpeg_bin = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
        cmd = [ffmpeg_bin, "-y", "-i", str(dest_media)]
        if start_time: cmd.extend(["-ss", start_time])
        if end_time: cmd.extend(["-to", end_time])
        cmd.extend(["-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", str(temp_audio)])
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            media_to_process = str(temp_audio)
            log.info(f"✓ Recorte pronto: {start_time or '00:00'} -> {end_time or 'Fim'}")
        except Exception as e:
            log.error(f"FALHA NO RECORTE: {e}")
            sys.exit(1)

    log.info(f"⚙️ Carregando Whispers Modelo: {model_name}...")
    model = whisper.load_model(model_name)
    
    log.info("🚀 Transcrevendo fala em texto (Acompanhe abaixo)...")
    try:
        # Habilitando verbose=True para aparecer no terminal em tempo real
        result = model.transcribe(media_to_process, language="pt", verbose=True, fp16=False)
        out_file = dirs["out"] / "transcricao_final.txt"
        
        header = [
            f" TRANSCRIÇÃO — CASO: {dest_media.stem.upper()} ",
            f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            f"Filtro aplicado: {start_time or 'Início'} -> {end_time or 'Fim'}",
            "="*50, ""
        ]
        
        lines = []
        name_map = detect_names(result.get("segments", []))
        default_name = name_map.get("ORADOR_AUTO", "ORADOR")
        
        current_start = None
        current_texts = []

        for seg in result.get("segments", []):
            text = seg["text"].strip()
            if not text:
                continue
                
            if current_start is None:
                current_start = seg["start"]
                
            current_texts.append(text)
            
            if text.endswith(('.', '?', '!')):
                combined_text = " ".join(current_texts)
                lines.append(f"[{format_timestamp(current_start)}] {default_name}: {combined_text}")
                current_start = None
                current_texts = []

        if current_texts:
            combined_text = " ".join(current_texts)
            lines.append(f"[{format_timestamp(current_start or 0)}] {default_name}: {combined_text}")
            
        out_file.write_text("\n".join(header + lines), encoding="utf-8")
        log.info(f"✓ transcricao_final.txt salvo em {dirs['out']}")
        
        if media_to_process.endswith(".wav") and "clip_" in media_to_process:
            os.remove(media_to_process)
            
    except Exception as e:
        log.error(f"FALHA NA TRANSCRIÇÃO: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("media_path")
    parser.add_argument("case_name")
    parser.add_argument("model", nargs="?", default="small")
    parser.add_argument("--ss", dest="start_time")
    parser.add_argument("--to", dest="end_time")
    parser.add_argument("--diarize", action="store_true", help="Habilitar identificação de oradores")
    args = parser.parse_args()

    inp = Path(args.media_path)
    case_slug = args.case_name.lower().replace(" ", "_").strip()

    dirs = create_dirs(Path.cwd(), case_slug)
    log = setup_logging(dirs["logs"])
    
    log.info("🔥 ILoveTranscrever Media Engine Iniciada...")
    transcribe_media(inp, dirs, args.model, log, args.start_time, args.end_time)

if __name__ == "__main__":
    main()
