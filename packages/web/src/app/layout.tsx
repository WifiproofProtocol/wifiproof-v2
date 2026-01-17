import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WiFiProof | Zero-Knowledge Proof of Presence",
  description:
    "Privacy-preserving proof of attendance using ZK cryptography. Prove you were there without revealing where.",
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
    title: "WiFiProof | Zero-Knowledge Proof of Presence",
    description:
      "Privacy-preserving proof of attendance using ZK cryptography. Prove you were there without revealing where.",
    url: "https://wifiproof.xyz",
    siteName: "WiFiProof",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WiFiProof | Zero-Knowledge Proof of Presence",
    description:
      "Privacy-preserving proof of attendance using ZK cryptography.",
    creator: "@WiFiProof",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
