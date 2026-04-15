import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WiFiProof | Privacy-Preserving Proof of Attendance",
  description:
    "A privacy-preserving attendance system that verifies real-world presence using WiFi and zero-knowledge proofs.",
  keywords: [
    "Zero Knowledge",
    "ZK Proofs",
    "Proof of Attendance",
    "POAP",
    "Base",
    "Noir",
    "EAS",
    "Attestations",
    "Privacy",
    "Blockchain",
  ],
  authors: [{ name: "WiFiProof Protocol" }],
  openGraph: {
    title: "WiFiProof | Privacy-Preserving Proof of Attendance",
    description:
      "A privacy-preserving attendance system that verifies real-world presence using WiFi and zero-knowledge proofs.",
    url: "https://wifiproof.xyz",
    siteName: "WiFiProof",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WiFiProof | Privacy-Preserving Proof of Attendance",
    description:
      "Privacy-preserving attendance for events, classrooms, and live programs.",
    creator: "@WiFiProof",
  },
  other: {
    "base:app_id": "69c80097480a9d8cb993adec",
    "talentapp:project_verification":
      "a3c5c8e579cebcb79d89051123545b1bcca26e8bb987cf59faea0efb45f0b51807a1ea74a92ed4634c5df2fc06425ae1e4516c07f57d9001c664a0834f621c0b",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
