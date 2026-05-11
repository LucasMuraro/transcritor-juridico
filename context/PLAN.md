# Plano de Desenvolvimento — AntiGravity

## STATUS ATUAL (Abril 2026)

### ✅ O QUE JÁ ESTÁ FUNCIONANDO

**Módulo WhatsApp (`whatsapp_local.py`)**
- Recebe ZIP exportado do WhatsApp (iOS e Android)
- Extrai e transcreve áudios .opus com Whisper
- Organiza mensagens em ordem cronológica com timestamps
- Extrai imagens, documentos e PDFs anexados
- Filtro por data de início e fim
- Output: master_transcript.txt + arquivos separados

**Módulo Vídeo Simples (`video_local.py`)**
- Aceita MP4, WEBM, MOV, MKV, AVI, FLV, WMV, RAR, ZIP com vídeo dentro
- Transcreve com Whisper + timestamps por segmento
- Suporte a recorte de trecho (start/end time)
- Output: transcricao_final.txt

**Módulo Audiência Judicial (`video_diarization.py`)**
- Usa WhisperX + pyannote para identificar oradores
- Rotula SPEAKER_00, SPEAKER_01 etc. por voz
- Tenta detectar nomes quando pessoa se apresenta ("eu sou X", "meu nome é X")
- Alinhamento de timestamps opcional (ignora se falhar)
- Output: transcricao_final.txt com oradores identificados

**Interface Web (Flask)**
- Página inicial com cards de navegação
- Rotas: /whatsapp, /video, /audio, /extractor, /audiencia
- Upload com drag-and-drop
- Terminal em tempo real mostrando progresso
- Download do resultado em ZIP
- Nome de caso automático por data+hora+random quando não preenchido
- PATH do Homebrew corrigido globalmente
- sys.executable garante Python correto nos subprocessos

---

## 🔧 PROBLEMAS CONHECIDOS / EM RESOLUÇÃO

1. **Diarização — nomes detectados incorretamente**
   - Regex de detecção de nomes estava capturando frases longas
   - Fix aplicado: case-insensitive só nas palavras-gatilho, nome exige maiúscula real
   - Status: corrigido, aguardando teste

2. **Dependências Python 3.9 vs 3.14**
   - WhisperX só funciona no Python 3.9 do Xcode
   - Servidor SEMPRE deve ser iniciado com o caminho completo do Python 3.9
   - Comando: `/Library/Developer/CommandLineTools/.../python3.9 web_ui/app.py`

3. **PyTorch 2.6 + speechbrain + whisperx**
   - torch 2.6.0 + speechbrain 0.5.16 + whisperx 3.7.5 = combinação atual
   - Patch em `video_diarization.py` força `weights_only=False` no torch.load

---

## 🚀 PRÓXIMAS FEATURES (BACKLOG PRIORIZADO)

### PRIORIDADE ALTA

**1. Melhorar identificação de oradores por nome**
- Expandir padrões de apresentação ("doutor X", "advogado X", "réu X")
- Detectar nomes mencionados por terceiros ("chamo a doutora Márcia")
- Associar cargo/função ao orador quando citado

**2. Resolver problema de job único (process_running global)**
- Hoje só um processamento por vez globalmente
- Implementar fila por sessão/usuário com ID único
- Permitir múltiplos usuários simultâneos

**3. Limpeza automática de arquivos temporários**
- Deletar uploads após processamento
- Deletar pasta do caso após download do resultado
- Evitar acúmulo de arquivos no servidor

**4. Agente de testes automatizado**
- Script que testa cada módulo via API do Flask
- Verifica upload, processamento e download sem usar browser
- Roda antes de cada commit importante

### PRIORIDADE MÉDIA

**5. Separação de casos por tipo**
- Hoje WhatsApp e Vídeo podem usar mesmo nome de caso e misturar resultados
- Prefixo automático: `WPP_`, `VID_`, `AUD_` no nome do caso

**6. Página de resultado melhorada**
- Mostrar preview da transcrição na interface antes de baixar
- Estatísticas: duração, número de oradores, total de falas

**7. Suporte a mais idiomas**
- Hoje fixado em português (`language="pt"`)
- Dropdown para selecionar idioma na interface

### PRIORIDADE BAIXA / FUTURO

**8. Migração para nuvem (sem salvar dados)**
- Processar na memória, entregar resultado, deletar tudo
- Servidor com GPU para velocidade aceitável
- Sistema de fila (Redis + workers)

**9. Integração comercial**
- Autenticação de usuários (Supabase)
- Pagamento PIX antes de processar (Mercado Pago / Asaas)
- Histórico de casos por usuário

**10. Frontend moderno**
- Migrar de Flask templates para React/Vite
- Hospedar frontend na Vercel
- Backend como API pura

---

## REGRAS DE DESENVOLVIMENTO

- Nunca modificar `whatsapp_local.py` ou `video_local.py` sem necessidade — estão funcionando
- Novas features sempre em arquivos separados primeiro, integrar depois de testadas
- Commitar a cada módulo funcionando (não acumular mudanças)
- Sempre testar WhatsApp após qualquer mudança no `app.py`
- Dados de clientes nunca vão para o git (WhatsApp Chat*, .rar, casos/)
