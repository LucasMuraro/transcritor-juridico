"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { UploadCloud, FileAudio, X, PlayCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtSize(bytes: number) {
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

interface DropzoneProps {
  formats: string[];
  maxSize: string;
  iconBgClass: string;
  iconColorClass: string;
  borderHoverClass: string;
}

export function Dropzone({
  formats,
  maxSize,
  iconBgClass,
  iconColorClass,
  borderHoverClass,
}: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onChoose() {
    inputRef.current?.click();
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }

  if (file) {
    return (
      <div className="rounded-2xl bg-white border border-paper-300 shadow-sm shadow-ink-900/[0.04] p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", iconBgClass)}>
            <FileAudio className={cn("h-7 w-7", iconColorClass)} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="font-semibold text-ink-900 truncate text-[1rem]">{file.name}</div>
            <div className="text-[0.85rem] text-ink-500 mt-0.5">
              {fmtSize(file.size)} · {file.type || formats[0]}
            </div>
          </div>
          <button
            onClick={() => setFile(null)}
            aria-label="Remover arquivo"
            className="text-ink-400 hover:text-ink-900 transition-colors p-1 -m-1 rounded-lg hover:bg-paper-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          className="mt-7 w-full bg-ink-900 text-white py-3.5 rounded-xl font-semibold hover:bg-ink-700 transition-colors inline-flex items-center justify-center gap-2 text-[0.95rem]"
          onClick={() => alert("Pré-visualização — backend conectado em breve.")}
        >
          <PlayCircle className="h-5 w-5" strokeWidth={2.2} />
          Iniciar transcrição
        </button>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[0.78rem] text-ink-500">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" strokeWidth={2.2} />
          <span>Arquivo apagado após o download · 100% LGPD</span>
        </div>
      </div>
    );
  }

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
          dragOver ? "bg-brand text-white scale-110" : "bg-paper-100 text-ink-500 group-hover:bg-paper-200"
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
