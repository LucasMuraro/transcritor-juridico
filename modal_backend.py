import modal
from fastapi import UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import fastapi

# Nome do aplicativo na sua conta do Modal
app = modal.App("transcritor-juridico")

# Baixa o Whisper na hora de montar o servidor
def download_model():
    import whisper
    whisper.load_model("small")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git")
    .pip_install("openai-whisper", "torch", "fastapi", "python-multipart", "pydub", "git+https://github.com/m-bain/whisperx.git")
    .run_function(download_model)
)

with image.imports():
    import whisper
    import tempfile
    import os
    import shutil
    import zipfile
    import re
    from datetime import datetime

web_app = fastapi.FastAPI()
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.function(image=image, gpu="T4", timeout=1800, secrets=[modal.Secret.from_name("huggingface-secret")])
@modal.asgi_app()
def fastapi_app():
    return web_app

# --- Regex para ler as mensagens do TXT exportado pelo WhatsApp ---
PATTERNS = [
    re.compile(r'^\[(\d{1,2}/\d{1,2}/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?)\]\s([^:]+?):\s(.*)$'),
    re.compile(r'^(\d{1,2}/\d{1,2}/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?)\s[-–]\s([^:]+?):\s(.*)$'),
]
AUDIO_REF = re.compile(
    r'<anexado:\s*(\S+\.(?:opus|m4a|mp3|aac|ogg|wav))|'
    r'((?:PTT|AUD)-\d{8}-WA\d+\.(?:opus|m4a|mp3|aac|ogg|wav))|'
    r'(\d{8}-(?:AUDIO|PTT)-[\d-]+\.(?:opus|m4a|mp3|aac|ogg|wav))',
    re.IGNORECASE
)
MEDIA_OMIT = re.compile(
    r'<.*(arquivo|mídia|media|omitido|omitted|anexado).*>|audio omitted|áudio omitido|\(file attached\)',
    re.IGNORECASE
)

def detect_audio(text: str):
    m = AUDIO_REF.search(text)
    if m:
        fname = m.group(1) or m.group(2) or m.group(3)
        if fname: fname = fname.lstrip()
        return True, fname
    if MEDIA_OMIT.search(text):
        return True, None
    return False, None

def parse_chat(txt_path: str):
    for enc in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            with open(txt_path, "r", encoding=enc) as f:
                content = f.read()
            break
        except:
            pass
    msgs, cur = [], None
    for line in content.splitlines():
        line = line.strip().replace('\u200e','').replace('\u200f','')
        parsed = None
        for pat in PATTERNS:
            m = pat.match(line)
            if m: parsed = m.groups(); break
        if parsed:
            if cur: msgs.append(cur)
            d, t, sender, text = parsed
            is_aud, fname = detect_audio(text)
            cur = dict(date=d, time=t, sender=sender.strip(), text=text.strip(),
                       is_audio=is_aud, audio_file=fname, transcription=None)
        elif cur:
            cur["text"] += "\n" + line
    if cur: msgs.append(cur)
    return msgs

# --- Endpoint API ---
@web_app.post("/")
async def process_file(
    file: UploadFile = File(...), 
    job_type: str = Form("audio"),
    start_date: str = Form(""),
    end_date: str = Form("")
):
    """Recebe arquivos e decide se vai tratar ZIP do WhatsApp ou áudio normal."""
    model = whisper.load_model("small")
    tmp_dir = tempfile.mkdtemp()
    
    try:
        # Se for o ZIP do WhatsApp
        if job_type == "wpp":
            if not file.filename.lower().endswith('.zip'):
                return {"success": False, "error": "Para o WhatsApp, envie o arquivo .zip exportado do app."}
                
            zip_path = os.path.join(tmp_dir, "backup.zip")
            with open(zip_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(tmp_dir)
            
            chat_txt = None
            for root, dirs, files in os.walk(tmp_dir):
                for f in files:
                    if f.endswith("_chat.txt") or f.endswith(".txt"):
                        chat_txt = os.path.join(root, f)
                        break
                if chat_txt: break
            
            if not chat_txt:
                return {"success": False, "error": "Arquivo .txt de conversa não encontrado dentro do ZIP."}
                
            msgs = parse_chat(chat_txt)
            
            def parse_date_str(date_str):
                try:
                    if len(date_str.split('/')[2]) == 2:
                        return datetime.strptime(date_str, "%d/%m/%y").date()
                    return datetime.strptime(date_str, "%d/%m/%Y").date()
                except:
                    return None
            
            if start_date:
                try:
                    s_dt = datetime.strptime(start_date[:10], "%Y-%m-%d").date()
                    msgs = [m for m in msgs if parse_date_str(m['date']) and parse_date_str(m['date']) >= s_dt]
                except Exception as e:
                    print("Erro parse start_date:", e)
            if end_date:
                try:
                    e_dt = datetime.strptime(end_date[:10], "%Y-%m-%d").date()
                    msgs = [m for m in msgs if parse_date_str(m['date']) and parse_date_str(m['date']) <= e_dt]
                except Exception as e:
                    print("Erro parse end_date:", e)
            
            amap = {}
            for root, dirs, files in os.walk(tmp_dir):
                for f in files:
                    if f.lower().endswith((".opus", ".m4a", ".mp3", ".ogg", ".wav", ".aac")):
                        amap[f.lower()] = os.path.join(root, f)
            
            for m in msgs:
                if m["is_audio"]:
                    k = m.get("audio_file")
                    if k and k.lower() in amap:
                        audio_path = amap[k.lower()]
                        result = model.transcribe(audio_path, language="pt", fp16=False)
                        m["transcription"] = result["text"].strip()
                    else:
                        m["transcription"] = "[Áudio não anexado ou não encontrado no ZIP]"
            
            lines = ["TRANSCRIÇÃO MASTER DE WHATSAPP", "=" * 70, ""]
            for m in msgs:
                dt = f"[{m['date']} {m['time']}]"
                s = m["sender"]
                if m["is_audio"]:
                    lines.append(f"{dt} {s} — 🎙️ ÁUDIO: {m.get('audio_file') or '(omitido)'}")
                    if m["transcription"]:
                        lines.append(f"Transcrição: {m['transcription']}")
                else:
                    lines.append(f"{dt} {s}: {m['text']}")
                lines.append("")
                
            return {"success": True, "text": "\n".join(lines)}

        elif job_type == "audiencia":
            media_path = os.path.join(tmp_dir, "media_file")
            with open(media_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            
            import whisperx
            device = "cuda"
            compute_type = "float16"
            
            # 1. Transcribe with WhisperX
            model_wx = whisperx.load_model("small", device, compute_type=compute_type, language="pt")
            audio = whisperx.load_audio(media_path)
            result = model_wx.transcribe(audio, batch_size=16)
            
            # 2. Align
            try:
                model_a, metadata = whisperx.load_align_model(language_code="pt", device=device)
                result = whisperx.align(result["segments"], model_a, metadata, audio, device)
            except Exception as e:
                print("Erro no alinhamento:", e)
            
            # 3. Diarize
            hf_token = os.environ.get("HF_TOKEN")
            if not hf_token:
                return {"success": False, "error": "HF_TOKEN não encontrado na nuvem."}
            
            from whisperx.diarize import DiarizationPipeline, assign_word_speakers
            diarize_model = DiarizationPipeline(use_auth_token=hf_token, device=device)
            diarize_segments = diarize_model(audio)
            result = assign_word_speakers(diarize_segments, result)
            
            # 4. Format
            lines = ["TRANSCRIÇÃO DE AUDIÊNCIA (COM DIARIZAÇÃO)", "=" * 70, ""]
            current_speaker = None
            current_texts = []
            current_start = 0
            
            def format_timestamp(seconds: float) -> str:
                h = int(seconds // 3600)
                m = int((seconds % 3600) // 60)
                s = int(seconds % 60)
                return f"{h:02d}:{m:02d}:{s:02d}"

            for seg in result.get("segments", []):
                speaker = seg.get("speaker", "ORADOR DESCONHECIDO")
                text = seg.get("text", "").strip()
                if not text: continue
                if speaker != current_speaker:
                    if current_speaker is not None:
                        lines.append(f"[{format_timestamp(current_start)}] {current_speaker}: {' '.join(current_texts)}")
                    current_speaker = speaker
                    current_start = seg.get("start", 0)
                    current_texts = [text]
                else:
                    current_texts.append(text)
            if current_speaker is not None:
                lines.append(f"[{format_timestamp(current_start)}] {current_speaker}: {' '.join(current_texts)}")
                
            return {"success": True, "text": "\n\n".join(lines), "segments": result.get("segments", [])}
            
        # Se for Audio ou Video simples (sem diarização pesada)
        else:
            media_path = os.path.join(tmp_dir, "media_file")
            with open(media_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
                
            result = model.transcribe(media_path, language="pt", fp16=False)
            
            # Formatar em falas pulando linha (simples) para entregar um TXT bonito
            lines = ["TRANSCRIÇÃO DE ÁUDIO/VÍDEO", "=" * 70, ""]
            current_texts = []
            for seg in result.get("segments", []):
                text = seg["text"].strip()
                if not text: continue
                current_texts.append(text)
                if text.endswith(('.', '?', '!')):
                    lines.append(" ".join(current_texts))
                    current_texts = []
            if current_texts:
                lines.append(" ".join(current_texts))
                
            return {"success": True, "text": "\n\n".join(lines), "segments": result.get("segments", [])}

    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
