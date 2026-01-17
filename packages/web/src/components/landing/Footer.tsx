"use client";
import { Github, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-12 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">
              W
            </div>
            <span className="font-bold text-lg">WiFiProof</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://twitter.com/WiFiProof"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href="https://github.com/WifiproofProtocol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>

          <div className="text-sm text-gray-500">
            Built with privacy in mind
          </div>
        </div>
      </div>
    </footer>
  );
}
