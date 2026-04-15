import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Audience from "@/components/landing/Audience";
import Stats from "@/components/landing/Stats";
import Features from "@/components/landing/Features";
import Offerings from "@/components/landing/Offerings";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/Waitlist";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f4f8ff] text-[#10233f]">
      <Navbar />
      <Hero />
      <Features />
      <Audience />
      <Offerings />
      <Stats />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
