import { MessageCircle, Gavel, Mic, type LucideIcon } from "lucide-react";

export interface PriceTier {
  label: string;
  price: string;
}

export interface ToolStep {
  title: string;
  description: string;
}

export interface ToolFaqItem {
  q: string;
  a: string;
}

export interface ToolConfig {
  slug: "whatsapp" | "audiencia" | "audio";

  // Hero
  pillLabel: string;
  title: string;
  description: string;

  // Identity
  Icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  borderHoverClass: string;
  accentDotClass: string;

  // Tech facts
  formats: string[];
  maxSize: string;
  startPrice: string;

  // Pricing
  pricingHeading: string;
  tiers: PriceTier[];
  overage?: string;

  // Steps
  steps: ToolStep[];

  // FAQ
  faq: ToolFaqItem[];

  // SEO
  metaTitle: string;
  metaDescription: string;
}

export const TOOLS: Record<"whatsapp" | "audiencia" | "audio", ToolConfig> = {
  whatsapp: {
    slug: "whatsapp",
    pillLabel: "Para atas notariais",
    title: "Transcritor de Áudios do WhatsApp",
    description:
      "Sobe o backup ZIP completo do WhatsApp e recebe a transcrição de todos os áudios de uma só vez, com data, hora e remetente.",
    Icon: MessageCircle,
    iconBgClass: "bg-emerald-50",
    iconColorClass: "text-emerald-600",
    borderHoverClass: "hover:border-emerald-300",
    accentDotClass: "bg-emerald-500",
    formats: ["ZIP", "RAR", "OGG", "MP3", "OPUS"],
    maxSize: "1 GB",
    startPrice: "R$ 2,99",
    pricingHeading: "Preço por tamanho do backup",
    tiers: [
      { label: "até 30 MB",  price: "R$ 2,99" },
      { label: "até 100 MB", price: "R$ 4,99" },
      { label: "até 300 MB", price: "R$ 9,99" },
      { label: "até 700 MB", price: "R$ 17,99" },
      { label: "até 1,5 GB", price: "R$ 24,99" },
    ],
    steps: [
      {
        title: "Exporte o backup",
        description:
          "Abra a conversa no WhatsApp · três pontos · Mais · Exportar conversa · Incluir mídia.",
      },
      {
        title: "Suba o ZIP",
        description:
          "Arraste o arquivo ZIP gerado direto na tela. Não precisa extrair nada manualmente.",
      },
      {
        title: "Baixe a ata",
        description:
          "Cada áudio aparece transcrito separadamente, com data, hora e nome do remetente.",
      },
    ],
    faq: [
      {
        q: "Como exporto o backup do WhatsApp?",
        a: "Abra a conversa, toque nos três pontos (Android) ou no nome do contato (iOS), vá em Mais > Exportar conversa e escolha Incluir mídia. O ZIP gerado contém todos os áudios em formato .opus.",
      },
      {
        q: "Funciona com áudios .opus?",
        a: "Sim. .opus é o formato nativo do WhatsApp e o sistema processa diretamente — sem conversões manuais.",
      },
      {
        q: "Quanto tempo demora um backup de 100 MB?",
        a: "Em média 2 a 4 minutos. Backups maiores escalam proporcionalmente.",
      },
      {
        q: "E se eu só tiver alguns áudios individuais?",
        a: "Use a ferramenta Gravação Avulsa — mais barata para áudios isolados.",
      },
    ],
    metaTitle: "Transcrever Backup do WhatsApp Online | Degravar.adv.br",
    metaDescription:
      "Transcreva todos os áudios do backup ZIP do WhatsApp de uma vez. Com data, hora e remetente. Ideal para advogados e atas notariais. A partir de R$ 2,99.",
  },

  audiencia: {
    slug: "audiencia",
    pillLabel: "Identifica juiz, advogado e testemunha",
    title: "Transcrição de Audiência Judicial",
    description:
      "Suba o vídeo da audiência e receba a ata em DOCX com cada fala separada por orador e timestamp — pronta pra protocolar.",
    Icon: Gavel,
    iconBgClass: "bg-blue-50",
    iconColorClass: "text-blue-600",
    borderHoverClass: "hover:border-blue-300",
    accentDotClass: "bg-blue-500",
    formats: ["MP4", "WEBM", "MOV", "MKV", "RAR"],
    maxSize: "1 GB",
    startPrice: "R$ 4,99",
    pricingHeading: "Preço por duração da audiência",
    tiers: [
      { label: "até 15 min", price: "R$ 4,99" },
      { label: "até 30 min", price: "R$ 7,99" },
      { label: "até 1 hora", price: "R$ 14,99" },
      { label: "até 1h 30", price: "R$ 19,99" },
      { label: "até 2 horas", price: "R$ 24,99" },
    ],
    overage: "Após 2 horas: +R$ 0,25/min",
    steps: [
      {
        title: "Suba o vídeo",
        description:
          "MP4, WEBM, MOV ou MKV. Funciona com gravações de Zoom, Teams ou do sistema do TJ.",
      },
      {
        title: "A IA separa os oradores",
        description:
          "Cada fala é atribuída automaticamente — JUIZ, ADVOGADO, TESTEMUNHA — com nome quando apresentado.",
      },
      {
        title: "Receba a ata DOCX",
        description:
          "Documento formatado, com timestamps em cada fala. Copie pra petição ou termo de audiência.",
      },
    ],
    faq: [
      {
        q: "A IA identifica o nome do orador?",
        a: "Quando alguém se apresenta na audiência (\"meu nome é Dr. João\"), o sistema captura o nome. Caso contrário, marca como ORADOR_01, ORADOR_02 — você pode renomear depois no DOCX.",
      },
      {
        q: "Que formatos de vídeo aceita?",
        a: "MP4, WEBM, MOV, MKV e RAR. Suporta gravações de Zoom, Teams, Google Meet e dos sistemas internos do TJ.",
      },
      {
        q: "Quanto tempo leva uma audiência de 1 hora?",
        a: "Em média 4 a 8 minutos de processamento. Audiências mais longas escalam linearmente.",
      },
      {
        q: "E se o áudio tiver muito ruído?",
        a: "Processa normalmente, mas a precisão cai com áudio muito ruidoso. Recomenda-se editar o áudio antes (Audacity ou similar) para realçar a voz.",
      },
    ],
    metaTitle: "Transcrição de Audiência Judicial Online | Degravar.adv.br",
    metaDescription:
      "Degrave audiências judiciais com identificação automática de oradores: juiz, advogados e testemunhas. Saída em DOCX formatada. A partir de R$ 4,99.",
  },

  audio: {
    slug: "audio",
    pillLabel: "Para depoimentos, reuniões e sustentações",
    title: "Gravação Avulsa de Áudio",
    description:
      "Áudios soltos de cliente, sustentação oral, oitiva ou reunião — transcritos em minutos, com timestamps prontos pra colar na peça.",
    Icon: Mic,
    iconBgClass: "bg-paper-100",
    iconColorClass: "text-brand",
    borderHoverClass: "hover:border-brand/40",
    accentDotClass: "bg-brand",
    formats: ["MP3", "M4A", "WAV", "OPUS", "OGG", "FLAC"],
    maxSize: "1 GB",
    startPrice: "R$ 1,99",
    pricingHeading: "Preço por duração do áudio",
    tiers: [
      { label: "até 5 min",   price: "R$ 1,99"  },
      { label: "até 15 min",  price: "R$ 2,99"  },
      { label: "até 30 min",  price: "R$ 4,99"  },
      { label: "até 1 hora",  price: "R$ 7,99"  },
      { label: "até 1h 30",   price: "R$ 11,99" },
      { label: "até 2 horas", price: "R$ 15,99" },
    ],
    overage: "Após 2 horas: +R$ 0,15/min",
    steps: [
      {
        title: "Suba o áudio",
        description:
          "MP3, M4A, WAV, OPUS, AAC ou FLAC — até 1 GB. Funciona com gravação de celular ou gravador profissional.",
      },
      {
        title: "Pague pela duração",
        description:
          "A partir de R$ 1,99 para áudios de até 5 minutos. Sem mensalidade, sem cadastro.",
      },
      {
        title: "Texto na hora",
        description:
          "Transcrição limpa com timestamps em cada parágrafo. Áudios de 5 min ficam em ~30 segundos.",
      },
    ],
    faq: [
      {
        q: "Que formatos de áudio são aceitos?",
        a: "MP3, M4A, WAV, OPUS, OGG, AAC e FLAC. Praticamente qualquer áudio gravado em celular ou gravador profissional.",
      },
      {
        q: "Funciona com áudios soltos do WhatsApp?",
        a: "Sim. Mas se você tem o backup ZIP completo do WhatsApp, use a ferramenta WhatsApp Backup — ela processa todos os áudios de uma vez e sai mais barata por unidade.",
      },
      {
        q: "Posso transcrever depoimentos pessoais e oitivas?",
        a: "Sim — depoimentos de cliente, oitivas, sustentação oral, reuniões. Tudo o que for áudio único de uma fonte.",
      },
      {
        q: "Quanto tempo demora?",
        a: "Áudios curtos (5-15 min) ficam prontos em cerca de 30 segundos. Áudios longos (1h+) em 2-4 minutos.",
      },
    ],
    metaTitle: "Transcrever Áudio MP3 para Texto Online | Degravar.adv.br",
    metaDescription:
      "Transcreva áudios MP3, M4A, WAV ou OPUS para texto. Ideal para depoimentos, sustentações orais, oitivas e reuniões. A partir de R$ 1,99.",
  },
};
