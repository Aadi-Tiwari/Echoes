import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import { ThemeProvider } from "@/lib/ThemeContext";
import ElevenLabsWidget from "@/components/ElevenLabsWidget";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Echoes - History Has a Voice",
  description: "An archive that speaks. Upload any historical document or describe an object and hear its story narrated.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <ParticleBackground />
          <Navbar />
          <main className="flex-1 relative pt-20" style={{ zIndex: 1 }}>
            {children}
          </main>
          <ElevenLabsWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
