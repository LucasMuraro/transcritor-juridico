# Product Requirements Document (PRD) - AntiGravity WhatsApp Transcriber

## 1. Visão do Produto
O **AntiGravity WhatsApp Transcriber** é uma ferramenta desenhada para resgatar, organizar e transcrever massas de áudio provenientes de exportações do WhatsApp de forma automatizada. Ele lê o histórico de caixas de diálogos originais, identifica quais áudios foram disparados em que momento, converte as mídias usando modelos de IA avançados (ex: Whisper) e insere as falas na íntegra no lugar correto de uma "TimeLine" de fatos estruturada.

## 2. Público-Alvo
- **Advogados / Peritos / Cartórios:** Profissionais jurídicos que recebem "Dump" de WhatsApp de seus clientes, envolvendo milhares de áudios soltos, e precisam catalogar as evidências textualmente para compor Atas Notariais ou Provas de Processo.
- **Empresários / Vendas:** Gestores buscando registrar ou auditar acordos verbais feitos pelos seus vendedores em WhatsApp coorporativo, extraindo insights sem necessitar ouvir horas de gravações.
- **Micro-SaaS para Usuários Comuns (Futuro):** Pessoas físicas que discutiram algo e não têm tempo ou softwares pesados em suas máquinas e desejam uma transcrição rápida pagando uma barreira de entrada muito baixa (Ex.: Pay-Per-Use).

## 3. Funcionalidades Principais (Core Features)
- **Upload Automatizado:** Processa nativamente o arquivo bruto `.zip` retornado pelo comando "Exportar Conversa" do Android e iOS, sem exigir intervenção prévia.
- **Match de Arquivos Obscuros:** Mapeia referências falhas do WhatsApp como `(arquivo omitido)` para os `.opus` ocultos na raiz por meio de ordenação nativa garantindo 0 perdas.
- **Filtro Temporal de Intervenção (Início/Fim):** Economizador gigantesco que recorta dias específicos (Ex: "Apenas da tarde do golpe, 02/04/2026") ignorando o processamento pesado do resto dos arquivos da década.
- **Seleção de Modelagem IA:** Usuário escolhe flexivelmente no Front-End velocidade vs precisão (Tiny, Base, Small, Medium, Large).
- **Gerador de Relatórios (Outputs):**
  - O famigerado `master_transcript.txt`: O espelho fiel de como o chat se desenrolou, misturando o texto digitado nativo com as expansões dos áudios processados no meio deles.
  - CSV Estruturado: Uma planilha `timeline.csv` viabilizando filtros por palavra, colunas ricas de relatórios de auditoria.

## 4. Diferenciais de Mercado
- **Formato Legível por Humanos:** Sistemas normais de IA te dão apenas transcrições. Essa aplicação "regruda" a IA dentro do formato estético da exportação de Chat do usuário, com cronologia e contexto contíguos de fala e digitação.
- **Design Clean & Rápido:** Temática SaaS focada no Light Mode com vidro, indicando alta confiança para processamento de informações confidenciais (White Label Ready).

## 5. Casos de Uso (Use Cases)
*   **Ata Notarial:** O cliente envia 4 anos de "casamento" exportados. O advogado filtra apenas a "Data Inicial" relatada no B.O e imprime o PDF contíguo contendo o que a máquina transcreveu instantaneamente, validando o contexto criminal ou civil.
*   **O "Pague 2 Reais e Resuma":** Usuário sem infraestrutura entra na landing page, sobe um `.zip` do ex-sócio, escaneia um Pix do Mercado Pago e recebe em 30 segundos um arquivo valioso que custaria dias para ser lido à mão.
