"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X, Github } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-lg border-b border-white/5">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
              W
            </div>
            <span className="font-bold text-lg text-white">WiFiProof</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Features
            </a>
            <a
              href="#use-cases"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Use Cases
            </a>
            <a
              href="https://github.com/WifiproofProtocol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="#waitlist"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all"
            >
              Join Waitlist
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
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
          className="md:hidden overflow-hidden"
        >
          <div className="py-4 border-t border-white/5">
            <div className="flex flex-col gap-2">
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
                  className="px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.a
                href="https://github.com/WifiproofProtocol"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ x: -20, opacity: 0 }}
                animate={isOpen ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                transition={{ delay: 0.2 }}
                className="px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                GitHub
              </motion.a>
              <motion.a
                href="#waitlist"
                initial={{ x: -20, opacity: 0 }}
                animate={isOpen ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                transition={{ delay: 0.3 }}
                className="mx-4 mt-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium text-center"
                onClick={() => setIsOpen(false)}
              >
                Join Waitlist
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </nav>
  );
}
