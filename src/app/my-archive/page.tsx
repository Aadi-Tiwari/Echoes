"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, Trash2, FileText, Package, Compass, ArrowRight, BookOpen, Clock } from "lucide-react";
import { useArchive, ArchiveEntry } from "@/hooks/useArchive";

const TYPE_META: Record<ArchiveEntry["type"], { icon: React.ElementType; label: string; color: string }> = {
  document:  { icon: FileText, label: "Document",  color: "#c9963a" },
  heirloom:  { icon: Package,  label: "Heirloom",  color: "#e8b95a" },
  discovery: { icon: Compass,  label: "Discovery", color: "#a89070" },
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function MyArchivePage() {
  const { entries, remove } = useArchive();
  const [deleting, setDeleting] = useState<string | null>(null);

  function handleDelete(id: string) {
    setDeleting(id);
    setTimeout(() => { remove(id); setDeleting(null); }, 300);
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
              <Archive size={9} /> My Archive
            </span>
            <div style={{ background: "linear-gradient(to left, transparent, rgba(201,150,58,0.5))", height: "1px", width: "80px" }} />
          </div>
          <h1
            style={{ color: "#f2ead8", textShadow: "0 0 80px rgba(201,150,58,0.18)", letterSpacing: "0.15em" }}
            className="text-5xl md:text-7xl font-bold uppercase mb-5 leading-none"
          >
            My Archive
          </h1>
          <p style={{ color: "#c9963a", textShadow: "0 0 30px rgba(201,150,58,0.3)" }}
            className="text-base md:text-lg tracking-[0.25em] uppercase font-light mb-5">
            Your personal living archive
          </p>
          <p style={{ color: "#7a6550" }} className="max-w-md mx-auto text-sm leading-loose">
            Every document, heirloom, and discovery you have saved - preserved here, accessible anytime.
          </p>
          {entries.length > 0 && (
            <div style={{ border: "1px solid rgba(201,150,58,0.2)", background: "rgba(201,150,58,0.06)" }}
              className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full">
              <BookOpen size={11} style={{ color: "#c9963a" }} />
              <span style={{ color: "#c9963a" }} className="text-[11px] tracking-[0.25em] uppercase font-medium">
                {entries.length} {entries.length === 1 ? "item" : "items"} preserved
              </span>
            </div>
          )}
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16">
        {entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="card-glow rounded-2xl p-12 text-center"
          >
            <div style={{ background: "rgba(201,150,58,0.06)", border: "1px solid rgba(201,150,58,0.12)" }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Archive size={28} style={{ color: "#3a2d1e" }} strokeWidth={1.5} />
            </div>
            <h2 style={{ color: "#5a4a38" }} className="text-lg font-semibold tracking-wide mb-2">Your archive is empty</h2>
            <p style={{ color: "#3a2d1e" }} className="text-sm leading-loose mb-8 max-w-sm mx-auto">
              Start by narrating a document, tracing an heirloom, or discovering a historical page.
              Save anything to build your personal living archive.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {(["/speak", "/heirloom", "/discover"] as const).map((href, i) => {
                const labels = ["Archive a Document", "Trace an Heirloom", "Discover History"];
                return (
                  <Link key={href} href={href}
                    style={{ border: "1px solid #2a1f12", color: "#7a6550", background: "rgba(42,31,18,0.4)" }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs hover:border-[rgba(201,150,58,0.35)] hover:text-[#c9963a] transition-all tracking-wider uppercase">
                    <ArrowRight size={11} />
                    {labels[i]}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-6">
              <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #2a1f12)" }} />
              <span style={{ color: "#3a2d1e" }} className="text-[9px] tracking-[0.4em] uppercase shrink-0">
                {entries.length} preserved
              </span>
              <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #2a1f12)" }} />
            </div>
            <AnimatePresence>
              {entries.map((entry, i) => {
                const meta = TYPE_META[entry.type];
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: deleting === entry.id ? 0 : 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    className="card-glow rounded-2xl overflow-hidden"
                  >
                    <div style={{ height: "1px", background: `linear-gradient(to right, transparent, ${meta.color}40, transparent)` }} />
                    <div className="p-5 flex items-start gap-4">
                      {entry.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.thumbnail} alt={entry.title}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                          style={{ boxShadow: "0 0 0 1px rgba(201,150,58,0.15)" }} />
                      ) : (
                        <div style={{ background: "rgba(201,150,58,0.06)", border: "1px solid rgba(201,150,58,0.12)", flexShrink: 0 }}
                          className="w-16 h-16 rounded-xl flex items-center justify-center">
                          <Icon size={22} style={{ color: "#3a2d1e" }} strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span style={{ color: meta.color, background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}
                            className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Icon size={8} />{meta.label}
                          </span>
                          {entry.timeline && entry.timeline.length > 0 && (
                            <span style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.5)" }}
                              className="text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock size={8} />{entry.timeline.length} events
                            </span>
                          )}
                        </div>
                        <h3 style={{ color: "#f2ead8" }} className="text-sm font-semibold tracking-wide mb-1 truncate">{entry.title}</h3>
                        {entry.context && (
                          <p style={{ color: "#5a4a38" }} className="text-xs leading-relaxed line-clamp-2">
                            {entry.context.slice(0, 180)}
                          </p>
                        )}
                        <p style={{ color: "#3a2d1e" }} className="text-[10px] tracking-[0.15em] uppercase mt-2">
                          Saved {formatDate(entry.savedAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        title="Remove from archive"
                        style={{ color: "#3a2d1e", border: "1px solid transparent", flexShrink: 0 }}
                        className="p-2 rounded-lg hover:border-red-900/40 hover:text-red-400 transition-all mt-0.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {entry.timeline && entry.timeline.length > 0 && (
                      <div style={{ borderTop: "1px solid #1e1608" }} className="px-5 pb-4 pt-3">
                        <div className="overflow-x-auto">
                          <div className="flex items-start gap-0 min-w-max">
                            {entry.timeline.slice(0, 6).map((ev, j) => (
                              <div key={j} className="flex flex-col items-center" style={{ width: "120px", position: "relative" }}>
                                {j < Math.min(entry.timeline!.length, 6) - 1 && (
                                  <div style={{
                                    position: "absolute", top: "14px", left: "60px", right: "-60px",
                                    height: "1px", background: "linear-gradient(to right, rgba(201,150,58,0.4), rgba(201,150,58,0.1))"
                                  }} />
                                )}
                                <span style={{ color: "#c9963a", background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)" }}
                                  className="text-[8px] font-mono px-1.5 py-0.5 rounded mb-2">{ev.year}</span>
                                <div style={{
                                  background: j === 0 ? "#c9963a" : "rgba(201,150,58,0.3)",
                                  boxShadow: j === 0 ? "0 0 8px rgba(201,150,58,0.5)" : "none",
                                  width: j === 0 ? "8px" : "6px", height: j === 0 ? "8px" : "6px",
                                  borderRadius: "50%", flexShrink: 0, zIndex: 1
                                }} />
                                <p style={{ color: "#4a3c2c" }} className="text-[9px] text-center mt-2 px-1 leading-relaxed">
                                  {ev.sentence.slice(0, 60)}{ev.sentence.length > 60 ? "..." : ""}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
