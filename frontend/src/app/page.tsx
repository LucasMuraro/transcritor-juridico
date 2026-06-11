import { Header }        from "@/components/landing/Header";
import { Hero }          from "@/components/landing/Hero";
import { TrustBar }      from "@/components/landing/TrustBar";
import { HowItWorks }    from "@/components/landing/HowItWorks";
import { OutputPreview } from "@/components/landing/OutputPreview";
import { Footer }        from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <OutputPreview />
      </main>
      <Footer />
    </div>
  );
}
