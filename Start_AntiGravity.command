#!/bin/bash
# Script de Inicialização - AntiGravity Local App

# Pega o diretório atual onde o script está localizado
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================="
echo "✨ Iniciando AntiGravity WhatsApp Transcriber..."
echo "=========================================="

# Instala dependências se necessário (ignora se já tiver)
echo "Verificando dependências do servidor (Flask)..."
pip3 install --upgrade pip --quiet
pip3 install flask werkzeug openai-whisper imageio-ffmpeg --quiet

echo "Tudo certo! Iniciando a Interface Web..."

# Garante que o ffmpeg embutido funcione globalmente para os scripts deste terminal
FF_PATH=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
mkdir -p "$DIR/bin"
ln -sf "$FF_PATH" "$DIR/bin/ffmpeg"
export PATH="$DIR/bin:$PATH"

# Inicia o servidor Flask em background (usando nohup ou &, mas queremos ver os logs no terminal que abrir)
cd web_ui
export FLASK_APP=app.py
export FLASK_ENV=development

# Abre o navegador
sleep 2 && open http://127.0.0.1:5000 &

# Puxa o servidor pra rodar visível nesse terminal
python3 app.py
