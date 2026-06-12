import { Clock, FileCheck2, Zap } from "lucide-react";
import type { ToolConfig } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function ToolHero({ tool }: { tool: ToolConfig }) {
  const { Icon } = tool;

  return (
    <section className="pt-10 lg:pt-14 pb-2">
      <div className="flex flex-col items-start gap-6">
        <div className="flex items-center gap-2 rounded-full bg-white border border-paper-300 px-3 py-1.5 text-[0.76rem] font-semibold text-ink-700 shadow-sm shadow-ink-900/[0.04]">
          <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", tool.accentDotClass)} />
          {tool.pillLabel}
        </div>

        <div className="flex items-start gap-5 w-full">
          <div className={cn("flex h-16 w-16 lg:h-20 lg:w-20 shrink-0 items-center justify-center rounded-2xl", tool.iconBgClass)}>
            <Icon className={cn("h-8 w-8 lg:h-10 lg:w-10", tool.iconColorClass)} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 pt-1">
            <h1 className="text-[1.8rem] sm:text-4xl lg:text-[2.6rem] font-extrabold tracking-tight text-ink-900 leading-[1.05] text-balance">
              {tool.title}
            </h1>
            <p className="mt-3 text-[0.98rem] lg:text-[1.05rem] text-ink-500 leading-relaxed max-w-[58ch] text-balance">
              {tool.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.82rem] text-ink-500 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <FileCheck2 className="h-4 w-4 text-ink-400" strokeWidth={2} />
            {tool.formats.join(" · ")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-ink-400" strokeWidth={2} />
            até {tool.maxSize}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-ink-400" strokeWidth={2} />
            a partir de <span className="font-semibold text-ink-900">{tool.startPrice}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
