import Link from "next/link";
import { ArrowRight, Upload, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropzoneCardProps {
  href: string;
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  formats: string;
  iconBgClass: string;
  iconColorClass: string;
  borderHoverClass: string;
  glowClass: string;
}

export function DropzoneCard({
  href,
  Icon,
  title,
  subtitle,
  formats,
  iconBgClass,
  iconColorClass,
  borderHoverClass,
  glowClass,
}: DropzoneCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative isolate overflow-hidden flex flex-col items-center text-center",
        "rounded-2xl border-2 border-dashed border-paper-300 bg-white p-7 lg:p-9",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-ink-900/[0.08]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2",
        borderHoverClass
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          glowClass
        )}
      />

      <div
        className={cn(
          "mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-[1.06]",
          iconBgClass
        )}
      >
        <Icon className={cn("h-9 w-9", iconColorClass)} strokeWidth={1.8} />
      </div>

      <h3 className="text-[1.18rem] font-bold text-ink-900 mb-2 tracking-tight">{title}</h3>
      <p className="text-[0.9rem] text-ink-500 leading-relaxed mb-5 max-w-[260px]">
        {subtitle}
      </p>

      <div className="flex items-center gap-1.5 text-[0.74rem] font-semibold uppercase tracking-wider text-ink-400 mb-5">
        <Upload className="h-3 w-3" strokeWidth={2.5} />
        <span>{formats}</span>
      </div>

      <div className="mt-auto inline-flex items-center gap-1.5 text-[0.9rem] font-semibold text-ink-900 transition-all group-hover:gap-2.5 group-hover:text-brand">
        Começar agora
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
      </div>
    </Link>
  );
}
