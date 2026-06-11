import { Lock, ShieldCheck, Trash2 } from "lucide-react";

export function TrustBar() {
  return (
    <section
      id="seguranca"
      className="bg-navy-900 text-white border-y border-navy-800/40"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-7 lg:py-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-5 md:gap-10 text-center md:text-left">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" strokeWidth={2.2} />
            <span className="text-[0.95rem] font-semibold tracking-tight">
              100% Adequado à LGPD
            </span>
          </div>

          <span className="hidden md:block h-5 w-px bg-white/15" aria-hidden />

          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-emerald-400 shrink-0" strokeWidth={2.2} />
            <span className="text-[0.9rem] text-slate-200">
              Processamento sigiloso e criptografado
            </span>
          </div>

          <span className="hidden md:block h-5 w-px bg-white/15" aria-hidden />

          <div className="flex items-center gap-3">
            <Trash2 className="h-5 w-5 text-emerald-400 shrink-0" strokeWidth={2.2} />
            <span className="text-[0.9rem] text-slate-200">
              Áudios apagados após o download
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
