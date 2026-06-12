import { Zap, CreditCard, Check } from "lucide-react";
import type { ToolConfig } from "@/lib/tools";

export function PricingSidebar({ tool }: { tool: ToolConfig }) {
  return (
    <aside className="lg:sticky lg:top-24 space-y-5">
      <div className="rounded-2xl bg-white border border-paper-300 shadow-sm shadow-ink-900/[0.04] p-6 lg:p-7">
        <div className="text-[0.74rem] font-bold tracking-[0.14em] text-ink-500 uppercase mb-3">
          Preço por uso
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[2.4rem] font-extrabold text-ink-900 leading-none tracking-tight">
            R$ —,—
          </span>
        </div>
        <div className="text-[0.85rem] text-ink-500 mb-6">
          Calculado quando você subir o arquivo
        </div>

        <div className="space-y-3 mb-6">
          <div className="text-[0.78rem] font-bold tracking-wider uppercase text-ink-400">
            {tool.pricingHeading}
          </div>
          {tool.tiers.map((t) => (
            <div key={t.label} className="flex items-center justify-between text-[0.88rem] py-0.5">
              <span className="text-ink-500">{t.label}</span>
              <span className="font-semibold text-ink-900 tabular-nums">{t.price}</span>
            </div>
          ))}
          {tool.overage && (
            <div className="text-[0.78rem] text-ink-400 pt-1 border-t border-paper-300/60">
              {tool.overage}
            </div>
          )}
        </div>

        <div className="pt-5 border-t border-paper-300/60 space-y-2.5">
          <button className="w-full bg-brand text-white py-3 rounded-xl font-semibold hover:bg-brand-hover transition-colors inline-flex items-center justify-center gap-2 text-[0.92rem]">
            <Zap className="h-4 w-4" strokeWidth={2.4} />
            Gerar QR Code PIX
          </button>
          <button className="w-full bg-paper-100 text-ink-900 py-3 rounded-xl font-semibold hover:bg-paper-200 transition-colors inline-flex items-center justify-center gap-2 text-[0.92rem]">
            <CreditCard className="h-4 w-4" strokeWidth={2.2} />
            Pagar com Cartão
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-ink-900 text-white p-6 lg:p-7">
        <div className="text-[0.74rem] font-bold tracking-[0.14em] text-brand uppercase mb-2">
          Conta de cortesia
        </div>
        <div className="text-[0.95rem] font-semibold mb-1">
          Você tem 1 transcrição grátis
        </div>
        <div className="text-[0.85rem] text-ink-400">
          Sem cadastro · Sem cartão · Use agora
        </div>
      </div>

      <div className="space-y-2.5 px-1">
        {[
          "Sem mensalidade — pague por uso",
          "Arquivo apagado após o download",
          "100% adequado à LGPD",
        ].map((b) => (
          <div key={b} className="flex items-start gap-2.5 text-[0.85rem] text-ink-500">
            <Check className="h-4 w-4 mt-0.5 shrink-0 text-brand" strokeWidth={2.4} />
            <span>{b}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
