import type { Metadata } from "next";
import { ToolPage } from "@/components/tool/ToolPage";
import { TOOLS } from "@/lib/tools";

const tool = TOOLS.audio;

export const metadata: Metadata = {
  title: tool.metaTitle,
  description: tool.metaDescription,
  alternates: { canonical: "https://www.degravar.adv.br/audio" },
  openGraph: {
    title: tool.metaTitle,
    description: tool.metaDescription,
    type: "website",
    locale: "pt_BR",
  },
};

export default function Page() {
  return <ToolPage tool={tool} />;
}
