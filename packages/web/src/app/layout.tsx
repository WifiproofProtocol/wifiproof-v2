import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";
import Providers from "./providers";

const familjen = localFont({
  src: "./fonts/familjen-grotesk-latin.woff2",
  variable: "--font-familjen",
  display: "swap",
  weight: "400 700",
});

export const metadata: Metadata = {
  title: "WiFiProof | Private Proof of Presence",
  description: "Prove you were there. Not who you are.",
  keywords: ["proof of attendance", "privacy", "zero knowledge", "World ID", "Base", "EAS"],
  authors: [{ name: "WiFiProof Protocol" }],
  metadataBase: new URL("https://wifiproof.xyz"),
  openGraph: {
    title: "WiFiProof | Private Proof of Presence",
    description: "Prove you were there. Not who you are.",
    url: "https://wifiproof.xyz",
    siteName: "WiFiProof",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WiFiProof | Private Proof of Presence",
    description: "Prove you were there. Not who you are.",
    creator: "@WiFiProof",
  },
  other: {
    "base:app_id": "69c80097480a9d8cb993adec",
    "talentapp:project_verification": "a3c5c8e579cebcb79d89051123545b1bcca26e8bb987cf59faea0efb45f0b51807a1ea74a92ed4634c5df2fc06425ae1e4516c07f57d9001c664a0834f621c0b",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${familjen.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
