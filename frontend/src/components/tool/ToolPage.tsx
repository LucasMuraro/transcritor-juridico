import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Breadcrumb } from "./Breadcrumb";
import { ToolHero } from "./ToolHero";
import { Dropzone } from "./Dropzone";
import { PricingSidebar } from "./PricingSidebar";
import { StepsBlock } from "./StepsBlock";
import { FaqSection } from "./FaqSection";
import type { ToolConfig } from "@/lib/tools";

export function ToolPage({ tool }: { tool: ToolConfig }) {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main>
        {/* Warm wash background under hero + tool area */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-paper-200/60 via-paper-100/30 to-white"
          />

          <div className="mx-auto max-w-7xl px-5 lg:px-8 pt-6 pb-16 lg:pb-24">
            <Breadcrumb
              items={[
                { href: "/", label: "Início" },
                { label: tool.title },
              ]}
            />

            <ToolHero tool={tool} />

            <div className="mt-10 lg:mt-12 grid gap-8 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-8">
                <Dropzone
                  formats={tool.formats}
                  maxSize={tool.maxSize}
                  iconBgClass={tool.iconBgClass}
                  iconColorClass={tool.iconColorClass}
                  borderHoverClass={tool.borderHoverClass}
                />
              </div>
              <div className="lg:col-span-4">
                <PricingSidebar tool={tool} />
              </div>
            </div>
          </div>
        </div>

        <StepsBlock steps={tool.steps} />
        <FaqSection items={tool.faq} />
      </main>

      <Footer />
    </div>
  );
}
