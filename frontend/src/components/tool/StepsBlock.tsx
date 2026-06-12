import type { ToolStep } from "@/lib/tools";

export function StepsBlock({ steps }: { steps: ToolStep[] }) {
  return (
    <section className="py-14 lg:py-20 bg-white">
      <div className="mx-auto max-w-5xl px-5 lg:px-8">
        <div className="mb-10 lg:mb-12">
          <span className="inline-block text-[0.74rem] font-bold tracking-[0.18em] text-brand uppercase mb-3">
            Como Funciona
          </span>
          <h2 className="text-2xl lg:text-[2rem] font-extrabold tracking-tight text-ink-900">
            Três passos. Sem segredo.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 text-white text-[0.88rem] font-extrabold tracking-tight">
                  0{i + 1}
                </span>
              </div>
              <h3 className="text-[1.1rem] font-bold text-ink-900 mb-2 tracking-tight">
                {step.title}
              </h3>
              <p className="text-[0.92rem] text-ink-500 leading-relaxed">{step.description}</p>

              {i < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-[18px] left-[calc(100%-1.5rem)] w-12 h-px bg-gradient-to-r from-paper-300 to-transparent"
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
