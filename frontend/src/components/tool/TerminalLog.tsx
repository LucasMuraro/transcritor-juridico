"use client";

import { useEffect, useRef } from "react";
import { Loader2, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type LogType = "system" | "info" | "success" | "error";

export interface LogLine {
  ts: string;
  text: string;
  type: LogType;
}

interface TerminalLogProps {
  lines: LogLine[];
  isRunning: boolean;
  estimatedLabel?: string;
}

export function TerminalLog({ lines, isRunning, estimatedLabel }: TerminalLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="rounded-2xl bg-ink-900 text-white overflow-hidden shadow-2xl shadow-ink-900/25 ring-1 ring-white/5">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          {isRunning ? (
            <Loader2 className="h-4 w-4 text-brand animate-spin" strokeWidth={2.4} />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-brand" strokeWidth={2.4} />
          )}
          <span className="text-[0.88rem] font-semibold tracking-tight">
            {isRunning ? "Processando transcrição" : "Concluído"}
          </span>
        </div>
        {isRunning && (
          <div className="flex items-center gap-1.5 text-[0.72rem] font-mono uppercase tracking-wider text-ink-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-brand animate-ping opacity-75" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            ao vivo
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="px-5 py-4 max-h-[340px] min-h-[180px] overflow-y-auto font-mono text-[0.8rem] leading-[1.85]"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#2A2A2A transparent" }}
      >
        {lines.length === 0 ? (
          <div className="text-ink-400 italic">Aguardando...</div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="flex gap-3 -mx-1 px-1 py-px">
              <span className="text-ink-400 shrink-0 select-none">[{line.ts}]</span>
              <span
                className={cn(
                  "min-w-0 break-words",
                  line.type === "system"  && "text-ink-400",
                  line.type === "info"    && "text-white/90",
                  line.type === "success" && "text-brand font-semibold",
                  line.type === "error"   && "text-red-400 font-semibold"
                )}
              >
                {line.text}
              </span>
            </div>
          ))
        )}
      </div>

      {isRunning && (
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-[0.78rem]">
          <span className="text-ink-400">
            {estimatedLabel ? (
              <>
                Tempo estimado: <span className="text-white font-semibold">{estimatedLabel}</span>
              </>
            ) : (
              "Não feche a aba"
            )}
          </span>
          <span className="inline-flex items-center gap-1.5 text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" strokeWidth={2.2} />
            <span>Processamento sigiloso</span>
          </span>
        </div>
      )}

      {!isRunning && lines.length > 0 && (
        <div className="px-5 py-3 border-t border-white/10 flex items-center gap-1.5 text-[0.78rem] text-brand">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span className="font-semibold">Tudo pronto · use o botão abaixo para baixar</span>
        </div>
      )}
    </div>
  );
}
