"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import {
  FileText, Compass, Package, ArrowRight,
  Library, Mic2, MessageSquare, Zap,
  Scroll, Globe, Volume2, RefreshCw,
} from "lucide-react";

const quotes = [
  { text: "The past is never dead. It is not even past.", author: "William Faulkner", source: "Requiem for a Nun" },
  { text: "History is the version of past events that people have decided to agree upon.", author: "Napoleon Bonaparte", source: "Attributed" },
  { text: "Those who cannot remember the past are condemned to repeat it.", author: "George Santayana", source: "The Life of Reason" },
  { text: "The most effective way to destroy people is to deny and obliterate their own understanding of their history.", author: "George Orwell", source: "Nineteen Eighty-Four" },
  { text: "What is history but a fable agreed upon?", author: "Napoleon Bonaparte", source: "Attributed" },
  { text: "History is not the past. It is the present. We carry our history with us.", author: "James Baldwin", source: "A Talk to Teachers" },
  { text: "To be ignorant of what occurred before you were born is to remain always a child.", author: "Marcus Tullius Cicero", source: "Orator" },
  { text: "History will be kind to me for I intend to write it.", author: "Winston Churchill", source: "Attributed" },
  { text: "The farther backward you can look, the farther forward you are likely to see.", author: "Winston Churchill", source: "Attributed" },
  { text: "In every conceivable manner, the family is link to our past, bridge to our future.", author: "Alex Haley", source: "Roots" },
  { text: "A people without the knowledge of their past history, origin and culture is like a tree without roots.", author: "Marcus Garvey", source: "Philosophy and Opinions" },
  { text: "History repeats itself, first as tragedy, second as farce.", author: "Karl Marx", source: "The Eighteenth Brumaire" },
];

const modes = [
  {
    href: "/speak",
    icon: FileText,
    title: "Archive Mode",
    subtitle: "Make any document speak",
    description:
      "Paste or upload any historical document - letter, newspaper, diary, speech. Hear it narrated with full historical context, then ask questions and hear the archive answer back.",
    tag: "Upload & Narrate",
    accent: "rgba(201,150,58,0.12)",
  },
  {
    href: "/discover",
    icon: Compass,
    title: "Discover Archives",
    subtitle: "Browse history, hear it live",
    description:
      "Explore millions of real historical documents from the Library of Congress. Click any page from the past and hear it come alive with a cinematic narrator.",
    tag: "Chronicling America",
    accent: "rgba(201,150,58,0.08)",
  },
  {
    href: "/heirloom",
    icon: Package,
    title: "The Heirloom",
    subtitle: "Every object has a story",
    description:
      "Describe any everyday object you own. Echoes traces its entire history - from first invention through cultural evolution - and narrates it back to you.",
    tag: "Object History",
    accent: "rgba(201,150,58,0.06)",
  },
];

const stats = [
  {
    icon: Library,
    value: "20M+",
    label: "Archive Pages",
    sub: "Library of Congress",
  },
  {
    icon: Mic2,
    value: "Studio",
    label: "Voice Quality",
    sub: "ElevenLabs AI",
  },
  {
    icon: MessageSquare,
    value: "Live",
    label: "Conversation",
    sub: "Ask the archive anything",
  },
  {
    icon: Zap,
    value: "Instant",
    label: "Narration",
    sub: "No signup required",
  },
];

const features = [
  {
    icon: Scroll,
    title: "Real Primary Sources",
    body: "Every document in Discover mode is a real, digitized page from the Library of Congress Chronicling America collection - authentic history, not AI-generated text.",
  },
  {
    icon: Globe,
    title: "150+ Years of History",
    body: "Browse newspapers, letters, and records spanning from the 1770s through 1963 - America's full story in its own words, made audible for the first time.",
  },
  {
    icon: Volume2,
    title: "Cinematic Narration",
    body: "ElevenLabs' most expressive voice models bring each document to life with tone, pacing, and gravitas that matches the weight of the historical moment.",
  },
];

export default function Home() {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [quoteKey, setQuoteKey] = useState(0);

  const nextQuote = useCallback(() => {
    setQuoteIdx((prev) => {
      let next = prev;
      while (next === prev) next = Math.floor(Math.random() * quotes.length);
      return next;
    });
    setQuoteKey((k) => k + 1);
  }, []);

  const quote = quotes[quoteIdx];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
      {/* Atmospheric glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(201,150,58,0.07) 0%, transparent 65%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(201,150,58,0.03) 0%, transparent 50%)",
        }}
      />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-20 relative z-10"
      >
        <div className="flex items-center justify-center gap-4 mb-8">
          <div style={{ background: "linear-gradient(to right, transparent, rgba(201,150,58,0.5))", height: "1px", width: "80px" }} />
          <span style={{ color: "#5a4a38" }} className="text-[10px] tracking-[0.5em] uppercase">
            LancerHacks IX
          </span>
          <div style={{ background: "linear-gradient(to left, transparent, rgba(201,150,58,0.5))", height: "1px", width: "80px" }} />
        </div>

        <h1
          style={{
            color: "#f2ead8",
            textShadow: "0 0 80px rgba(201,150,58,0.15)",
            letterSpacing: "0.2em",
          }}
          className="text-8xl md:text-[10rem] font-bold uppercase mb-5 leading-none"
        >
          Echoes
        </h1>

        <p
          style={{ color: "#c9963a", textShadow: "0 0 30px rgba(201,150,58,0.25)" }}
          className="text-lg md:text-xl tracking-[0.2em] uppercase font-light mb-5"
        >
          History has a voice.
        </p>

        <p style={{ color: "#7a6550" }} className="max-w-md mx-auto text-sm leading-loose">
          Upload a historical document, browse real archives, or describe an object you own.
          Echoes narrates the past - and lets you talk back to it.
        </p>
      </motion.div>

      {/* Mode cards */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        {modes.map((mode, i) => (
          <motion.div
            key={mode.href}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link href={mode.href} className="block group h-full">
              <div className="card-glow h-full rounded-2xl p-6 flex flex-col gap-5 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div
                    style={{
                      background: mode.accent,
                      border: "1px solid rgba(201,150,58,0.2)",
                      boxShadow: "0 0 16px rgba(201,150,58,0.07)",
                    }}
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                  >
                    <mode.icon size={19} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                  </div>
                  <span
                    style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.5)" }}
                    className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
                  >
                    {mode.tag}
                  </span>
                </div>

                <div className="flex-1">
                  <h2 style={{ color: "#f2ead8" }} className="text-base font-semibold mb-1 tracking-wide">
                    {mode.title}
                  </h2>
                  <p style={{ color: "#c9963a" }} className="text-[10px] tracking-[0.2em] uppercase mb-3 opacity-80">
                    {mode.subtitle}
                  </p>
                  <p style={{ color: "#7a6550" }} className="text-sm leading-relaxed">
                    {mode.description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <span
                    style={{ color: "#c9963a" }}
                    className="text-xs font-medium tracking-wider uppercase group-hover:translate-x-0.5 transition-transform inline-block"
                  >
                    Open
                  </span>
                  <ArrowRight size={13} style={{ color: "#c9963a" }} className="group-hover:translate-x-1 transition-transform opacity-70" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0.6 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.7, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-5xl relative z-10 mt-16 flex items-center gap-4"
      >
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #2a1f12)" }} />
        <span style={{ color: "#3a2d1e" }} className="text-[9px] tracking-[0.4em] uppercase shrink-0">Impact</span>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #2a1f12)" }} />
      </motion.div>

      {/* Stat cards */}
      <div className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10 mt-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              style={{
                background: "linear-gradient(160deg, #161009 0%, #0f0b05 100%)",
                border: "1px solid #2a1f12",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)",
              }}
              className="rounded-xl p-4 flex flex-col gap-2"
            >
              <stat.icon size={15} style={{ color: "#5a4a38" }} strokeWidth={1.5} />
              <div>
                <p
                  style={{ color: "#c9963a", textShadow: "0 0 20px rgba(201,150,58,0.2)" }}
                  className="text-xl font-bold tracking-tight leading-none mb-0.5"
                >
                  {stat.value}
                </p>
                <p style={{ color: "#f2ead8" }} className="text-xs font-medium tracking-wide">
                  {stat.label}
                </p>
              </div>
              <p style={{ color: "#3a2d1e" }} className="text-[10px] tracking-[0.15em] uppercase">
                {stat.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Feature highlight cards */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10 mt-3">
        {features.map((feat, i) => (
          <motion.div
            key={feat.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              style={{
                background: "linear-gradient(160deg, #131008 0%, #0a0804 100%)",
                border: "1px solid #1e1608",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
              className="rounded-xl p-5 flex flex-col gap-3 h-full"
            >
              <div
                style={{
                  background: "rgba(201,150,58,0.05)",
                  border: "1px solid rgba(201,150,58,0.12)",
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
              >
                <feat.icon size={15} style={{ color: "#c9963a" }} strokeWidth={1.5} />
              </div>
              <div>
                <p style={{ color: "#9a8570" }} className="text-sm font-semibold mb-1.5 tracking-wide">
                  {feat.title}
                </p>
                <p style={{ color: "#4a3d2e" }} className="text-xs leading-relaxed">
                  {feat.body}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Atmospheric quote card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-5xl relative z-10 mt-3"
      >
        <div
          style={{
            background: "linear-gradient(135deg, #1a1208 0%, #0f0b05 60%, #161009 100%)",
            border: "1px solid rgba(201,150,58,0.12)",
            boxShadow: "0 4px 32px rgba(0,0,0,0.4), 0 0 60px rgba(201,150,58,0.03), inset 0 1px 0 rgba(201,150,58,0.06)",
          }}
          className="rounded-2xl px-8 py-7 flex flex-col md:flex-row items-center gap-6"
        >
          {/* Left ornament */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div style={{ width: "1px", height: "28px", background: "linear-gradient(to bottom, transparent, rgba(201,150,58,0.4))" }} />
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(201,150,58,0.5)" }} />
            <div style={{ width: "1px", height: "28px", background: "linear-gradient(to top, transparent, rgba(201,150,58,0.4))" }} />
          </div>

          <div className="flex-1 min-w-0 text-center md:text-left overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={quoteKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <p
                  style={{ color: "#7a6550", fontStyle: "italic", lineHeight: "1.8", letterSpacing: "0.02em" }}
                  className="text-sm md:text-base"
                >
                  &ldquo;{quote.text}&rdquo;
                </p>
                <p style={{ color: "#3a2d1e" }} className="text-[10px] tracking-[0.3em] uppercase mt-2">
                  {quote.author} - {quote.source}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Regenerate button */}
          <button
            onClick={nextQuote}
            title="New quote"
            style={{
              color: "#3a2d1e",
              border: "1px solid #2a1f12",
              background: "transparent",
              flexShrink: 0,
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:text-[#c9963a] hover:border-[rgba(201,150,58,0.3)] transition-all duration-200 group"
          >
            <RefreshCw size={13} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>

          <div className="shrink-0 hidden md:flex flex-col items-center gap-2">
            <div style={{ width: "1px", height: "28px", background: "linear-gradient(to bottom, transparent, rgba(201,150,58,0.4))" }} />
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(201,150,58,0.5)" }} />
            <div style={{ width: "1px", height: "28px", background: "linear-gradient(to top, transparent, rgba(201,150,58,0.4))" }} />
          </div>
        </div>
      </motion.div>

      {/* Footer credit */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="mt-12 flex items-center gap-3 relative z-10"
      >
        <div style={{ height: "1px", width: "32px", background: "#2a1f12" }} />
        <p style={{ color: "#3a2d1e" }} className="text-[10px] tracking-[0.3em] uppercase">
          ElevenLabs - Library of Congress - Wikipedia
        </p>
        <div style={{ height: "1px", width: "32px", background: "#2a1f12" }} />
      </motion.div>
    </div>
  );
}
