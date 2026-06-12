import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Crumb {
  href?: string;
  label: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="breadcrumb" className="text-[0.82rem]">
      <ol className="flex items-center gap-1.5 text-ink-500">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-ink-900 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? "text-ink-900 font-semibold" : ""}>{item.label}</span>
              )}
              {!last && <ChevronRight className="h-3 w-3 opacity-40" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
