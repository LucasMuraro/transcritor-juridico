# AntiGravity — Contexto do Projeto para Claude

## O que é este projeto
Ferramenta de transcrição jurídica local chamada **AntiGravity** (internamente "I Love Transcrever"). Processa backups de WhatsApp e vídeos de audiências judiciais, transcrevendo áudios para texto com timestamps. Roda 100% local — nenhum dado sai da máquina do usuário.

## Como rodar o servidor
```bash
/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/bin/python3.9 web_ui/app.py
```
**IMPORTANTE:** Sempre usar Python 3.9 (não `python3` que aponta para 3.14). O WhisperX e dependências estão instalados no Python 3.9 do Xcode Command Line Tools.

## Arquitetura
```
web_ui/app.py          — Servidor Flask (porta 5000). Ponto central de controle.
whatsapp_local.py      — Pipeline WhatsApp: extrai ZIP, transcreve .opus com Whisper
video_local.py         — Pipeline Vídeo simples: transcreve MP4/WEBM/RAR com Whisper
video_diarization.py   — Pipeline Vídeo avançado: usa WhisperX + pyannote para identificar oradores
web_ui/templates/      — home.html (página inicial), tool.html (template único para todas as ferramentas)
web_ui/static/         — style.css, script.js, logos
```

## Rotas disponíveis
- `/` → home (cards de navegação)
- `/whatsapp` → transcrição de backup ZIP do WhatsApp
- `/video` → transcrição de vídeo simples (Whisper)
- `/audio` → transcrição de áudio isolado (usa video_local.py)
- `/extractor` → extração de mídias de backup WhatsApp
- `/audiencia` → transcrição com identificação de oradores (WhisperX + pyannote)

## Dependências críticas do sistema
- **ffmpeg** → `/opt/homebrew/bin/ffmpeg` (instalado via brew)
- **unar** → `/opt/homebrew/bin/unar` (extração de .rar)
- **yt-dlp** → `/opt/homebrew/bin/yt-dlp` (download de vídeos)
- **Python 3.9** → `/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/bin/python3.9`

## Problemas conhecidos e soluções já aplicadas
1. **ffmpeg não encontrado pelo Flask** → `app.py` força `/opt/homebrew/bin` no PATH na inicialização
2. **sys.executable no subprocess** → `app.py` usa `sys.executable` em vez de `python3` para garantir o Python correto
3. **PyTorch 2.6+ quebra carregamento de modelos pyannote** → `video_diarization.py` faz patch no `torch.load` forçando `weights_only=False`
4. **WhisperX incompatível com Python 3.14** → sempre rodar com Python 3.9
5. **unar não encontrado pelo patoolib** → PATH corrigido globalmente no início do `app.py`

## Variáveis de ambiente (.env — não commitado)
```
HF_TOKEN=...        # Token HuggingFace para modelos pyannote (diarização)
GITHUB_TOKEN=...    # Token GitHub
```

## O que está funcionando
- Transcrição de áudios .opus do ZIP do WhatsApp ✅
- Extração de imagens e documentos do backup ✅
- Transcrição de vídeos MP4/WEBM/RAR com Whisper ✅
- Download do resultado em ZIP ✅
- Identificação de oradores via WhisperX (SPEAKER_00, SPEAKER_01) ✅
- Detecção de nomes por apresentação ("eu sou X", "meu nome é X") ✅
- Nome de caso automático por data+hora+random quando campo vazio ✅
- Limpeza de output anterior antes de nova execução ✅

## Próximas prioridades (ver context/PLAN.md para detalhes)
1. Melhorar detecção de nomes dos oradores
2. Jobs simultâneos por sessão (hoje só um por vez globalmente)
3. Limpeza automática de arquivos temporários
4. Agente de testes automatizado via API

## Roadmap futuro (ver context/PLAN.md)
- Migração para nuvem (sem salvar dados de clientes)
- Sistema de filas para múltiplos usuários simultâneos
- Integração com pagamento PIX
- Frontend React/Vite na Vercel

## Regras importantes
- **Nunca commitar** as pastas `WhatsApp Chat*/`, arquivos `.rar`, `.env` ou a pasta `casos/`
- **Não mexer** em `whatsapp_local.py` ou `video_local.py` sem necessidade — estão funcionando
- Toda alteração de infraestrutura (nuvem, filas) deve ser feita em arquivos novos sem quebrar o que funciona localmente
