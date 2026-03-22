"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Package, Plus, Check } from "lucide-react";

interface CommunityEntry {
  id: string;
  object: string;
  story: string;
  author: string;
  savedAt: number;
}

const SEED: CommunityEntry[] = [
  {
    id: "seed-1",
    object: "My grandmother's pocket watch",
    story: "A Swiss lever pocket watch from the 1890s. The case is engraved with initials - perhaps a wedding gift. Pocket watches like this democratized timekeeping in the late 19th century, as railroad expansion demanded synchronized schedules across continents.",
    author: "archivist_mae",
    savedAt: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: "seed-2",
    object: "Cast iron skillet, circa 1920",
    story: "Cast iron cookware traces its origins to Han Dynasty China around 500 BCE. By the early 20th century, American foundries like Griswold and Wagner produced millions of skillets. This one likely witnessed two World Wars, the Great Depression, and the invention of television.",
    author: "heritage_kitchen",
    savedAt: Date.now() - 1000 * 60 * 60 * 8,
  },
  {
    id: "seed-3",
    object: "A 1943 wartime telegram",
    story: "During World War II, Western Union delivered over 186 million telegrams. The yellow envelopes became feared symbols - families dreaded their arrival. This telegram, sent from a military base in the Pacific, carried the weight of an entire era of human sacrifice.",
    author: "ww2_memory",
    savedAt: Date.now() - 1000 * 60 * 60 * 14,
  },
  {
    id: "seed-4",
    object: "Brass sextant from a merchant ship",
    story: "The sextant, invented in 1731 by John Hadley, enabled navigators to measure the angle between celestial objects and the horizon with unprecedented accuracy. Before GPS, every ocean crossing depended on instruments like this one - human ingenuity confronting the vastness of the sea.",
    author: "maritime_hist",
    savedAt: Date.now() - 1000 * 60 * 60 * 22,
  },
  {
    id: "seed-5",
    object: "A Civil War diary, 1863",
    story: "Personal diaries from the Civil War period represent some of the most intimate surviving accounts of America's most devastating conflict. The act of writing - even in the midst of war - was an assertion of humanity and a hope that someone in the future might bear witness.",
    author: "civil_war_archive",
    savedAt: Date.now() - 1000 * 60 * 60 * 31,
  },
];

const KEY = "echoes-community";

function loadCommunity(): CommunityEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function CommunityPage() {
  const [userEntries, setUserEntries] = useState<CommunityEntry[]>([]);
  const [object, setObject] = useState("");
  const [story, setStory] = useState("");
  const [author, setAuthor] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { setUserEntries(loadCommunity()); }, []);

  function handleSubmit() {
    if (!object.trim() || !story.trim()) return;
    const entry: CommunityEntry = {
      id: crypto.randomUUID(),
      object: object.trim(),
      story: story.trim(),
      author: author.trim() || "anonymous",
      savedAt: Date.now(),
    };
    const updated = [entry, ...loadCommunity()];
    localStorage.setItem(KEY, JSON.stringify(updated));
    setUserEntries(updated);
    setObject(""); setStory(""); setAuthor("");
    setSubmitted(true);
    setShowForm(false);
    setTimeout(() => setSubmitted(false), 3000);
  }

  const allEntries = [...userEntries, ...SEED];

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(201,150,58,0.09) 0%, transparent 65%)" }} />
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <div style={{ background: "linear-gradient(to right, transparent, rgba(201,150,58,0.5))", height: "1px", width: "80px" }} />
            <span style={{ color: "#5a4a38" }} className="text-[10px] tracking-[0.5em] uppercase flex items-center gap-2">
              <Users size={9} /> Community
            </span>
            <div style={{ background: "linear-gradient(to left, transparent, rgba(201,150,58,0.5))", height: "1px", width: "80px" }} />
          </div>
          <h1
            style={{ color: "#f2ead8", textShadow: "0 0 80px rgba(201,150,58,0.18)", letterSpacing: "0.15em" }}
            className="text-5xl md:text-7xl font-bold uppercase mb-5 leading-none"
          >
            Living Wall
          </h1>
          <p style={{ color: "#c9963a", textShadow: "0 0 30px rgba(201,150,58,0.3)" }}
            className="text-base md:text-lg tracking-[0.25em] uppercase font-light mb-5">
            Histories shared. Memories preserved.
          </p>
          <p style={{ color: "#7a6550" }} className="max-w-md mx-auto text-sm leading-loose">
            A growing archive of objects and stories submitted by the community.
            Every submission adds to a collective memory that endures.
          </p>
          <div style={{ border: "1px solid rgba(201,150,58,0.2)", background: "rgba(201,150,58,0.06)" }}
            className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full">
            <Users size={11} style={{ color: "#c9963a" }} />
            <span style={{ color: "#c9963a" }} className="text-[11px] tracking-[0.25em] uppercase font-medium">
              {allEntries.length} stories preserved
            </span>
          </div>
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16 space-y-6">
        {/* Submit button / success */}
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ background: "rgba(201,150,58,0.07)", border: "1px solid rgba(201,150,58,0.2)" }}
              className="rounded-2xl p-4 flex items-center gap-3"
            >
              <Check size={16} style={{ color: "#c9963a" }} />
              <span style={{ color: "#c9963a" }} className="text-sm tracking-wide">
                Your story has been added to the living wall.
              </span>
            </motion.div>
          ) : !showForm ? (
            <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button
                onClick={() => setShowForm(true)}
                style={{ background: "linear-gradient(135deg, #d4a042 0%, #b07828 100%)", color: "#0d0a06", boxShadow: "0 2px 16px rgba(201,150,58,0.35)" }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
              >
                <Plus size={15} />Add Your Story
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card-glow rounded-2xl overflow-hidden"
            >
              <div style={{ height: "2px", background: "linear-gradient(to right, transparent, #c9963a, transparent)" }} />
              <div className="p-6 space-y-3">
                <input
                  placeholder="What is the object?"
                  value={object}
                  onChange={e => setObject(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(42,31,18,0.9)", color: "#f0e8d8" }}
                  className="w-full px-4 py-2.5 rounded-xl text-sm placeholder:text-[#3a2d1e] outline-none focus:border-[#c9963a]/40 transition-colors"
                />
                <textarea
                  placeholder="Share its history or story..."
                  value={story}
                  onChange={e => setStory(e.target.value)}
                  rows={4}
                  style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(42,31,18,0.9)", color: "#f0e8d8", resize: "vertical" }}
                  className="w-full px-4 py-3 rounded-xl text-sm placeholder:text-[#3a2d1e] outline-none focus:border-[#c9963a]/40 transition-colors"
                />
                <input
                  placeholder="Your name (optional)"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(42,31,18,0.9)", color: "#f0e8d8" }}
                  className="w-full px-4 py-2.5 rounded-xl text-sm placeholder:text-[#3a2d1e] outline-none focus:border-[#c9963a]/40 transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!object.trim() || !story.trim()}
                    style={{ background: object.trim() && story.trim() ? "linear-gradient(135deg, #d4a042 0%, #b07828 100%)" : "#1e1608", color: object.trim() && story.trim() ? "#0d0a06" : "#3a2d1e", boxShadow: object.trim() && story.trim() ? "0 2px 16px rgba(201,150,58,0.35)" : "none" }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed"
                  >
                    Add to the Wall
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    style={{ border: "1px solid #2a1f12", color: "#5a4a38", background: "transparent" }}
                    className="px-4 py-2.5 rounded-xl text-sm hover:text-[#c9963a] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid of entries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allEntries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
              className="card-glow rounded-2xl overflow-hidden"
            >
              <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(201,150,58,0.35), transparent)" }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.15)", flexShrink: 0 }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center">
                    <Package size={15} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                  </div>
                  <span style={{ color: "#3a2d1e" }} className="text-[9px] tracking-[0.2em] uppercase mt-1">
                    {timeAgo(entry.savedAt)}
                  </span>
                </div>
                <h3 style={{ color: "#f2ead8" }} className="text-sm font-semibold mb-2 tracking-wide capitalize">
                  {entry.object}
                </h3>
                <p style={{ color: "#5a4a38" }} className="text-xs leading-relaxed line-clamp-4">
                  {entry.story}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div style={{ width: "16px", height: "1px", background: "#2a1f12" }} />
                  <span style={{ color: "#3a2d1e" }} className="text-[9px] tracking-[0.25em] uppercase">{entry.author}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
