"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BookMarked, Trash2, ArrowRight, Clock, FileText, Package, Compass, Archive } from "lucide-react";
import { getArchive, removeFromArchive, type ArchiveItem } from "@/lib/archive";

const TYPE_ICONS = {
  document: FileText,
  heirloom: Package,
  discover: Compass,
};

const TYPE_LABELS = {
  document: "Archive Mode",
  heirloom: "Heirloom",
  discover: "Discover",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function ArchivePage() {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setItems(getArchive());
  }, []);

  function handleDelete(id: string) {
    removeFromArchive(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(201,150,58,0.09) 0%, transparent 65%)" }}
        />
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <div style={{ background: "linear-gradient(to right, transparent, rgba(201,150,58,0.5))", height: "1px", width: "80px" }} />
            <span style={{ color: "#5a4a38" }} className="text-[10px] tracking-[0.5em] uppercase flex items-center gap-2">
              <BookMarked size={9} /> Your Archive
            </span>
            <div style={{ background: "linear-gradient(to left, transparent, rgba(201,150,58,0.5))", height: "1px", width: "80px" }} />
          </div>

          <h1
            style={{
              color: "#f2ead8",
              textShadow: "0 0 80px rgba(201,150,58,0.18), 0 0 160px rgba(201,150,58,0.08)",
              letterSpacing: "0.12em",
            }}
            className="text-6xl md:text-8xl font-bold uppercase mb-5 leading-none"
          >
            Your Archive
          </h1>

          <p
            style={{ color: "#c9963a", textShadow: "0 0 30px rgba(201,150,58,0.3)" }}
            className="text-base md:text-lg tracking-[0.25em] uppercase font-light mb-5"
          >
            Living history, preserved.
          </p>

          <p style={{ color: "#7a6550" }} className="max-w-md mx-auto text-sm leading-loose">
            Every document you save lives here - permanently stored in your browser, ready to be heard again whenever you return.
          </p>
        </motion.div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        {!mounted ? null : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center py-24 gap-6 text-center"
          >
            <div
              style={{ background: "rgba(42,31,18,0.3)", border: "1px solid #2a1f12" }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
            >
              <Archive size={28} style={{ color: "#3a2d1e" }} strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ color: "#7a6550" }} className="text-base mb-2 tracking-wide">Your archive is empty.</p>
              <p style={{ color: "#3a2d1e" }} className="text-sm max-w-sm leading-relaxed">
                Start narrating documents to build your personal living archive. Every saved document persists across sessions.
              </p>
            </div>
            <Link
              href="/"
              style={{
                background: "linear-gradient(135deg, #d4a042 0%, #b07828 100%)",
                color: "#0d0a06",
                boxShadow: "0 2px 16px rgba(201,150,58,0.35)",
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              Start Exploring <ArrowRight size={14} />
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Count */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 mb-6"
            >
              <div style={{ height: "1px", background: "rgba(42,31,18,0.8)", width: "24px" }} />
              <p style={{ color: "#5a4a38" }} className="text-xs tracking-wide">
                <span style={{ color: "#c9963a" }}>{items.length}</span> saved {items.length === 1 ? "document" : "documents"}
              </p>
              <div style={{ height: "1px", background: "rgba(42,31,18,0.8)" }} className="flex-1" />
            </motion.div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AnimatePresence>
                {items.map((item, i) => {
                  const Icon = TYPE_ICONS[item.type];
                  const speakHref = item.type === "heirloom"
                    ? `/heirloom?object=${encodeURIComponent(item.title)}`
                    : `/speak?title=${encodeURIComponent(item.title)}&text=${encodeURIComponent(item.text.slice(0, 800))}`;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="card-glow rounded-2xl p-5 flex flex-col gap-4 h-full">
                        {/* Top row */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.15)" }}
                              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            >
                              <Icon size={16} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                            </div>
                            <span
                              style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.5)" }}
                              className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full"
                            >
                              {TYPE_LABELS[item.type]}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDelete(item.id)}
                            style={{ color: "#3a2d1e", border: "1px solid #2a1f12" }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-[#f87171] hover:border-[rgba(248,113,113,0.3)] transition-all flex-shrink-0"
                            title="Remove from archive"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Text */}
                        <div className="flex-1">
                          <h3 style={{ color: "#f2ead8" }} className="text-sm font-semibold mb-2 tracking-wide leading-snug">
                            {item.title}
                          </h3>
                          <p style={{ color: "#4a3c2c" }} className="text-xs leading-relaxed line-clamp-3">
                            {item.text.slice(0, 160)}...
                          </p>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid #1e1608" }}>
                          <div className="flex items-center gap-1.5">
                            <Clock size={10} style={{ color: "#3a2d1e" }} />
                            <span style={{ color: "#3a2d1e" }} className="text-[10px]">
                              {formatDate(item.savedAt)}
                            </span>
                          </div>
                          <Link
                            href={speakHref}
                            style={{ color: "#c9963a" }}
                            className="flex items-center gap-1 text-[10px] tracking-wider uppercase hover:opacity-80 transition-opacity"
                          >
                            Hear again <ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
