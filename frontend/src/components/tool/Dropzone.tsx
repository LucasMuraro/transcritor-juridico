"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import {
  UploadCloud,
  FileAudio,
  X,
  PlayCircle,
  ShieldCheck,
  FileText,
  RotateCcw,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TerminalLog, type LogLine, type LogType } from "./TerminalLog";

function fmtSize(bytes: number) {
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

function nowTs() {
  return new Date().toLocaleTimeString("pt-BR");
}

interface DropzoneProps {
  formats: string[];
  maxSize: string;
  iconBgClass: string;
  iconColorClass: string;
  borderHoverClass: string;
}

type Phase = "idle" | "selected" | "running" | "done";

export function Dropzone({
  formats,
  maxSize,
  iconBgClass,
  iconColorClass,
  borderHoverClass,
}: DropzoneProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }

  function onChoose() {
    inputRef.current?.click();
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setPhase("selected");
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setPhase("selected");
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }

  function reset() {
    clearTimers();
    setFile(null);
    setLogs([]);
    setPhase("idle");
  }

  function startTranscription() {
    if (!file) return;
    setPhase("running");
    setLogs([]);

    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    const sequence: { delay: number; text: string; type: LogType }[] = [
      { delay: 100,   text: `Enviando arquivo (${sizeMB} MB) para a nuvem GPU...`, type: "system" },
      { delay: 500,   text: "Conexão segura — processamento isolado, sem armazenamento permanente.", type: "system" },
      { delay: 1800,  text: "Upload concluído em 1s · Job enfileirado: a3f7b8c1…", type: "success" },
      { delay: 2400,  text: "Carregando modelo na GPU...", type: "info" },
      { delay: 4500,  text: "Detectando voz e remoção de silêncio...", type: "info" },
      { delay: 7200,  text: "Transcrevendo áudio em português brasileiro...", type: "info" },
      { delay: 10500, text: "Alinhando timestamps por palavra...", type: "info" },
      { delay: 13000, text: "Identificando oradores e atribuindo nomes...", type: "info" },
      { delay: 15000, text: "Montando documento final...", type: "info" },
      { delay: 16500, text: "Transcrição concluída em 16s", type: "success" },
      { delay: 17000, text: "Pré-visualização ativa — backend de produção conectado em breve.", type: "system" },
    ];

    sequence.forEach((step, i) => {
      const t = setTimeout(() => {
        setLogs((prev) => [...prev, { ts: nowTs(), text: step.text, type: step.type }]);
        if (i === sequence.length - 1) {
          const finishT = setTimeout(() => setPhase("done"), 400);
          timeoutsRef.current.push(finishT);
        }
      }, step.delay);
      timeoutsRef.current.push(t);
    });
  }

  // ──────────────────────────── DROPZONE (idle)
  if (phase === "idle") {
    return (
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onChoose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onChoose()}
        className={cn(
          "group rounded-2xl border-2 border-dashed bg-white p-10 lg:p-14 text-center cursor-pointer",
          "transition-all duration-200",
          dragOver
            ? "border-brand bg-paper-50 scale-[1.01] shadow-lg shadow-ink-900/[0.06]"
            : `border-paper-300 ${borderHoverClass} hover:bg-paper-50/40`
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={formats.map((f) => "." + f.toLowerCase()).join(",")}
          onChange={onInputChange}
          className="hidden"
        />

        <div
          className={cn(
            "mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-5 transition-all",
            dragOver
              ? "bg-brand text-white scale-110"
              : "bg-paper-100 text-ink-500 group-hover:bg-paper-200"
          )}
        >
          <UploadCloud className="h-8 w-8" strokeWidth={1.8} />
        </div>

        <div className="text-[1.1rem] font-bold text-ink-900 mb-1.5 tracking-tight">
          {dragOver ? "Solte o arquivo aqui" : "Arraste seu arquivo aqui"}
        </div>
        <div className="text-[0.92rem] text-ink-500 mb-7">
          ou clique para selecionar do computador
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChoose();
          }}
          className="inline-flex items-center gap-2 bg-ink-900 text-white px-6 py-3 rounded-xl font-semibold text-[0.92rem] hover:bg-ink-700 transition-colors"
        >
          <UploadCloud className="h-4 w-4" strokeWidth={2.2} />
          Selecionar arquivo
        </button>

        <div className="mt-7 text-[0.78rem] text-ink-400">
          {formats.join(" · ")} · até {maxSize}
        </div>
      </div>
    );
  }

  // ──────────────────────────── FILE CARD (after selection / during run / done)
  const showStartButton = phase === "selected";
  const isRunning = phase === "running";
  const isDone = phase === "done";

  return (
    <div className="space-y-5">
      {/* Compact file card */}
      <div className="rounded-2xl bg-white border border-paper-300 shadow-sm shadow-ink-900/[0.04] p-5 lg:p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              iconBgClass
            )}
          >
            <FileAudio className={cn("h-6 w-6", iconColorClass)} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="font-semibold text-ink-900 truncate text-[0.98rem]">
              {file!.name}
            </div>
            <div className="text-[0.82rem] text-ink-500 mt-0.5">
              {fmtSize(file!.size)} · {file!.type || formats[0]}
              {isDone && <span className="text-brand font-semibold"> · processado</span>}
            </div>
          </div>
          {!isRunning && (
            <button
              onClick={reset}
              aria-label="Remover arquivo"
              className="text-ink-400 hover:text-ink-900 transition-colors p-1 -m-1 rounded-lg hover:bg-paper-100"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {showStartButton && (
          <>
            <button
              onClick={startTranscription}
              className="mt-6 w-full bg-ink-900 text-white py-3.5 rounded-xl font-semibold hover:bg-ink-700 transition-colors inline-flex items-center justify-center gap-2 text-[0.95rem]"
            >
              <PlayCircle className="h-5 w-5" strokeWidth={2.2} />
              Iniciar transcrição
            </button>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[0.78rem] text-ink-500">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" strokeWidth={2.2} />
              <span>Arquivo apagado após o download · 100% LGPD</span>
            </div>
          </>
        )}
      </div>

      {/* Terminal log (running or done) */}
      {(isRunning || isDone) && (
        <TerminalLog
          lines={logs}
          isRunning={isRunning}
          estimatedLabel="~ 16 segundos"
        />
      )}

      {/* Action buttons when done */}
      {isDone && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => alert("Pré-visualização — sem download real ainda. Quando o backend estiver conectado, este botão baixa o TXT.")}
            className="flex-1 bg-brand text-white py-3.5 rounded-xl font-semibold hover:bg-brand-hover transition-colors inline-flex items-center justify-center gap-2 text-[0.95rem]"
          >
            <ArrowDown className="h-5 w-5" strokeWidth={2.4} />
            Baixar transcrição (TXT)
          </button>
          <button
            onClick={reset}
            className="sm:w-auto px-5 py-3.5 rounded-xl font-semibold border border-paper-300 text-ink-700 hover:border-ink-900 hover:text-ink-900 transition-colors inline-flex items-center justify-center gap-2 text-[0.92rem]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.2} />
            Nova transcrição
          </button>
        </div>
      )}

      {/* Cancel button during run */}
      {isRunning && (
        <button
          onClick={reset}
          className="w-full text-[0.85rem] text-ink-500 hover:text-ink-900 transition-colors py-2 inline-flex items-center justify-center gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          Cancelar (pré-visualização)
        </button>
      )}

      {/* Subtle bottom info when done */}
      {isDone && (
        <div className="flex items-center justify-center gap-1.5 text-[0.78rem] text-ink-500">
          <FileText className="h-3.5 w-3.5 text-ink-400" strokeWidth={2.2} />
          <span>Resultado entregue em formato TXT com timestamps</span>
        </div>
      )}
    </div>
  );
}
