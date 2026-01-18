import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import BentoGrid from "@/components/landing/BentoGrid";
import TechStack from "@/components/landing/TechStack";
import Waitlist from "@/components/landing/Waitlist";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <TechStack />
      <BentoGrid />
      <Waitlist />
      <Footer />
    </main>
  );
}
