"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X, Github } from "lucide-react";
import Image from "next/image";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020412]/60 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 group-hover:scale-105 transition-transform duration-300">
              <Image
                src="/WifiProofLogo.png"
                alt="WiFiProof Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-bold text-xl text-white tracking-tight group-hover:text-blue-200 transition-colors">
              WiFiProof
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-8 text-sm font-medium text-gray-300">
              <a
                href="#features"
                className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              >
                Features
              </a>
              <a
                href="#use-cases"
                className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              >
                Use Cases
              </a>
              <a
                href="https://github.com/WifiproofProtocol"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>


          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white hover:text-gray-300 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <motion.div
          initial={false}
          animate={isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="md:hidden overflow-hidden bg-[#020412]/95 border-b border-white/10 backdrop-blur-xl"
        >
          <div className="py-6 px-4 space-y-4">
            {[
              { href: "#features", label: "Features" },
              { href: "#use-cases", label: "Use Cases" },
            ].map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                initial={{ x: -20, opacity: 0 }}
                animate={isOpen ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                transition={{ delay: i * 0.1 }}
                className="block text-lg font-medium text-gray-300 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </motion.a>
            ))}

          </div>
        </motion.div>
      </div>
    </nav>
  );
}
