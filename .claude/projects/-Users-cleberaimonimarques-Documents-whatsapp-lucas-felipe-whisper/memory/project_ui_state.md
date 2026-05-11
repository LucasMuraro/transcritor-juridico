---
name: Estado atual do redesign UI
description: O que foi implementado no redesign visual do AntiGravity (abril 2026)
type: project
---

Redesign visual completo em andamento. Estado atual:

**Paleta atual (site principal):** roxo/violeta `#7048E8` + amarelo `#FFCF64` — usuário NÃO gostou, quer trocar.

**Paleta em teste (preview):** verde profissional `#2D7A5A` + off-white. Opção A escolhida pelo usuário. Implementação incompleta — variáveis CSS foram trocadas mas ainda há cores hardcoded de roxo/amarelo no HTML do preview que precisam ser corrigidas.

**Arquivos criados/modificados:**
- `web_ui/templates/home.html` — home atual com paleta roxa
- `web_ui/templates/home_preview.html` — preview novo layout UX (rota /preview), paleta verde incompleta
- `web_ui/templates/tool.html` — template compartilhado de todas as ferramentas, com tutorial WhatsApp, footer e navbar atualizados
- `web_ui/templates/sobre.html` — página Sobre Nós criada (rota /sobre)
- `web_ui/app.py` — rotas /sobre e /preview adicionadas
- `web_ui/static/tutorial/step1-4.jpeg` — imagens do tutorial de exportação do WhatsApp

**Próximo passo prioritário:** Finalizar troca de paleta do preview para verde (corrigir cores hardcoded no home_preview.html) e depois aplicar ao site todo se aprovado.

**Why:** Usuário quer paleta mais moderna e profissional. Roxo+amarelo foi rejeitado. Verde tipo Notion/Wise está em teste.

**How to apply:** Ao retomar, perguntar se quer finalizar o verde no preview primeiro antes de aplicar ao site inteiro.
