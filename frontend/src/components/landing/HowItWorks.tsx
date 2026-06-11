import { Upload, QrCode, FileDown, type LucideIcon } from "lucide-react";

interface Step {
  Icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    Icon: Upload,
    title: "Arraste",
    description:
      "Jogue seu MP4 ou MP3 direto na tela. Nada de cadastro, login ou complicação técnica.",
  },
  {
    Icon: QrCode,
    title: "PIX",
    description:
      "O sistema calcula o valor pelo tamanho do arquivo. Pagamento em segundos, sem mensalidade.",
  },
  {
    Icon: FileDown,
    title: "Download",
    description:
      "Receba a ata em DOCX formatada — cada orador identificado, com timestamp em cada fala.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 lg:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="text-center mb-14 lg:mb-16">
          <span className="inline-block text-[0.74rem] font-bold tracking-[0.18em] text-emerald-600 uppercase mb-3">
            Como Funciona
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold tracking-tight text-navy-900 text-balance">
            Três passos. Sem segredo.
          </h2>
        </div>

        <div className="grid gap-10 md:grid-cols-3 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-white text-[0.95rem] font-extrabold tracking-tight">
                  0{i + 1}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <step.Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
              </div>
              <h3 className="text-[1.25rem] font-bold text-navy-900 mb-2 tracking-tight">
                {step.title}
              </h3>
              <p className="text-[0.95rem] text-slate-600 leading-relaxed">
                {step.description}
              </p>

              {i < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-[22px] left-[calc(100%-1.5rem)] w-[3rem] h-px bg-gradient-to-r from-slate-200 to-transparent"
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
