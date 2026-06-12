import { ChevronDown } from "lucide-react";
import type { ToolFaqItem } from "@/lib/tools";

export function FaqSection({ items }: { items: ToolFaqItem[] }) {
  return (
    <section className="py-14 lg:py-20 bg-paper-200">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <div className="mb-10 lg:mb-12">
          <span className="inline-block text-[0.74rem] font-bold tracking-[0.18em] text-brand uppercase mb-3">
            Dúvidas frequentes
          </span>
          <h2 className="text-2xl lg:text-[2rem] font-extrabold tracking-tight text-ink-900">
            O que advogados perguntam.
          </h2>
        </div>

        <div className="rounded-2xl bg-white border border-paper-300 overflow-hidden">
          {items.map((item) => (
            <details
              key={item.q}
              className="group border-b border-paper-300/70 last:border-b-0 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 lg:px-7 py-5 hover:bg-paper-50 transition-colors">
                <span className="text-[0.96rem] font-semibold text-ink-900 tracking-tight">
                  {item.q}
                </span>
                <ChevronDown
                  className="h-5 w-5 text-ink-400 shrink-0 transition-transform group-open:rotate-180"
                  strokeWidth={2.2}
                />
              </summary>
              <div className="px-6 lg:px-7 pb-5 -mt-1">
                <p className="text-[0.92rem] text-ink-500 leading-relaxed">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
