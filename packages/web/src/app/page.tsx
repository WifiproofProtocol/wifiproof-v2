import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Stats from "@/components/landing/Stats";
import BentoGrid from "@/components/landing/BentoGrid";
import TechStack from "@/components/landing/TechStack";
import FinalCTA from "@/components/landing/Waitlist";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f3ede4] text-[#1f1b17]">
      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <TechStack />
      <BentoGrid />
      <FinalCTA />
      <Footer />
    </main>
  );
}
