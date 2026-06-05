"""
AuditorIA — Backend Modal
Arquitetura assíncrona: dispatcher leve (CPU) + função pesada (GPU) com spawn.
Resolve timeout de HTTP síncrono em jobs longos.
"""
import modal
from fastapi import UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fastapi

app = modal.App("transcritor-juridico")


# ──────────────────────────────────────────────────────────────
# Imagem com todas as dependências pré-instaladas
# ──────────────────────────────────────────────────────────────
def download_model():
    import whisper
    whisper.load_model("small")


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git")
    .pip_install(
        "openai-whisper",
        "torch",
        "fastapi",
        "python-multipart",
        "pydub",
        "git+https://github.com/m-bain/whisperx.git",
    )
    .run_function(download_model)
)


# ──────────────────────────────────────────────────────────────
# FUNÇÃO PESADA — Roda no GPU, demora minutos.
# Chamada via .spawn() pelo dispatcher (assíncrono).
# ──────────────────────────────────────────────────────────────
@app.function(
    image=image,
    gpu="T4",
    timeout=3600,
    memory=8192,
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def transcribe_job(
    file_bytes: bytes,
    filename: str,
    job_type: str,
    start_date: str = "",
    end_date: str = "",
) -> dict:
    import whisper, tempfile, os, shutil, zipfile, re
    from datetime import datetime

    PATTERNS = [
        re.compile(r'^\[(\d{1,2}/\d{1,2}/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?)\]\s([^:]+?):\s(.*)$'),
        re.compile(r'^(\d{1,2}/\d{1,2}/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?)\s[-–]\s([^:]+?):\s(.*)$'),
    ]
    AUDIO_REF = re.compile(
        r'<anexado:\s*(\S+\.(?:opus|m4a|mp3|aac|ogg|wav))|'
        r'((?:PTT|AUD)-\d{8}-WA\d+\.(?:opus|m4a|mp3|aac|ogg|wav))|'
        r'(\d{8}-(?:AUDIO|PTT)-[\d-]+\.(?:opus|m4a|mp3|aac|ogg|wav))',
        re.IGNORECASE,
    )
    MEDIA_OMIT = re.compile(
        r'<.*(arquivo|mídia|media|omitido|omitted|anexado).*>|audio omitted|áudio omitido|\(file attached\)',
        re.IGNORECASE,
    )

    def detect_audio(text):
        m = AUDIO_REF.search(text)
        if m:
            fname = m.group(1) or m.group(2) or m.group(3)
            if fname:
                fname = fname.lstrip()
            return True, fname
        if MEDIA_OMIT.search(text):
            return True, None
        return False, None

    def parse_chat(txt_path):
        content = ""
        for enc in ("utf-8", "utf-8-sig", "latin-1"):
            try:
                with open(txt_path, "r", encoding=enc) as f:
                    content = f.read()
                break
            except:
                pass
        msgs, cur = [], None
        for line in content.splitlines():
            line = line.strip().replace('‎', '').replace('‏', '')
            parsed = None
            for pat in PATTERNS:
                m = pat.match(line)
                if m:
                    parsed = m.groups()
                    break
            if parsed:
                if cur:
                    msgs.append(cur)
                d, t, sender, text = parsed
                is_aud, fname = detect_audio(text)
                cur = dict(
                    date=d, time=t, sender=sender.strip(), text=text.strip(),
                    is_audio=is_aud, audio_file=fname, transcription=None,
                )
            elif cur:
                cur["text"] += "\n" + line
        if cur:
            msgs.append(cur)
        return msgs

    def parse_date_str(date_str):
        try:
            if len(date_str.split('/')[2]) == 2:
                return datetime.strptime(date_str, "%d/%m/%y").date()
            return datetime.strptime(date_str, "%d/%m/%Y").date()
        except:
            return None

    tmp_dir = tempfile.mkdtemp()
    size_mb = len(file_bytes) / 1024 / 1024
    print(f"🚀 Job iniciado: type={job_type}, file={filename}, size={size_mb:.1f} MB")

    try:
        # ──────────── WHATSAPP ────────────
        if job_type == "wpp":
            if not filename.lower().endswith('.zip'):
                return {"success": False, "error": "Para WhatsApp, envie o ZIP exportado."}

            zip_path = os.path.join(tmp_dir, "backup.zip")
            with open(zip_path, "wb") as f:
                f.write(file_bytes)
            del file_bytes  # libera RAM

            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(tmp_dir)

            chat_txt = None
            for root, dirs, files in os.walk(tmp_dir):
                for f in files:
                    if f.endswith("_chat.txt") or f.endswith(".txt"):
                        chat_txt = os.path.join(root, f)
                        break
                if chat_txt:
                    break

            if not chat_txt:
                return {"success": False, "error": "Arquivo .txt da conversa não encontrado no ZIP."}

            msgs = parse_chat(chat_txt)

            if start_date:
                try:
                    s_dt = datetime.strptime(start_date[:10], "%Y-%m-%d").date()
                    msgs = [m for m in msgs if parse_date_str(m['date']) and parse_date_str(m['date']) >= s_dt]
                except Exception as e:
                    print(f"Erro filtro start_date: {e}")
            if end_date:
                try:
                    e_dt = datetime.strptime(end_date[:10], "%Y-%m-%d").date()
                    msgs = [m for m in msgs if parse_date_str(m['date']) and parse_date_str(m['date']) <= e_dt]
                except Exception as e:
                    print(f"Erro filtro end_date: {e}")

            amap = {}
            for root, dirs, files in os.walk(tmp_dir):
                for f in files:
                    if f.lower().endswith((".opus", ".m4a", ".mp3", ".ogg", ".wav", ".aac")):
                        amap[f.lower()] = os.path.join(root, f)

            print("⚙️ Carregando modelo Whisper...")
            model = whisper.load_model("small")

            audio_count = sum(1 for m in msgs if m["is_audio"])
            print(f"📊 {len(msgs)} mensagens | {audio_count} áudios para transcrever")
            transcribed = failed = 0
            for m in msgs:
                if m["is_audio"]:
                    k = m.get("audio_file")
                    if k and k.lower() in amap:
                        try:
                            result = model.transcribe(amap[k.lower()], language="pt", fp16=True)
                            m["transcription"] = result["text"].strip()
                            transcribed += 1
                            if transcribed % 10 == 0:
                                print(f"✓ {transcribed}/{audio_count} áudios transcritos")
                        except Exception as audio_err:
                            failed += 1
                            m["transcription"] = f"[Erro ao transcrever: {str(audio_err)[:100]}]"
                            print(f"❌ Falha em {k}: {audio_err}")
                    else:
                        m["transcription"] = "[Áudio não anexado ou não encontrado no ZIP]"
            print(f"✅ WhatsApp finalizado: {transcribed} sucesso, {failed} falhas")

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

            return {
                "success": True,
                "text": "\n".join(lines),
                "audio_count": audio_count,
                "transcribed": transcribed,
                "failed": failed,
            }

        # ──────────── AUDIÊNCIA (com diarização) ────────────
        elif job_type == "audiencia":
            media_path = os.path.join(tmp_dir, "media_file")
            with open(media_path, "wb") as f:
                f.write(file_bytes)
            del file_bytes

            import whisperx
            device = "cuda"
            compute_type = "float16"

            print("📝 Transcrevendo com WhisperX...")
            model_wx = whisperx.load_model("small", device, compute_type=compute_type, language="pt")
            audio = whisperx.load_audio(media_path)
            result = model_wx.transcribe(audio, batch_size=16)

            print("🔗 Alinhando timestamps por palavra...")
            try:
                model_a, metadata = whisperx.load_align_model(language_code="pt", device=device)
                result = whisperx.align(result["segments"], model_a, metadata, audio, device)
            except Exception as e:
                print(f"Erro no alinhamento (seguindo sem): {e}")

            print("👥 Identificando oradores (diarização)...")
            hf_token = os.environ.get("HF_TOKEN")
            if not hf_token:
                return {"success": False, "error": "HF_TOKEN ausente no ambiente Modal."}

            from whisperx.diarize import DiarizationPipeline, assign_word_speakers
            diarize_model = DiarizationPipeline(use_auth_token=hf_token, device=device)
            diarize_segments = diarize_model(audio)
            result = assign_word_speakers(diarize_segments, result)

            def fmt_ts(s):
                h = int(s // 3600); m = int((s % 3600) // 60); ss = int(s % 60)
                return f"{h:02d}:{m:02d}:{ss:02d}"

            lines = ["TRANSCRIÇÃO DE AUDIÊNCIA (COM ORADORES)", "=" * 70, ""]
            current_speaker = None
            current_texts = []
            current_start = 0

            for seg in result.get("segments", []):
                speaker = seg.get("speaker", "ORADOR DESCONHECIDO")
                text = seg.get("text", "").strip()
                if not text:
                    continue
                if speaker != current_speaker:
                    if current_speaker is not None:
                        lines.append(f"[{fmt_ts(current_start)}] {current_speaker}: {' '.join(current_texts)}")
                    current_speaker = speaker
                    current_start = seg.get("start", 0)
                    current_texts = [text]
                else:
                    current_texts.append(text)
            if current_speaker is not None:
                lines.append(f"[{fmt_ts(current_start)}] {current_speaker}: {' '.join(current_texts)}")

            print(f"✅ Audiência finalizada: {len(result.get('segments', []))} segmentos")
            return {
                "success": True,
                "text": "\n\n".join(lines),
                "segments_count": len(result.get("segments", [])),
            }

        # ──────────── AUDIO/VIDEO simples ────────────
        else:
            media_path = os.path.join(tmp_dir, "media_file")
            with open(media_path, "wb") as f:
                f.write(file_bytes)
            del file_bytes

            print("⚙️ Carregando modelo Whisper...")
            model = whisper.load_model("small")
            print("🎙️ Transcrevendo...")
            result = model.transcribe(media_path, language="pt", fp16=True)

            lines = ["TRANSCRIÇÃO DE ÁUDIO/VÍDEO", "=" * 70, ""]
            current_texts = []
            for seg in result.get("segments", []):
                text = seg["text"].strip()
                if not text:
                    continue
                current_texts.append(text)
                if text.endswith(('.', '?', '!')):
                    lines.append(" ".join(current_texts))
                    current_texts = []
            if current_texts:
                lines.append(" ".join(current_texts))

            print(f"✅ Simples finalizado: {len(result.get('segments', []))} segmentos")
            return {
                "success": True,
                "text": "\n\n".join(lines),
                "segments_count": len(result.get("segments", [])),
            }

    except Exception as e:
        import traceback
        err_full = traceback.format_exc()
        print(f"❌ ERRO FATAL:\n{err_full}")
        return {"success": False, "error": f"{type(e).__name__}: {str(e)[:200]}"}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ──────────────────────────────────────────────────────────────
# DISPATCHER LEVE — Recebe upload, spawna o job, devolve job_id.
# Não consome GPU. Responde em <2 segundos.
# ──────────────────────────────────────────────────────────────
@app.function(
    image=image,
    timeout=900,    # 15 min para uploads grandes
    memory=4096,    # buffer pra arquivos até ~3 GB
)
@modal.asgi_app()
def fastapi_app():
    web_app = fastapi.FastAPI()
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @web_app.get("/")
    async def health():
        return {
            "status": "ok",
            "service": "transcritor-juridico",
            "version": "async-v2",
            "endpoints": {
                "start_job": "POST /",
                "status":    "GET /status/{job_id}",
            },
        }

    @web_app.post("/")
    async def start_job(
        file: UploadFile = File(...),
        job_type: str = Form("audio"),
        start_date: str = Form(""),
        end_date: str = Form(""),
    ):
        """Recebe o upload e enfileira o job. Retorna job_id imediatamente."""
        try:
            contents = await file.read()
            filename = file.filename or "upload"
            size_mb = len(contents) / 1024 / 1024
            print(f"📥 Recebido: {filename} ({size_mb:.1f} MB), job_type={job_type}")

            call = transcribe_job.spawn(contents, filename, job_type, start_date, end_date)
            print(f"🎯 Job spawned: {call.object_id}")

            return {
                "job_id":    call.object_id,
                "size_mb":   round(size_mb, 1),
                "filename":  filename,
                "job_type":  job_type,
            }
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print(f"❌ Erro no dispatcher:\n{tb}")
            raise HTTPException(status_code=500, detail=f"Erro ao iniciar: {str(e)[:200]}")

    @web_app.get("/status/{job_id}")
    async def check_status(job_id: str):
        """Checa o status do job. Retorna 'running' ou o resultado final."""
        try:
            call = modal.FunctionCall.from_id(job_id)
            try:
                result = call.get(timeout=0)  # non-blocking
                return {"status": "done", "result": result}
            except TimeoutError:
                return {"status": "running"}
            except modal.exception.OutputExpiredError:
                return {"status": "expired", "error": "Resultado expirou (>24h)"}
        except Exception as e:
            print(f"❌ Erro no status check: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    return web_app
