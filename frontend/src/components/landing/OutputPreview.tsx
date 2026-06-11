import { FileText, Volume2, Sparkles } from "lucide-react";

const BARS = [25, 60, 40, 85, 50, 70, 30, 90, 55, 75, 35, 65, 80, 45, 55, 70, 38, 92, 48, 62, 28, 75, 50, 88, 42, 68, 32, 78, 58, 72, 36, 84, 46, 66, 28, 82, 52, 74, 38, 90, 50, 64, 34, 88, 56, 70, 42, 80];

interface Line {
  speaker: string;
  ts: string;
  text: string;
}

const LINES: Line[] = [
  { speaker: "JUIZ",       ts: "00:01:12", text: "O depoente confirma os fatos descritos na petição inicial?" },
  { speaker: "TESTEMUNHA", ts: "00:01:15", text: "Sim, excelência. Estive presente no dia da ocorrência." },
  { speaker: "ADVOGADO",   ts: "00:01:23", text: "Excelência, gostaria de complementar que a testemunha trabalha há cinco anos no local." },
];

export function OutputPreview() {
  return (
    <section className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="text-center mb-14 lg:mb-16 max-w-2xl mx-auto">
          <span className="inline-block text-[0.74rem] font-bold tracking-[0.18em] text-emerald-600 uppercase mb-3">
            O que você recebe
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold tracking-tight text-navy-900 mb-4 text-balance">
            Áudio que vira petição.
          </h2>
          <p className="text-base lg:text-lg text-slate-600 leading-relaxed">
            Cada orador identificado. Cada fala com timestamp. Pronto pra você copiar direto pra peça processual.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center max-w-6xl mx-auto">
          {/* Audio file card */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-navy-900 p-7 text-white shadow-2xl shadow-navy-900/30 ring-1 ring-white/5">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-700">
                  <Volume2 className="h-5 w-5 text-emerald-400" strokeWidth={2.2} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.9rem] font-semibold truncate">
                    audiencia_processo_5481.mp4
                  </div>
                  <div className="text-[0.78rem] text-slate-400">
                    1h 24min · 287 MB
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-[3px] h-16 mb-3" aria-hidden>
                {BARS.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500/30 to-emerald-400"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[0.74rem] text-slate-400 font-mono">
                <span>00:00:00</span>
                <span>01:24:13</span>
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 text-[0.85rem] text-emerald-400">
                <Sparkles className="h-4 w-4" strokeWidth={2.2} />
                <span className="font-medium">Processado em 4 minutos · R$ 14,99</span>
              </div>
            </div>
          </div>

          {/* Petition mockup */}
          <div className="lg:col-span-7">
            <div className="relative rounded-xl bg-white shadow-2xl shadow-slate-900/[0.08] p-7 lg:p-10 ring-1 ring-slate-100">
              {/* Decorative paper corner */}
              <div
                aria-hidden
                className="absolute top-0 right-0 h-12 w-12 bg-gradient-to-bl from-slate-100 to-transparent rounded-bl-xl rounded-tr-xl pointer-events-none"
              />

              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-5">
                <FileText className="h-4 w-4 text-slate-400" strokeWidth={2.2} />
                <div className="text-[0.7rem] font-mono text-slate-500 tracking-wide uppercase">
                  Termo de Audiência · Processo Nº 5481-23.2026.8.26.0100
                </div>
              </div>

              <div className="space-y-4 text-[0.93rem] leading-relaxed">
                {LINES.map((line) => (
                  <div key={line.speaker}>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-navy-900 tracking-tight">{line.speaker}</span>
                      <span className="text-[0.72rem] font-mono text-slate-400">({line.ts})</span>
                    </div>
                    <p className="text-slate-700 mt-0.5">&ldquo;{line.text}&rdquo;</p>
                  </div>
                ))}
                <div className="pt-1 text-[0.78rem] text-slate-400 italic">
                  [ continua... ]
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[0.78rem] text-slate-500">
                  <FileText className="h-3.5 w-3.5" strokeWidth={2.2} />
                  <span className="font-mono">termo_audiencia.docx</span>
                </div>
                <span className="text-[0.78rem] font-semibold text-emerald-600">
                  Pronto pra protocolar
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
