"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X, Github } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020412]/60 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-blue-500/20">
              <span className="font-bold text-white text-lg">W</span>
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

            <a href="#waitlist" className="relative group overflow-hidden rounded-full p-[1px]">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-[spin_4s_linear_infinite] opacity-70" />
              <div className="relative px-6 py-2.5 bg-[#0a0a0a] rounded-full text-white text-sm font-bold hover:bg-black/80 transition-all flex items-center gap-2">
                Connect Wallet
              </div>
            </a>
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
            <motion.button
              initial={{ x: -20, opacity: 0 }}
              animate={isOpen ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white font-bold"
              onClick={() => setIsOpen(false)}
            >
              Connect Wallet
            </motion.button>
          </div>
        </motion.div>
      </div>
    </nav>
  );
}
