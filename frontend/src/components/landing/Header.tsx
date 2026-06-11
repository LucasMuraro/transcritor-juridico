"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#seguranca", label: "Segurança LGPD" },
  { href: "/contato", label: "Contato" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-paper-300">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Degravar.adv.br · página inicial">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-white shadow-sm">
              <Scale className="h-[18px] w-[18px]" strokeWidth={2.4} />
            </span>
            <span className="text-[1.02rem] font-bold tracking-tight text-ink-900">
              Degravar<span className="text-brand">.adv.br</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[0.92rem] font-medium text-ink-500 hover:text-ink-900 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            className="md:hidden -mr-2 p-2 text-ink-700 hover:text-ink-900 transition-colors"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div
          className={cn(
            "md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
            open ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <nav className="flex flex-col py-2 border-t border-paper-300/60">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-3 text-[0.95rem] font-medium text-ink-700 hover:text-ink-900"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
