import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import BentoGrid from "@/components/landing/BentoGrid";
import TechStack from "@/components/landing/TechStack";
import FinalCTA from "@/components/landing/Waitlist";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f4f8ff] text-[#10233f]">
      <Navbar />
      <Hero />
      <Features />
      <BentoGrid />
      <TechStack />
      <FinalCTA />
      <Footer />
    </main>
  );
}
