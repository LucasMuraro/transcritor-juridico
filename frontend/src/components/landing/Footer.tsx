import Link from "next/link";
import { Scale } from "lucide-react";

const products = [
  { href: "/whatsapp",  label: "Áudios do WhatsApp" },
  { href: "/audiencia", label: "Audiência Judicial" },
  { href: "/audio",     label: "Gravação Avulsa" },
];

const company = [
  { href: "/sobre",   label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

const legal = [
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos",      label: "Termos de Uso" },
  { href: "/privacidade", label: "LGPD" },
];

export function Footer() {
  return (
    <footer className="bg-white border-t border-paper-300">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-white">
                <Scale className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </span>
              <span className="text-[1.02rem] font-bold tracking-tight text-ink-900">
                Degravar<span className="text-brand">.adv.br</span>
              </span>
            </Link>
            <p className="text-[0.88rem] text-ink-500 leading-relaxed max-w-xs">
              Degravação jurídica feita para a velocidade do escritório.
            </p>
          </div>

          <FooterCol title="Ferramentas" items={products} />
          <FooterCol title="Empresa"     items={company}  />
          <FooterCol title="Legal"       items={legal}    />
        </div>

        <div className="mt-12 pt-6 border-t border-paper-300/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[0.82rem] text-ink-500">
          <span>© 2026 Muraro TechHub · Degravar.adv.br</span>
          <span>Feito por e para advogados.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  return (
    <div>
      <h5 className="text-[0.74rem] font-bold tracking-[0.14em] text-ink-900 uppercase mb-3.5">
        {title}
      </h5>
      <ul className="space-y-2.5 text-[0.9rem]">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="text-ink-500 hover:text-ink-900 transition-colors"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
