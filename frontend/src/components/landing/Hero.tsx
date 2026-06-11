import { MessageCircle, Gavel, Mic } from "lucide-react";
import { DropzoneCard } from "./DropzoneCard";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 sm:pt-16 lg:pt-24 pb-14 lg:pb-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-gradient-to-b from-navy-50/50 via-white to-white"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 -z-10 h-[420px] w-[860px] rounded-full bg-emerald-300/10 blur-[120px]"
      />

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 text-[0.78rem] font-semibold text-emerald-700 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Pague apenas pelo que usar — via PIX
          </span>

          <h1 className="text-[2.2rem] sm:text-5xl lg:text-[3.6rem] font-extrabold tracking-tight text-navy-900 leading-[1.05] mb-5 text-balance">
            Degrave Audiências e<br className="hidden sm:block" /> Áudios em Minutos.
          </h1>

          <p className="text-base lg:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto text-balance">
            Sem mensalidade. Arraste o arquivo, pague apenas pelo que usar via PIX e receba o documento pronto para protocolar.
          </p>
        </div>

        <div
          id="ferramentas"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 max-w-5xl mx-auto"
        >
          <DropzoneCard
            href="/whatsapp"
            Icon={MessageCircle}
            title="Áudios do WhatsApp"
            subtitle="Para atas notariais. Processa todos os áudios do backup de uma só vez."
            formats="ZIP · OGG · MP3"
            iconBgClass="bg-emerald-50 group-hover:bg-emerald-100"
            iconColorClass="text-emerald-600"
            borderHoverClass="hover:border-emerald-300"
            glowClass="from-emerald-50/60 to-transparent"
          />
          <DropzoneCard
            href="/audiencia"
            Icon={Gavel}
            title="Audiência Judicial"
            subtitle="Separa automaticamente as falas de juiz, advogado e testemunha com timestamps."
            formats="MP4 · WEBM · MOV"
            iconBgClass="bg-blue-50 group-hover:bg-blue-100"
            iconColorClass="text-blue-600"
            borderHoverClass="hover:border-blue-300"
            glowClass="from-blue-50/60 to-transparent"
          />
          <DropzoneCard
            href="/audio"
            Icon={Mic}
            title="Gravação Avulsa"
            subtitle="Sustentações orais, reuniões com clientes e notas de audiência."
            formats="MP3 · M4A · WAV"
            iconBgClass="bg-orange-50 group-hover:bg-orange-100"
            iconColorClass="text-orange-600"
            borderHoverClass="hover:border-orange-300"
            glowClass="from-orange-50/60 to-transparent"
          />
        </div>

        <p className="mt-8 text-center text-[0.82rem] text-slate-400">
          Arquivos de até <span className="font-semibold text-slate-600">1 GB</span> · Resposta em poucos minutos · A partir de <span className="font-semibold text-slate-600">R$ 1,99</span>
        </p>
      </div>
    </section>
  );
}
