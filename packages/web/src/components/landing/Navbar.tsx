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
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden py-4 border-t border-white/5"
          >
            <div className="flex flex-col gap-4">
              <a
                href="#features"
                className="text-gray-400 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Features
              </a>
              <a
                href="#use-cases"
                className="text-gray-400 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Use Cases
              </a>
              <a
                href="https://github.com/WifiproofProtocol"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                GitHub
              </a>
              <a
                href="#waitlist"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium text-center"
                onClick={() => setIsOpen(false)}
              >
                Join Waitlist
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
