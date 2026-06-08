import os, sys, subprocess, threading
os.environ["PATH"] = "/opt/homebrew/bin:/usr/local/bin:" + os.environ.get("PATH", "")

# Carrega .env manualmente
_env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(_env_file):
    for _line in open(_env_file):
        _line = _line.strip()
        if _line and not _line.startswith('#') and '=' in _line:
            _k, _v = _line.split('=', 1)
            os.environ.setdefault(_k.strip(), _v.strip())
try:
    import patoolib
except ImportError:
    patoolib = None
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import io
import zipfile

app = Flask(__name__)

@app.context_processor
def inject_mp_key():
    return {'mp_public_key': os.environ.get('MP_PUBLIC_KEY', '')}
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'web_ui', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

process_logs = []
process_running = False

def run_pipeline(script_name, file_path, case_name, model, extra_args=None):
    global process_logs, process_running
    process_running = True
    process_logs = []

    script_path = os.path.join(BASE_DIR, script_name)
    cmd = [sys.executable, script_path, file_path, case_name, model]
    if extra_args:
        cmd.extend(extra_args)

    env = os.environ.copy()
    env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:" + env.get("PATH", "")

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=BASE_DIR,
            text=True,
            bufsize=1,
            env=env
        )

        for line in iter(process.stdout.readline, ""):
            cleaned = line.strip()
            if cleaned:
                process_logs.append(cleaned)

        process.wait()
        if process.returncode == 0:
            process_logs.append("\n✅ CONCLUSÃO COM SUCESSO!")
            path_output = os.path.join(BASE_DIR, 'casos', case_name.lower().replace(' ', '_'), '05_consolidado')
            if os.path.exists(path_output):
                subprocess.run(['open', path_output])
        else:
            process_logs.append(f"\n❌ ERRO NO PROCESSO (Código {process.returncode})")
    except Exception as e:
        process_logs.append(f"\n❌ FALHA GRAVE: {str(e)}")
    process_running = False


# ── ROTAS DAS PÁGINAS ─────────────────────────────────────────────────────────

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/sobre')
def sobre():
    return render_template('sobre.html')

@app.route('/contato')
def contato():
    return render_template('contato.html')

@app.route('/admin')
def admin():
    key = request.args.get('key', '')
    admin_key = os.environ.get('ADMIN_KEY', 'auditoria2026')
    if key != admin_key:
        return 'Acesso negado.', 403
    return render_template('admin.html')

@app.route('/preview')
def preview():
    return render_template('home_preview.html')

@app.route('/preview2')
def preview2():
    return render_template('home_preview2.html')

@app.route('/logo-preview')
def logo_preview():
    return render_template('logo_preview.html')

@app.route('/preview3')
def preview3():
    return render_template('home_preview3.html')

@app.route('/preview4')
def preview4():
    return render_template('home_preview4.html')

@app.route('/preview5')
def preview5():
    return render_template('home_preview5.html')

@app.route('/whatsapp-v2')
def whatsapp_v2():
    return render_template('tool_wpp_v2.html')

@app.route('/video')
def tool_video():
    return render_template('tool.html', tool_type='video', title='Vídeos da Audiência', icon='fa-video', color='#ef4444')

@app.route('/whatsapp')
def tool_wpp():
    return render_template('tool.html', tool_type='wpp', title='Transcritor de Áudios do WhatsApp', icon='fa-brands fa-whatsapp', color='#25D366')

@app.route('/extractor')
def tool_extractor():
    return render_template('tool.html', tool_type='extractor', title='Extrator de Provas', icon='fa-folder-open', color='#334155')

@app.route('/audio')
def tool_audio():
    return render_template('tool.html', tool_type='audio', title='Áudio Individual', icon='fa-microphone-lines', color='#8b5cf6')

@app.route('/audiencia')
def tool_audiencia():
    return render_template('tool.html', tool_type='audiencia', title='Audiência Judicial (Oradores)', icon='fa-users', color='#0ea5e9')


# ── API DE UPLOAD ─────────────────────────────────────────────────────────────

@app.route('/upload', methods=['POST'])
def handle_upload():
    global process_running
    if process_running:
        return jsonify({'error': 'Já existe um processamento em andamento.'}), 400

    job_type  = request.form.get('job_type')
    case_name = request.form.get('case_name', '').strip()
    model     = request.form.get('model', 'small')
    file      = request.files.get('file')

    if not file:
        return jsonify({'error': 'Nenhum arquivo enviado.'}), 400

    # Gera nome automático se vazio
    if not case_name:
        import random, datetime
        now = datetime.datetime.now()
        case_name = f"Caso_{now.strftime('%d%m%Y_%H%M')}_{random.randint(100,999)}"

    filename  = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    # Extração de arquivos compactados para vídeo/áudio
    if job_type in ['video', 'audio'] and filename.lower().endswith(('.rar', '.zip', '.7z', '.tar')):
        try:
            if not patoolib:
                return jsonify({'error': 'Motor de extração (patool) não instalado.'}), 500

            extract_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'extracted_' + filename)
            os.makedirs(extract_dir, exist_ok=True)
            patoolib.extract_archive(file_path, outdir=extract_dir)

            media_extensions = ('.mp4', '.webm', '.mov', '.mkv', '.avi', '.flv', '.wmv', '.m4v',
                                '.mp3', '.wav', '.m4a', '.opus', '.aac', '.flac')
            found_media = None
            for root, dirs, files in os.walk(extract_dir):
                for f in files:
                    if f.lower().endswith(media_extensions):
                        found_media = os.path.join(root, f)
                        break
                if found_media:
                    break

            if found_media:
                file_path = found_media
                process_logs.append(f"📦 Pacote detectado! Extraindo e usando: {os.path.basename(found_media)}")
            else:
                return jsonify({'error': 'Nenhum vídeo ou áudio encontrado no arquivo compactado.'}), 400
        except Exception as e:
            return jsonify({'error': f'Erro ao abrir pacote: {str(e)}'}), 500

    extra_args = []
    script     = "whatsapp_local.py"

    if job_type == 'video':
        script = "video_local.py"
        start  = request.form.get('start_time')
        end    = request.form.get('end_time')
        if start: extra_args.extend(['--ss', start])
        if end:   extra_args.extend(['--to', end])
        if request.form.get('diarization') == 'true':
            extra_args.append('--diarize')
    elif job_type == 'audio':
        script = "video_local.py"
    elif job_type == 'audiencia':
        script = "video_diarization.py"
    elif job_type == 'wpp':
        script = "whatsapp_local.py"
        sd = request.form.get('start_date')
        ed = request.form.get('end_date')
        if sd: extra_args.extend(['--start-date', sd])
        if ed: extra_args.extend(['--end-date', ed])
        extra_args.extend(['--extract-images', '--extract-docs'])
    elif job_type == 'extractor':
        script = "whatsapp_local.py"
        sd = request.form.get('ex_start')
        ed = request.form.get('ex_end')
        if sd: extra_args.extend(['--start-date', sd])
        if ed: extra_args.extend(['--end-date', ed])
        if request.form.get('ex_jpg')  == 'true': extra_args.append('--extract-images')
        if request.form.get('ex_pdf')  == 'true': extra_args.append('--extract-docs')
        if request.form.get('ex_docx') == 'true': extra_args.append('--extract-docs')
        if request.form.get('ex_opus') == 'true': extra_args.append('--extract-audio')
        if request.form.get('ex_mp4')  == 'true': extra_args.append('--extract-video')
        extra_args.append('--only-media')

    thread = threading.Thread(target=run_pipeline, args=(script, file_path, case_name, model, extra_args))
    thread.start()
    return jsonify({'message': f'Iniciando processamento — caso: {case_name}'})


@app.route('/status')
def status():
    return jsonify({'running': process_running, 'logs': list(process_logs)})


# ── MERCADO PAGO — PIX ────────────────────────────────────────────────────────

import urllib.request
import urllib.error
import json as _json
import secrets as _secrets
import time as _time

# Pricing dinâmico — espelha exatamente o script.js (PRICING)
# Mudou aqui? Mude lá também.
PRICING = {
    'audio': {
        'type': 'duration', 'name': 'Áudio Solo',
        'tiers': [(5, 1.99), (15, 2.99), (30, 4.99), (60, 7.99), (90, 11.99), (120, 15.99)],
        'overage': 0.15,
    },
    'video': {
        'type': 'duration', 'name': 'Vídeo',
        'tiers': [(5, 2.99), (15, 4.99), (30, 7.99), (60, 12.99), (90, 17.99), (120, 22.99)],
        'overage': 0.20,
    },
    'audiencia': {
        'type': 'duration', 'name': 'Audiência Judicial',
        'tiers': [(15, 4.99), (30, 7.99), (60, 14.99), (90, 19.99), (120, 24.99)],
        'overage': 0.25,
    },
    'wpp': {
        'type': 'size', 'name': 'Backup do WhatsApp',
        'tiers': [(30, 2.99), (100, 4.99), (300, 9.99), (700, 17.99), (1500, 24.99)],
    },
    'extractor': {
        'type': 'size', 'name': 'Extrator de Mídias',
        'tiers': [(50, 1.99), (200, 3.99), (500, 6.99), (1500, 11.99)],
    },
}
PRICE_DEFAULT = {'audio': 1.99, 'video': 2.99, 'audiencia': 4.99, 'wpp': 2.99, 'extractor': 1.99}


def calculate_price(job_type, duration_seconds=None, file_size_bytes=None):
    cfg = PRICING.get(job_type)
    if not cfg:
        return PRICE_DEFAULT.get(job_type, 1.99)

    if cfg['type'] == 'duration' and duration_seconds:
        minutes = duration_seconds / 60
        for max_min, price in cfg['tiers']:
            if minutes <= max_min:
                return price
        last_max, last_price = cfg['tiers'][-1]
        import math as _m
        extra = _m.ceil(minutes - last_max)
        return round(last_price + extra * cfg['overage'], 2)

    if cfg['type'] == 'size' and file_size_bytes:
        mb = file_size_bytes / 1024 / 1024
        for max_mb, price in cfg['tiers']:
            if mb <= max_mb:
                return price
        return cfg['tiers'][-1][1]

    return PRICE_DEFAULT.get(job_type, 1.99)


# Compat: deixa o nome antigo apontando pra mesma estrutura (algumas funções podem usar)
PIX_PRICES = {k: {'price': PRICE_DEFAULT[k], 'name': v['name']} for k, v in PRICING.items()}

# Cache em memória dos tokens de uso único liberados após pagamento
_unlock_tokens = {}
_payment_index = {}  # payment_id → unlock_token

# Analytics em memória (reseta ao reiniciar — suficiente para monitoramento)
_payments_log = []   # lista de dicts: {ts, job_type, method, amount, payment_id, used}
_contacts_log = []   # lista de dicts: {ts, nome, email, assunto, mensagem}
_free_credits_used = 0


def _mp_request(method, path, body=None):
    """Chama Mercado Pago API."""
    token = os.environ.get('MP_ACCESS_TOKEN', '')
    if not token:
        raise RuntimeError('MP_ACCESS_TOKEN não configurado no .env')
    url = f'https://api.mercadopago.com{path}'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'X-Idempotency-Key': _secrets.token_hex(16),
    }
    data = _json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return _json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode(errors='replace')
        raise RuntimeError(f'MP {e.code}: {err_body[:300]}')


MP_MODE = os.environ.get('MP_MODE', 'test').lower()  # 'test' ou 'production'


def _mp_base_url():
    """URL pública para back_urls do Checkout Pro.
    Em produção (com domínio), define BASE_URL no .env (ex: https://auditoria.com.br).
    Em dev local, MP aceita 127.0.0.1 mas não dispara webhook."""
    return os.environ.get('BASE_URL', 'http://127.0.0.1:5001').rstrip('/')


@app.route('/create-pix', methods=['POST'])
def create_pix():
    """Cria cobrança PIX direta (Pagamentos Transparentes) com preço dinâmico
    baseado em duração (áudio/vídeo) ou tamanho do arquivo (ZIP)."""
    data = request.get_json(silent=True) or {}
    job_type = data.get('job_type', 'audio')
    fingerprint = data.get('fingerprint', 'anon')
    duration = data.get('duration_seconds')
    file_size = data.get('file_size')

    if job_type not in PRICING:
        return jsonify({'error': 'Tipo de transcrição inválido'}), 400

    # Calcula preço dinâmico (servidor decide — cliente não pode mentir)
    price = calculate_price(job_type, duration, file_size)
    cfg = PRICING[job_type]
    external_ref = f"auditoria_{fingerprint[:12]}_{int(_time.time())}"

    # Descrição vai pra fatura do MP
    desc_extra = ''
    if cfg['type'] == 'duration' and duration:
        mins = round(duration / 60, 1)
        desc_extra = f" ({mins} min)"
    elif cfg['type'] == 'size' and file_size:
        mb = round(file_size / 1024 / 1024, 1)
        desc_extra = f" ({mb} MB)"

    body = {
        'transaction_amount': price,
        'description': f"AuditorIA — {cfg['name']}{desc_extra}",
        'payment_method_id': 'pix',
        'external_reference': external_ref,
        'payer': {
            'email': f'cliente.{fingerprint[:12]}@auditoria-ia.com.br',
            'first_name': 'Cliente',
            'last_name': 'AuditorIA',
            'identification': {
                'type': 'CPF',
                'number': '19119119100',  # CPF fictício de teste (sandbox aceita)
            },
        },
    }

    try:
        mp = _mp_request('POST', '/v1/payments', body)
    except Exception as e:
        return jsonify({'error': f'Falha ao criar cobrança: {str(e)[:300]}'}), 500

    pix_data = mp.get('point_of_interaction', {}).get('transaction_data', {}) or {}
    return jsonify({
        'payment_id':         mp.get('id'),
        'status':             mp.get('status'),
        'external_reference': external_ref,
        'qr_code':            pix_data.get('qr_code'),
        'qr_code_b64':        pix_data.get('qr_code_base64'),
        'ticket_url':         pix_data.get('ticket_url'),
        'amount':             price,
        'description':        cfg['name'] + desc_extra,
        'mode':               MP_MODE,
        'expires_in':         1800,
    })


@app.route('/check-pix/<payment_id>')
def check_pix(payment_id):
    """Consulta status do pagamento PIX. Quando aprovado, gera unlock token."""
    try:
        mp = _mp_request('GET', f'/v1/payments/{payment_id}')
    except Exception as e:
        return jsonify({'error': f'Falha ao consultar: {str(e)[:200]}'}), 500

    status = mp.get('status')  # pending | approved | rejected | cancelled
    payment_id_str = str(mp.get('id', payment_id))

    if status == 'approved':
        if payment_id_str in _payment_index:
            unlock = _payment_index[payment_id_str]
        else:
            unlock = _secrets.token_urlsafe(24)
            amount = float(mp.get('transaction_amount', 0))
            job_type_mp = mp.get('external_reference', '').split('_')[0] or 'unknown'
            _unlock_tokens[unlock] = {
                'payment_id': payment_id_str,
                'expires_at': _time.time() + 1800,
                'used': False,
            }
            _payment_index[payment_id_str] = unlock
            _payments_log.append({
                'ts': _time.time(), 'job_type': job_type_mp,
                'method': 'pix', 'amount': amount,
                'payment_id': payment_id_str, 'used': False,
            })
        return jsonify({'status': 'approved', 'unlock_token': unlock})

    return jsonify({
        'status': status,
        'detail': mp.get('status_detail', ''),
    })


@app.route('/create-card', methods=['POST'])
def create_card():
    """Cria pagamento com cartão de crédito (token MP) com preço dinâmico."""
    data = request.get_json(silent=True) or {}
    job_type          = data.get('job_type', 'audio')
    token             = data.get('token')
    payment_method_id = data.get('payment_method_id')
    fingerprint       = data.get('fingerprint', 'anon')
    duration          = data.get('duration_seconds')
    file_size         = data.get('file_size')
    payer_email       = data.get('payer_email', '').strip()
    cpf               = data.get('cpf', '').replace('.', '').replace('-', '').replace(' ', '')
    installments      = int(data.get('installments', 1))

    if not token or not payment_method_id:
        return jsonify({'error': 'Token ou método de pagamento inválido'}), 400
    if job_type not in PRICING:
        return jsonify({'error': 'Tipo de transcrição inválido'}), 400

    price = calculate_price(job_type, duration, file_size)
    cfg   = PRICING[job_type]

    desc_extra = ''
    if cfg['type'] == 'duration' and duration:
        desc_extra = f" ({round(duration / 60, 1)} min)"
    elif cfg['type'] == 'size' and file_size:
        desc_extra = f" ({round(file_size / 1024 / 1024, 1)} MB)"

    body = {
        'transaction_amount': price,
        'token':              token,
        'description':        f"AuditorIA — {cfg['name']}{desc_extra}",
        'installments':       installments,
        'payment_method_id':  payment_method_id,
        'external_reference': f"auditoria_{fingerprint[:12]}_{int(_time.time())}",
        'payer': {
            'email': payer_email or f'cliente_{fingerprint[:8]}@iauditoria.adv.br',
        },
    }
    if cpf and len(cpf) == 11:
        body['payer']['identification'] = {'type': 'CPF', 'number': cpf}

    try:
        result = _mp_request('POST', '/v1/payments', body)
    except Exception as e:
        return jsonify({'error': f'Falha ao processar cartão: {str(e)[:300]}'}), 500

    status     = result.get('status')
    payment_id = str(result.get('id', ''))

    if status == 'approved':
        unlock = _secrets.token_urlsafe(24)
        _unlock_tokens[unlock] = {
            'payment_id': payment_id,
            'job_type':   job_type,
            'expires_at': _time.time() + 3600,
            'used':       False,
        }
        _payment_index[payment_id] = unlock
        _payments_log.append({
            'ts': _time.time(), 'job_type': job_type,
            'method': 'card', 'amount': price,
            'payment_id': payment_id, 'used': False,
        })
        return jsonify({'status': 'approved', 'payment_id': payment_id, 'unlock_token': unlock})

    return jsonify({
        'status':        status,
        'status_detail': result.get('status_detail', ''),
        'payment_id':    payment_id,
    })


@app.route('/payment-success')
def payment_success():
    """Página simples mostrada após pagamento bem-sucedido."""
    return '''<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pagamento confirmado</title>
    <style>body{font-family:system-ui,sans-serif;background:#0A0A0A;color:white;text-align:center;padding:80px 24px;}
    h1{color:#22C55E;font-size:2rem;margin-bottom:12px;}p{color:rgba(255,255,255,.7);}
    a{display:inline-block;margin-top:24px;padding:12px 24px;background:#FF5C00;color:white;text-decoration:none;border-radius:6px;font-weight:700;}</style></head>
    <body><h1>✓ Pagamento confirmado!</h1><p>Volte para a aba do AuditorIA — sua transcrição já está liberada.</p>
    <a href="javascript:window.close()">Fechar janela</a></body></html>'''


@app.route('/payment-pending')
def payment_pending():
    return '''<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pagamento pendente</title>
    <style>body{font-family:system-ui,sans-serif;background:#0A0A0A;color:white;text-align:center;padding:80px 24px;}
    h1{color:#FF5C00;font-size:2rem;margin-bottom:12px;}p{color:rgba(255,255,255,.7);}</style></head>
    <body><h1>⏳ Pagamento em processamento</h1><p>Assim que confirmar, sua transcrição é liberada automaticamente.</p>
    <p style="margin-top:24px;">Pode fechar esta janela.</p></body></html>'''


@app.route('/payment-failure')
def payment_failure():
    return '''<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pagamento falhou</title>
    <style>body{font-family:system-ui,sans-serif;background:#0A0A0A;color:white;text-align:center;padding:80px 24px;}
    h1{color:#EF4444;font-size:2rem;margin-bottom:12px;}p{color:rgba(255,255,255,.7);}
    a{display:inline-block;margin-top:24px;padding:12px 24px;background:#FF5C00;color:white;text-decoration:none;border-radius:6px;font-weight:700;}</style></head>
    <body><h1>✗ Pagamento não concluído</h1><p>Tente novamente ou use outra forma.</p>
    <a href="javascript:window.close()">Fechar janela</a></body></html>'''


@app.route('/api/contact', methods=['POST'])
def api_contact():
    data = request.get_json(silent=True) or {}
    nome     = (data.get('nome', '') or '').strip()
    email    = (data.get('email', '') or '').strip()
    assunto  = (data.get('assunto', '') or '').strip()
    mensagem = (data.get('mensagem', '') or '').strip()
    if not nome or not email or not mensagem:
        return jsonify({'error': 'Campos obrigatórios faltando'}), 400
    _contacts_log.append({'ts': _time.time(), 'nome': nome, 'email': email, 'assunto': assunto, 'mensagem': mensagem})
    return jsonify({'ok': True})


@app.route('/api/admin-stats')
def api_admin_stats():
    key = request.args.get('key', '')
    if key != os.environ.get('ADMIN_KEY', 'auditoria2026'):
        return jsonify({'error': 'Forbidden'}), 403
    revenue = sum(p['amount'] for p in _payments_log)
    modal_spent_usd = len([p for p in _payments_log if p.get('used')]) * 0.27
    return jsonify({
        'revenue_total':    round(revenue, 2),
        'payments':         _payments_log,
        'contacts':         _contacts_log,
        'free_credits_used': _free_credits_used,
        'modal_spent_usd':  round(modal_spent_usd, 2),
    })


@app.route('/consume-unlock', methods=['POST'])
def consume_unlock():
    """Marca um unlock_token como usado (chamado após Modal terminar)."""
    data = request.get_json(silent=True) or {}
    token = data.get('unlock_token')
    if not token or token not in _unlock_tokens:
        return jsonify({'valid': False}), 404
    entry = _unlock_tokens[token]
    if entry['used']:
        return jsonify({'valid': False, 'reason': 'já usado'}), 410
    if entry['expires_at'] < _time.time():
        return jsonify({'valid': False, 'reason': 'expirado'}), 410
    entry['used'] = True
    # marca no log de pagamentos
    pid = entry.get('payment_id')
    for p in _payments_log:
        if p.get('payment_id') == pid:
            p['used'] = True
            break
    return jsonify({'valid': True})


@app.route('/download/<case_name>')
def download_pack(case_name):
    safe_case = secure_filename(case_name).lower().replace(" ", "_")
    folder    = os.path.join(BASE_DIR, 'casos', safe_case, '05_consolidado')

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder):
            for file in files:
                file_path = os.path.join(root, file)
                zipf.write(file_path, os.path.relpath(file_path, folder))

    memory_file.seek(0)
    return send_file(memory_file, download_name=f'Transcricao_{case_name}.zip', as_attachment=True)


if __name__ == '__main__':
    app.run(port=5001, host='127.0.0.1', debug=True)
