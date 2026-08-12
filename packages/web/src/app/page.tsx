import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Navbar from "@/components/landing/Navbar";
import PrivacyStatement from "@/components/landing/PrivacyStatement";
import Products from "@/components/landing/Products";
import FinalCTA from "@/components/landing/Waitlist";

export default function Home() {
  return (
    <main className="brand-surface min-h-[100dvh] overflow-x-hidden bg-[var(--signal-canvas)] text-[var(--signal-ink)]">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Products />
      <PrivacyStatement />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
