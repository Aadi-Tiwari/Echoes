"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Search, Loader2, Calendar, MapPin, Volume2, Newspaper, ArrowRight, Layers, Radio, ShieldCheck, X, Archive, Check, SkipForward } from "lucide-react";
import { useArchive } from "@/hooks/useArchive";
import AudioPlayer from "@/components/AudioPlayer";
import BrowserAudioPlayer from "@/components/BrowserAudioPlayer";
import TranscriptPanel from "@/components/TranscriptPanel";
import { isBrowserTTSMode } from "@/lib/browserTTS";
import { looksLikeOCRGarbage } from "@/lib/ocrUtils";
import { selectVoice } from "@/lib/voiceSelect";

const USE_BROWSER_TTS = isBrowserTTSMode();

interface ArchiveItem {
  id: string;
  title: string;
  date: string;
  url: string;
  ocr_eng: string;
  city: string;
  state: string;
  newspaper: string;
  thumbnail: string | null;
}

const SUGGESTIONS = [
  "invention", "declaration", "freedom", "war", "discovery",
  "revolution", "election", "science", "medicine", "immigration",
];

const FEATURES = [
  { label: "10M+ Documents", desc: "Library of Congress" },
  { label: "Real History", desc: "Chronicling America" },
  { label: "Click to Hear", desc: "Instant narration" },
];

export default function DiscoverPage() {
  const [query,              setQuery]              = useState("");
  const [items,              setItems]              = useState<ArchiveItem[]>([]);
  const [loading,            setLoading]            = useState(false);
  const [searched,           setSearched]           = useState(false);
  const [total,              setTotal]              = useState(0);
  const [stitching,          setStitching]          = useState(false);
  const [stitchedAudio,      setStitchedAudio]      = useState<string | null>(null);
  const [stitchedBrowserText,setStitchedBrowserText]= useState<string | null>(null);
  const [stitchError,        setStitchError]        = useState<string | null>(null);
  const [stitchCharIdx,      setStitchCharIdx]      = useState(0);
  const [activeItem,         setActiveItem]         = useState<ArchiveItem | null>(null);
  const [activeCharIdx,      setActiveCharIdx]      = useState(0);
  const [narrateLoading,     setNarrateLoading]     = useState(false);
  const [narrateText,        setNarrateText]        = useState<string | null>(null);
  const [narrateAudioUrl,    setNarrateAudioUrl]    = useState<string | null>(null);
  const { save } = useArchive();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [broadcastActive, setBroadcastActive] = useState(false);
  const [broadcastIdx, setBroadcastIdx] = useState(0);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastAudioUrl, setBroadcastAudioUrl] = useState<string | null>(null);
  const [broadcastCurrentScript, setBroadcastCurrentScript] = useState("");
  const broadcastAudioRef = useRef<HTMLAudioElement | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setSearched(true); setItems([]);
    setStitchedAudio(null); setStitchedBrowserText(null); setStitchError(null);
    try {
      const res = await fetch(`/api/chronicling?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.totalItems || 0);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  async function openDocument(item: ArchiveItem) {
    const displayTitle = formatTitle(item.title, item.newspaper);
    const docTitle = `${displayTitle} - ${formatDate(item.date)}`;
    const rawOcr = item.ocr_eng || "";
    const fallback = `Historical document from ${displayTitle}, dated ${formatDate(item.date)}.`;
    const rawText = (rawOcr && !looksLikeOCRGarbage(rawOcr)) ? rawOcr : fallback;

    setActiveItem(item);
    setActiveCharIdx(0);
    setNarrateText(null);
    setNarrateAudioUrl(null);
    setNarrateLoading(true);
    setSavedId(null);

    setTimeout(() => {
      document.getElementById("inline-narrate")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    try {
      // Clean the OCR text before narrating - old newspapers have garbled characters,
      // split words, and damaged print that Tesseract misreads.
      let docText = rawText;
      if (rawOcr && !looksLikeOCRGarbage(rawOcr)) {
        try {
          const cleanRes = await fetch("/api/clean-ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: rawOcr.slice(0, 2500) }),
          });
          if (cleanRes.ok) {
            const { cleaned } = await cleanRes.json();
            if (cleaned && cleaned.trim() && !cleaned.includes("[No readable text found]")) {
              docText = cleaned;
            }
          }
        } catch { /* fallback to raw text */ }
      }

      if (USE_BROWSER_TTS) {
        setNarrateText(docText);
      } else {
        const { voiceId } = selectVoice(docTitle, docText);
        const res = await fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: docText, title: docTitle, context: "", voiceId }),
        });
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0) {
            setNarrateText(docText);
            setNarrateAudioUrl(URL.createObjectURL(blob));
          } else {
            setNarrateText(docText);
          }
        } else {
          setNarrateText(docText);
        }
      }
      window.dispatchEvent(new CustomEvent("echoes:context", {
        detail: { title: docTitle, context: docText.slice(0, 400) }
      }));
    } catch {
      setNarrateText(rawText);
    } finally {
      setNarrateLoading(false);
    }
  }

  function handleSaveActive() {
    if (!activeItem || savedId) return;
    const id = save({
      type: "discovery",
      title: formatTitle(activeItem.title, activeItem.newspaper) + " - " + formatDate(activeItem.date),
      context: activeItem.ocr_eng?.slice(0, 400) || "",
      thumbnail: activeItem.thumbnail,
    });
    setSavedId(id);
    window.dispatchEvent(new CustomEvent("echoes:saved"));
  }

  function buildStitchedScript(sourceItems: ArchiveItem[], q: string): string {
    const usable = [...sourceItems]
      .filter(it => it.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);

    if (usable.length === 0) return "";

    const years = usable.map(it => it.date.slice(0, 4));
    const first = years[0];
    const last  = years[years.length - 1];
    const connectors = ["First,", "Then,", "Later,", "Finally,"];

    const header = `A timeline of ${q}, from ${first} to ${last}.`;
    const entries = usable.map((it, i) => {
      const year  = it.date.slice(0, 4);
      const place = [it.city, it.state]
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
        .join(", ");
      const paper = it.newspaper ? formatTitle(it.title, it.newspaper) : "";
      const conn  = connectors[i] || "Also,";

      const parts = [`${conn} in ${year}`];
      if (place) parts.push(place);
      if (paper) parts.push(`the ${paper} covered ${q}`);
      else       parts.push(`a document covered ${q}`);

      return parts.join(", ") + ".";
    });

    return [header, ...entries].join(" ").slice(0, 500);
  }

  const handleStitch = useCallback(async () => {
    if (items.length < 2) return;
    setStitching(true);
    setStitchedAudio(null); setStitchedBrowserText(null); setStitchError(null);
    try {
      // Build structured metadata for the LLM
      const usable = [...items]
        .filter(it => it.date)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 4);
      if (usable.length === 0) throw new Error("Not enough documents to build a timeline.");

      const timelineItems = usable.map(it => ({
        year: it.date.slice(0, 4),
        city: it.city ? it.city.charAt(0).toUpperCase() + it.city.slice(1).toLowerCase() : "",
        state: it.state ? it.state.charAt(0).toUpperCase() + it.state.slice(1).toLowerCase() : "",
        newspaper: formatTitle(it.title, it.newspaper),
      }));

      // Use Groq to write a real narrative
      let script = "";
      try {
        const narRes = await fetch("/api/timeline-narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: timelineItems, query }),
        });
        if (narRes.ok) {
          const { script: generated } = await narRes.json();
          if (generated) script = generated;
        }
      } catch { /* fall through to basic fallback */ }

      // Fallback: plain structured script if LLM failed
      if (!script) script = buildStitchedScript(items, query);
      if (!script) throw new Error("Not enough documents to build a timeline.");

      if (USE_BROWSER_TTS) {
        setStitchedBrowserText(script);
      } else {
        const res = await fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: script, title: `Timeline: ${query}`, context: "" }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Narration failed");
        }
        const blob = await res.blob();
        if (blob.size === 0) throw new Error("Empty audio returned");
        setStitchedAudio(URL.createObjectURL(blob));
      }
    } catch (e) {
      setStitchError(e instanceof Error ? e.message : "Failed to build narrative");
    } finally {
      setStitching(false);
    }
  }, [items, query]);

  function buildBroadcastScript(item: ArchiveItem): string {
    const year = item.date ? item.date.slice(0, 4) : "an unknown year";
    const paper = formatTitle(item.title, item.newspaper);
    const location = [item.city, item.state]
      .filter(Boolean)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(", ");
    const excerpt =
      item.ocr_eng && !looksLikeOCRGarbage(item.ocr_eng)
        ? item.ocr_eng.replace(/\n+/g, " ").slice(0, 150).trim()
        : "";
    const parts: string[] = [`${year}.`];
    if (location) parts.push(`${paper}, from ${location}.`);
    else parts.push(`${paper}.`);
    if (excerpt) parts.push(excerpt);
    return parts.join(" ").slice(0, 350);
  }

  function startBroadcast() {
    setBroadcastActive(true);
    setBroadcastIdx(0);
    setBroadcastAudioUrl(null);
    setBroadcastCurrentScript("");
  }

  function stopBroadcast() {
    setBroadcastActive(false);
    setBroadcastIdx(0);
    setBroadcastAudioUrl(null);
    setBroadcastCurrentScript("");
    if (broadcastAudioRef.current) {
      broadcastAudioRef.current.pause();
      broadcastAudioRef.current.src = "";
    }
  }

  // Load narration for current broadcast item whenever index or active state changes
  useEffect(() => {
    if (!broadcastActive) return;
    const bItems = items.slice(0, 4);
    if (broadcastIdx >= bItems.length) {
      setBroadcastActive(false);
      setBroadcastIdx(0);
      return;
    }
    const item = bItems[broadcastIdx];
    const script = buildBroadcastScript(item);
    setBroadcastCurrentScript(script);
    setBroadcastLoading(true);
    setBroadcastAudioUrl(null);

    function skipToNext() {
      setBroadcastIdx(prev => {
        const next = prev + 1;
        if (next >= bItems.length) { setBroadcastActive(false); return 0; }
        return next;
      });
    }

    let cancelled = false;
    const { voiceId } = selectVoice(formatTitle(item.title, item.newspaper), script);
    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: script, voiceId }),
    }).then(async (res) => {
      if (cancelled) return;
      if (!res.ok) { skipToNext(); return; }
      const blob = await res.blob();
      if (cancelled) return;
      if (blob.size === 0) { skipToNext(); return; }
      const url = URL.createObjectURL(blob);
      setBroadcastAudioUrl(url);
      const audio = broadcastAudioRef.current;
      if (audio) {
        audio.src = url;
        audio.play().catch(() => { if (!cancelled) skipToNext(); });
      }
    }).catch(() => {
      if (!cancelled) skipToNext();
    }).finally(() => {
      if (!cancelled) setBroadcastLoading(false);
    });
    return () => {
      cancelled = true;
      if (broadcastAudioRef.current) {
        broadcastAudioRef.current.pause();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastActive, broadcastIdx, items]);

  function formatDate(d: string) {
    if (!d) return "";
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (d.includes("-")) {
      const [year, month, day] = d.split("-");
      const m = months[parseInt(month) - 1];
      return m ? `${m} ${parseInt(day)}, ${year}` : year;
    }
    if (d.length >= 8) {
      const year = d.slice(0, 4), month = d.slice(4, 6), day = d.slice(6, 8);
      const m = months[parseInt(month) - 1];
      return m ? `${m} ${parseInt(day)}, ${year}` : year;
    }
    return d;
  }

  function toTitleCase(s: string): string {
    const minors = new Set(["a","an","the","and","but","or","for","of","in","on","at","to","by","with"]);
    return s.split(" ").map((w, i) => {
      const lower = w.toLowerCase();
      return i === 0 || !minors.has(lower) ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    }).join(" ");
  }

  function formatTitle(title: string, newspaper: string): string {
    if (newspaper) {
      const cleaned = newspaper.replace(/\s*\([^)]*\)\s*/g, "").replace(/\s*\d{4}[-\u2013]\d{0,4}\??$/, "").trim();
      return toTitleCase(cleaned);
    }
    return toTitleCase(title.replace(/^Image \d+ of /i, ""));
  }

  const stitchedYearRange = items.length >= 2 ? (() => {
    const sorted = [...items].filter(it => it.date).sort((a, b) => a.date.localeCompare(b.date));
    return sorted.length >= 2 ? `${sorted[0].date.slice(0, 4)} - ${sorted[sorted.length - 1].date.slice(0, 4)}` : null;
  })() : null;

  return (
    <div className="relative overflow-hidden">
      {/* HERO */}
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
              <Compass size={9} /> Discover Archives
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
            Discover Archives
          </h1>

          <p
            style={{ color: "#c9963a", textShadow: "0 0 30px rgba(201,150,58,0.3)" }}
            className="text-base md:text-lg tracking-[0.25em] uppercase font-light mb-5"
          >
            The past lives here.
          </p>

          <p style={{ color: "#7a6550" }} className="max-w-md mx-auto text-sm leading-loose mb-8">
            Search millions of real pages from the Library of Congress Chronicling America collection.
            Every result is an authentic historical document - click any to hear it narrated.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                style={{ border: "1px solid #2a1f12", background: "rgba(42,31,18,0.5)" }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              >
                <span style={{ color: "#c9963a" }} className="text-[10px] tracking-[0.2em] uppercase font-medium">{f.label}</span>
                <div style={{ width: "1px", height: "10px", background: "#2a1f12" }} />
                <span style={{ color: "#4a3c2c" }} className="text-[10px]">{f.desc}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-6 pb-16">

        {/* Search card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="card-glow rounded-2xl overflow-hidden mb-6"
        >
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(42,31,18,0.8)" }}>
            <div style={{ background: "rgba(201,150,58,0.12)", border: "1px solid rgba(201,150,58,0.2)", boxShadow: "0 0 16px rgba(201,150,58,0.07)" }} className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
              <Search size={19} style={{ color: "#c9963a" }} strokeWidth={1.5} />
            </div>
            <input
              type="text"
              placeholder="Search historical documents - war, invention, election, science..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search(query)}
              style={{ color: "#f0e8d8", background: "transparent" }}
              className="flex-1 py-1 text-sm placeholder:text-[#3a2d1e] outline-none"
            />
            <button
              onClick={() => search(query)}
              disabled={!query.trim() || loading}
              style={{
                background: query.trim() && !loading ? "linear-gradient(135deg, #d4a042 0%, #b07828 100%)" : "#1e1608",
                color: query.trim() && !loading ? "#0d0a06" : "#3a2d1e",
                boxShadow: query.trim() && !loading ? "0 2px 12px rgba(201,150,58,0.28), inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
              }}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed flex-shrink-0"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Search"}
            </button>
          </div>

          <AnimatePresence>
            {!searched && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 py-4">
                <p style={{ color: "#3a2d1e" }} className="text-[10px] uppercase tracking-[0.4em] mb-3">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                      onClick={() => { setQuery(s); search(s); }}
                      style={{ border: "1px solid #2a1f12", color: "#7a6550", background: "rgba(0,0,0,0.2)" }}
                      className="text-xs px-3 py-1.5 rounded-full hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all capitalize tracking-wide"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results count */}
        {searched && !loading && items.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 mb-5">
            <div style={{ height: "1px", background: "rgba(42,31,18,0.8)", width: "24px" }} />
            <p style={{ color: "#5a4a38" }} className="text-xs tracking-wide">
              <span style={{ color: "#c9963a" }}>{total.toLocaleString()}</span> documents found
              <span style={{ color: "#3a2d1e" }}> - showing top {items.length}</span>
            </p>
            <div style={{ height: "1px", background: "rgba(42,31,18,0.8)" }} className="flex-1" />
          </motion.div>
        )}

        {/* Inline narration panel */}
        <AnimatePresence>
          {activeItem && (
            <motion.div
              id="inline-narrate"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6"
            >
              <div className="card-glow rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(42,31,18,0.8)" }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div style={{ background: "rgba(201,150,58,0.12)", border: "1px solid rgba(201,150,58,0.2)" }} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Volume2 size={16} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p style={{ color: "#f2ead8" }} className="text-sm font-semibold tracking-wide truncate">
                        {formatTitle(activeItem.title, activeItem.newspaper)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.5)" }} className="text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck size={8} /> Verified Source
                        </span>
                        {activeItem.date && <span style={{ color: "#4a3c2c" }} className="text-[10px]">{formatDate(activeItem.date)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <button
                      onClick={handleSaveActive}
                      disabled={!activeItem || !!savedId || narrateLoading}
                      title={savedId ? "Saved" : "Save to archive"}
                      style={{ color: savedId ? "#c9963a" : "#5a4a38", border: savedId ? "1px solid rgba(201,150,58,0.3)" : "1px solid #2a1f12", background: savedId ? "rgba(201,150,58,0.08)" : "transparent" }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] tracking-wider uppercase hover:text-[#c9963a] hover:border-[rgba(201,150,58,0.3)] transition-all disabled:cursor-not-allowed"
                    >
                      {savedId ? <><Check size={10} />Saved</> : <><Archive size={10} />Save</>}
                    </button>
                    <button
                      onClick={() => { setActiveItem(null); setNarrateText(null); setNarrateAudioUrl(null); }}
                      style={{ color: "#5a4a38", border: "1px solid #2a1f12" }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-[#c9963a] hover:border-[rgba(201,150,58,0.3)] transition-all"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5">
                  {narrateLoading ? (
                    <div className="flex items-center gap-3 py-8 justify-center">
                      <Loader2 size={18} style={{ color: "#c9963a" }} className="animate-spin" />
                      <span style={{ color: "#5a4a38" }} className="text-sm tracking-wide">Preparing narration...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-4 items-stretch">
                      <div className="md:w-[45%] flex-shrink-0">
                        {USE_BROWSER_TTS && narrateText
                          ? <BrowserAudioPlayer
                              text={narrateText}
                              title={formatTitle(activeItem.title, activeItem.newspaper)}
                              autoPlay
                              onCharIndex={setActiveCharIdx}
                            />
                          : narrateAudioUrl
                            ? <AudioPlayer audioUrl={narrateAudioUrl} title={formatTitle(activeItem.title, activeItem.newspaper)} />
                            : null}
                      </div>
                      <div className="flex-1 min-h-[280px] md:min-h-0">
                        <TranscriptPanel
                          text={narrateText || activeItem.ocr_eng || ""}
                          charIndex={USE_BROWSER_TTS ? activeCharIdx : 0}
                          title={formatTitle(activeItem.title, activeItem.newspaper)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline Stitch card */}
        <AnimatePresence>
          {!loading && items.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="card-glow rounded-2xl overflow-hidden mb-6"
            >
              {/* Header row */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(42,31,18,0.8)" }}>
                <div className="flex items-center gap-3">
                  <div
                    style={{ background: "rgba(201,150,58,0.12)", border: "1px solid rgba(201,150,58,0.2)", boxShadow: "0 0 16px rgba(201,150,58,0.07)" }}
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  >
                    <Layers size={19} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p style={{ color: "#f2ead8" }} className="text-sm font-semibold tracking-wide">Timeline Narrative</p>
                    <p style={{ color: "#c9963a" }} className="text-[10px] tracking-[0.2em] uppercase opacity-80">
                      Stitch results into one audio journey
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {stitchedYearRange && (
                    <span style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.5)" }} className="text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-full">
                      {stitchedYearRange}
                    </span>
                  )}
                  <span style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.5)" }} className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full">
                    {Math.min(items.filter(it => it.ocr_eng && it.date).length, 4)} sources
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                {!stitchedAudio && !stitchedBrowserText && (
                  <div className="flex items-center justify-between gap-4">
                    <p style={{ color: "#5a4a38" }} className="text-xs leading-relaxed max-w-md">
                      Echoes will weave the top results into a single narrated timeline - one continuous voice moving through history, document by document.
                    </p>
                    <button
                      onClick={handleStitch}
                      disabled={stitching}
                      style={{
                        background: !stitching ? "linear-gradient(135deg, #d4a042 0%, #b07828 100%)" : "#1e1608",
                        color: !stitching ? "#0d0a06" : "#3a2d1e",
                        boxShadow: !stitching ? "0 2px 16px rgba(201,150,58,0.35), inset 0 1px 0 rgba(255,255,255,0.12)" : "none",
                      }}
                      className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed"
                    >
                      {stitching
                        ? <><Loader2 size={14} className="animate-spin" />Building...</>
                        : <><Radio size={14} />Build Story</>}
                    </button>
                  </div>
                )}

                {stitchError && (
                  <p style={{ color: "#f87171" }} className="text-xs mt-2">{stitchError}</p>
                )}

                {(stitchedAudio || stitchedBrowserText) && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div style={{ background: "linear-gradient(to right, transparent, rgba(201,150,58,0.4))", height: "1px" }} className="flex-1" />
                      <span style={{ color: "#c9963a" }} className="text-[9px] tracking-[0.5em] uppercase">Now Playing - Timeline</span>
                      <div style={{ background: "linear-gradient(to left, transparent, rgba(201,150,58,0.4))", height: "1px" }} className="flex-1" />
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-stretch">
                      <div className="md:w-[45%] flex-shrink-0">
                        {USE_BROWSER_TTS && stitchedBrowserText
                          ? <BrowserAudioPlayer text={stitchedBrowserText} title={`Timeline: ${query}`} autoPlay onCharIndex={setStitchCharIdx} />
                          : stitchedAudio ? <AudioPlayer audioUrl={stitchedAudio} title={`Timeline: ${query}`} /> : null}
                      </div>
                      <div className="flex-1 min-h-[260px] md:min-h-0">
                        <TranscriptPanel
                          text={stitchedBrowserText || ""}
                          charIndex={USE_BROWSER_TTS ? stitchCharIdx : 0}
                          title={`Timeline: ${query}`}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => { setStitchedAudio(null); setStitchedBrowserText(null); setStitchError(null); }}
                      style={{ color: "#3a2d1e" }}
                      className="mt-3 text-[10px] tracking-wider uppercase hover:text-[#c9963a] transition-colors"
                    >
                      Reset
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Radio Broadcast */}
        <AnimatePresence>
          {!loading && items.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="card-glow rounded-2xl overflow-hidden mb-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(42,31,18,0.8)" }}>
                <div className="flex items-center gap-3">
                  <div style={{ background: "rgba(201,150,58,0.12)", border: "1px solid rgba(201,150,58,0.2)", boxShadow: "0 0 16px rgba(201,150,58,0.07)" }} className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Radio size={19} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p style={{ color: "#f2ead8" }} className="text-sm font-semibold tracking-wide">History Radio</p>
                    <p style={{ color: "#c9963a" }} className="text-[10px] tracking-[0.2em] uppercase opacity-80">Live archive broadcast</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {broadcastActive && (
                    <span style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)" }} className="text-[9px] tracking-widest uppercase px-2 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                      ON AIR
                    </span>
                  )}
                  <span style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.5)" }} className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full">
                    {Math.min(items.length, 4)} stations
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                {!broadcastActive ? (
                  <div className="flex items-center justify-between gap-4">
                    <p style={{ color: "#5a4a38" }} className="text-xs leading-relaxed max-w-md">
                      Tune in to a live broadcast of historical documents, narrated one by one - like a radio station traveling through time, document by document.
                    </p>
                    <button
                      onClick={startBroadcast}
                      style={{ background: "linear-gradient(135deg, #d4a042 0%, #b07828 100%)", color: "#0d0a06", boxShadow: "0 2px 16px rgba(201,150,58,0.35), inset 0 1px 0 rgba(255,255,255,0.12)" }}
                      className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    >
                      <Radio size={14} />Go Live
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Now on air */}
                    {(() => {
                      const bItems = items.slice(0, 4);
                      const cur = bItems[broadcastIdx];
                      if (!cur) return null;
                      return (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span style={{ color: "#3a2d1e" }} className="text-[9px] tracking-[0.4em] uppercase">Now Broadcasting</span>
                            <div style={{ background: "linear-gradient(to right, rgba(42,31,18,0.6), transparent)", height: "1px" }} className="flex-1" />
                            <span style={{ color: "#7a6550" }} className="text-[9px] font-mono">{broadcastIdx + 1} / {bItems.length}</span>
                          </div>
                          <div className="card-glow rounded-xl p-4" style={{ border: "1px solid rgba(239,68,68,0.12)" }}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p style={{ color: "#f2ead8" }} className="text-sm font-semibold mb-1 truncate">{formatTitle(cur.title, cur.newspaper)}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {cur.date && <span style={{ color: "#c9963a" }} className="text-[10px] font-mono">{cur.date.slice(0, 4)}</span>}
                                  {(cur.city || cur.state) && (
                                    <span style={{ color: "#5a4a38" }} className="text-[10px]">
                                      {[cur.city, cur.state].filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(", ")}
                                    </span>
                                  )}
                                  {!broadcastLoading && broadcastAudioUrl && (
                                    <span style={{ color: "#c9963a", border: "1px solid rgba(201,150,58,0.3)", background: "rgba(201,150,58,0.08)" }} className="text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded-full">
                                      ElevenLabs
                                    </span>
                                  )}
                                </div>
                              </div>
                              {broadcastLoading
                                ? <Loader2 size={14} style={{ color: "#c9963a" }} className="animate-spin flex-shrink-0 mt-1" />
                                : broadcastAudioUrl
                                  ? (
                                    <div className="flex items-end gap-[2px] h-5 flex-shrink-0">
                                      {[4,7,10,6,9,5,8,4,7].map((h, i) => (
                                        <div key={i} style={{ height: `${h}px`, background: "linear-gradient(to top, #a07028, #e8b95a)", animationDelay: `${i * 0.07}s`, animationDuration: `${0.7 + (i % 3) * 0.2}s`, animation: "waveform infinite" }} className="w-1 rounded-full" />
                                      ))}
                                    </div>
                                  )
                                  : null
                              }
                            </div>
                            {broadcastCurrentScript && (
                              <p style={{ color: "#4a3c2c" }} className="text-xs leading-relaxed mt-3 italic border-t border-[#2a1f12] pt-3">
                                &ldquo;{broadcastCurrentScript.slice(0, 130)}...&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Up Next */}
                    {(() => {
                      const bItems = items.slice(0, 4);
                      const upcoming = bItems.slice(broadcastIdx + 1);
                      if (upcoming.length === 0) return null;
                      return (
                        <div>
                          <p style={{ color: "#3a2d1e" }} className="text-[9px] tracking-[0.4em] uppercase mb-2">Up Next</p>
                          <div className="flex flex-wrap gap-2">
                            {upcoming.map((it, i) => (
                              <div key={it.id || i} style={{ border: "1px solid #2a1f12", color: "#5a4a38", background: "rgba(0,0,0,0.2)" }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px]">
                                <span className="font-mono text-[#3a2d1e]">{it.date?.slice(0, 4) || "?"}</span>
                                <span style={{ color: "#2a1f12" }}>-</span>
                                <span className="truncate max-w-[110px]">{formatTitle(it.title, it.newspaper)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Controls */}
                    <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid #2a1f12" }}>
                      <button
                        onClick={() => {
                          const bItems = items.slice(0, 4);
                          setBroadcastAudioUrl(null);
                          setBroadcastIdx(prev => {
                            const next = prev + 1;
                            if (next >= bItems.length) { setBroadcastActive(false); return 0; }
                            return next;
                          });
                        }}
                        style={{ border: "1px solid #2a1f12", color: "#7a6550", background: "rgba(0,0,0,0.2)" }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all tracking-wider uppercase"
                      >
                        <SkipForward size={13} />Skip
                      </button>
                      <button
                        onClick={stopBroadcast}
                        style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", background: "rgba(239,68,68,0.06)" }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs hover:bg-[rgba(239,68,68,0.12)] transition-all tracking-wider uppercase"
                      >
                        <X size={13} />Stop Broadcast
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Permanent audio element - src and play() controlled imperatively via broadcastAudioRef */}
              <audio
                ref={broadcastAudioRef}
                onEnded={() => {
                  const bItems = items.slice(0, 4);
                  setBroadcastIdx(prev => {
                    const next = prev + 1;
                    if (next >= bItems.length) { setBroadcastActive(false); return 0; }
                    return next;
                  });
                }}
                onError={() => {
                  const bItems = items.slice(0, 4);
                  setBroadcastIdx(prev => {
                    const next = prev + 1;
                    if (next >= bItems.length) { setBroadcastActive(false); return 0; }
                    return next;
                  });
                }}
                style={{ display: "none" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-24 gap-5">
              <div style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.15)" }} className="w-16 h-16 rounded-2xl flex items-center justify-center">
                <Loader2 size={24} style={{ color: "#c9963a" }} className="animate-spin" />
              </div>
              <div className="text-center">
                <p style={{ color: "#c9963a" }} className="text-sm font-medium tracking-wider mb-1">Searching the archives...</p>
                <p style={{ color: "#3a2d1e" }} className="text-xs tracking-wide">Querying the Library of Congress</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results grid */}
        {!loading && items.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((item, i) => (
              <motion.div
                key={item.id || i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  onClick={() => openDocument(item)}
                  className="card-glow w-full text-left rounded-2xl p-5 flex flex-col gap-4 group transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div
                      style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.15)", boxShadow: "0 0 16px rgba(201,150,58,0.04)" }}
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:border-[rgba(201,150,58,0.3)] transition-all"
                    >
                      <Newspaper size={18} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                    </div>
                    <span
                      style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.5)" }}
                      className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
                    >
                      {item.date ? formatDate(item.date).split(",")[1]?.trim() || formatDate(item.date) : "Archive"}
                    </span>
                  </div>

                  <div className="flex-1">
                    <h3 style={{ color: "#f2ead8" }} className="text-base font-semibold mb-1 tracking-wide leading-snug group-hover:text-[#e8d8b0] transition-colors">
                      {formatTitle(item.title, item.newspaper)}
                    </h3>
                    {item.newspaper && (
                      <p style={{ color: "#c9963a" }} className="text-[10px] tracking-[0.2em] uppercase mb-2 opacity-80">
                        {toTitleCase(item.newspaper.replace(/\s*\([^)]*\)\s*/g, "").replace(/\s*\d{4}[-\u2013]\d{0,4}\??$/, "").trim())}
                      </p>
                    )}
                    {(item.city || item.state) && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <MapPin size={10} style={{ color: "#3a2d1e" }} />
                        <span style={{ color: "#7a6550" }} className="text-xs">{[item.city, item.state].filter(Boolean).map(toTitleCase).join(", ")}</span>
                        {item.date && (
                          <>
                            <span style={{ color: "#2a1f12" }}>·</span>
                            <Calendar size={10} style={{ color: "#3a2d1e" }} />
                            <span style={{ color: "#7a6550" }} className="text-xs font-mono">{formatDate(item.date)}</span>
                          </>
                        )}
                      </div>
                    )}
                    {item.ocr_eng && !looksLikeOCRGarbage(item.ocr_eng) ? (
                      <p style={{ color: "#4a3c2c" }} className="text-sm leading-relaxed line-clamp-2">
                        {item.ocr_eng.slice(0, 140)}...
                      </p>
                    ) : (
                      <p style={{ color: "#3a2d1e" }} className="text-xs leading-relaxed">
                        {(() => {
                          const paper = item.newspaper ? formatTitle(item.title, item.newspaper) : null;
                          const year = item.date ? item.date.slice(0, 4) : null;
                          const place = [item.city, item.state].filter(Boolean).map(toTitleCase).join(", ");
                          const era = year ? (parseInt(year) < 1860 ? "Printed in an era of hand-set type and penny press." : parseInt(year) < 1900 ? "Printed in the age of the telegraph and steam press." : "Printed in the early age of mass media.") : "A piece of the historical record.";
                          return `${paper ? `A page from the ${paper}${year ? ", " + year : ""}${place ? ", " + place : ""}. ` : year ? `${year} newsprint${place ? " from " + place : ""}. ` : ""}${era} ElevenLabs will narrate the original text.`;
                        })()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Volume2 size={12} style={{ color: "#c9963a" }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span style={{ color: "#c9963a" }} className="text-xs font-medium tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-all inline-block">
                      Hear inline
                    </span>
                    <span style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.4)" }} className="opacity-0 group-hover:opacity-100 transition-all text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={8} /> Real source
                    </span>
                  </div>
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && searched && items.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-24 gap-4">
            <div style={{ background: "rgba(42,31,18,0.4)", border: "1px solid #2a1f12" }} className="w-16 h-16 rounded-2xl flex items-center justify-center">
              <Compass size={24} style={{ color: "#4a3c2c" }} strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p style={{ color: "#7a6550" }} className="text-sm mb-1">No documents found for that search.</p>
              <p style={{ color: "#3a2d1e" }} className="text-xs">Try - war, invention, freedom, election...</p>
            </div>
          </motion.div>
        )}

        {!searched && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-12 flex items-center gap-3 justify-center">
            <div style={{ height: "1px", width: "32px", background: "#2a1f12" }} />
            <p style={{ color: "#3a2d1e" }} className="text-[10px] tracking-[0.3em] uppercase">Library of Congress - Chronicling America</p>
            <div style={{ height: "1px", width: "32px", background: "#2a1f12" }} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
