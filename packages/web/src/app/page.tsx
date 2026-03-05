import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import BentoGrid from "@/components/landing/BentoGrid";
import TechStack from "@/components/landing/TechStack";
import FinalCTA from "@/components/landing/Waitlist";
import Footer from "@/components/landing/Footer";
import Particles from "@/components/landing/Particles";

export default function Home() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#02040A] text-slate-200">
      <Particles />
      <Navbar />
      <Hero />
      <Features />
      <TechStack />
      <BentoGrid />
      <FinalCTA />
      <Footer />
    </main>
  );
}