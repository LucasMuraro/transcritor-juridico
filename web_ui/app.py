import os
os.environ["PATH"] = "/opt/homebrew/bin:/usr/local/bin:" + os.environ.get("PATH", "")

# Carrega .env manualmente
_env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(_env_file):
    for _line in open(_env_file):
        _line = _line.strip()
        if _line and not _line.startswith('#') and '=' in _line:
            _k, _v = _line.split('=', 1)
            os.environ.setdefault(_k.strip(), _v.strip())
from flask import Flask, render_template

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'web_ui', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ROTAS DAS PÁGINAS
@app.route('/')
def home():
    return render_template('home.html')

@app.route('/sobre')
def sobre():
    return render_template('sobre.html')

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

@app.route('/whatsapp-v2')
def whatsapp_v2():
    return render_template('tool_wpp_v2.html')

@app.route('/video')
def tool_video():
    return render_template('tool.html', tool_type='video', title='Vídeos da Audiência', icon='fa-video', color='#ef4444')

@app.route('/whatsapp')
def tool_wpp():
    return render_template('tool.html', tool_type='wpp', title='Transcrição WhatsApp', icon='fa-brands fa-whatsapp', color='#25D366')

@app.route('/extractor')
def tool_extractor():
    return render_template('tool.html', tool_type='extractor', title='Extrator de Provas', icon='fa-folder-open', color='#334155')

@app.route('/audio')
def tool_audio():
    return render_template('tool.html', tool_type='audio', title='Áudio WhatsApp', icon='fa-microphone-lines', color='#8b5cf6')

@app.route('/audiencia')
def tool_audiencia():
    return render_template('tool.html', tool_type='audiencia', title='Audiência Judicial (Oradores)', icon='fa-users', color='#0ea5e9')


if __name__ == '__main__':
    app.run(port=5001, host='127.0.0.1', debug=True)
