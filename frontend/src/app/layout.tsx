import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Degravar.adv.br — Degravação de Audiências e Áudios em Minutos",
  description:
    "Transforme audiências judiciais e áudios do WhatsApp em texto sem mensalidade. Pague apenas pelo que usar via PIX. 100% adequado à LGPD.",
  metadataBase: new URL("https://www.degravar.adv.br"),
  openGraph: {
    title: "Degravar.adv.br — Degravação de Audiências em Minutos",
    description:
      "Sem mensalidade. Arraste, pague via PIX e receba a ata pronta pra protocolar.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-br" className={jakarta.variable}>
      <body className="font-sans bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
