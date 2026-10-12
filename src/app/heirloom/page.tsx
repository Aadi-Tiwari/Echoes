"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Loader2, Clock, Camera, X, Crosshair, Share2, Check, Sparkles, ArrowRight, Archive, Download } from "lucide-react";
import { useArchive } from "@/hooks/useArchive";
import AudioPlayer from "@/components/AudioPlayer";
import BrowserAudioPlayer from "@/components/BrowserAudioPlayer";
import TranscriptPanel from "@/components/TranscriptPanel";
import { isBrowserTTSMode, browserSpeak, browserStop } from "@/lib/browserTTS";
import { selectVoice, type VoiceSelection } from "@/lib/voiceSelect";

const USE_BROWSER_TTS = isBrowserTTSMode();

const EXAMPLES = [
  "a wooden rocking chair",
  "a pocket watch",
  "a cast iron pan",
  "a vinyl record player",
  "a compass",
  "a typewriter",
  "a glass medicine bottle",
  "a brass telescope",
];

const FEATURES = [
  { label: "AI Vision", desc: "Camera identification" },
  { label: "Wikipedia Research", desc: "Full history traced" },
  { label: "Timeline", desc: "Key moments visualized" },
];

interface ContextData {
  context: string;
  title: string;
  thumbnail: string | null;
}

interface TimelineEvent {
  year: string;
  yearNum: number;
  sentence: string;
}

function parseTimeline(text: string): TimelineEvent[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const events: TimelineEvent[] = [];
  const seen = new Set<number>();
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (sentence.length < 20) continue;
    const yearMatch = sentence.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
    if (yearMatch) {
      const yearNum = parseInt(yearMatch[1]);
      if (!seen.has(yearNum)) { seen.add(yearNum); events.push({ year: yearMatch[1], yearNum, sentence }); }
      continue;
    }
    const centuryMatch = sentence.match(/the\s+(\d{1,2})(st|nd|rd|th)\s+century/i);
    if (centuryMatch) {
      const approx = (parseInt(centuryMatch[1]) - 1) * 100 + 50;
      if (!seen.has(approx)) {
        seen.add(approx);
        events.push({ year: `${centuryMatch[1]}${centuryMatch[2]} c.`, yearNum: approx, sentence });
      }
    }
  }
  return events.sort((a, b) => a.yearNum - b.yearNum).slice(0, 7);
}

function HeirloomInner() {
  const searchParams   = useSearchParams();
  const prefillObject  = searchParams.get("object") || "";

  const [objectName,     setObjectName]     = useState(prefillObject);
  const [loading,        setLoading]        = useState(false);
  const [audioUrl,       setAudioUrl]       = useState<string | null>(null);
  const [browserText,    setBrowserText]    = useState<string | null>(null);
  const [narrationScript,setNarrationScript]= useState<string | null>(null);
  const [contextData,    setContextData]    = useState<ContextData | null>(null);
  const [timeline,       setTimeline]       = useState<TimelineEvent[]>([]);
  const [error,          setError]          = useState<string | null>(null);
  const [copied,         setCopied]         = useState(false);
  const [narrationCharIdx, setNarrationCharIdx] = useState(0);
  const { save } = useArchive();
  const [saved, setSaved] = useState(false);
  const [voiceSelection, setVoiceSelection] = useState<VoiceSelection | null>(null);
  const [playingTimelineIdx, setPlayingTimelineIdx] = useState<number | null>(null);
  const [timelineAudioLoadingIdx, setTimelineAudioLoadingIdx] = useState<number | null>(null);
  const timelineAudioRef = useRef<HTMLAudioElement | null>(null);

  const [cameraOpen,  setCameraOpen]  = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detecting,   setDetecting]   = useState(false);
  const [modelLoading,setModelLoading]= useState(false);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (prefillObject) handleTrace();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrace = useCallback(async () => {
    const name = objectName.trim() || prefillObject.trim();
    if (!name) return;
    // Stop any playing timeline audio before new trace
    if (timelineAudioRef.current) { timelineAudioRef.current.pause(); timelineAudioRef.current = null; }
    if (USE_BROWSER_TTS) browserStop();
    setPlayingTimelineIdx(null); setTimelineAudioLoadingIdx(null);
    setLoading(true); setError(null); setAudioUrl(null); setBrowserText(null);
    setNarrationScript(null); setContextData(null); setTimeline([]);
    try {
      const ctx     = await fetch(`/api/context?query=${encodeURIComponent(name)}`);
      const ctxData: ContextData = await ctx.json();
      setContextData(ctxData);
      setTimeline(parseTimeline(ctxData.context || ""));
      const heirloomText = buildHeirloomNarration(name, ctxData.context, ctxData.title);
      setNarrationScript(heirloomText);
      // Select voice based on object name + context
      const vs = selectVoice(name, ctxData.context || "");
      setVoiceSelection(vs);
      if (USE_BROWSER_TTS) {
        setBrowserText(heirloomText);
      } else {
        const res = await fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: heirloomText, title: `The History of ${name}`, context: "", voiceId: vs.voiceId }),
        });
        if (!res.ok) {
          setBrowserText(heirloomText);
        } else {
          setAudioUrl(URL.createObjectURL(await res.blob()));
        }
      }
      window.dispatchEvent(new CustomEvent("echoes:context", {
        detail: { title: `The History of ${name}`, context: ctxData.context || "" }
      }));
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setLoading(false); }
  }, [objectName, prefillObject]);

  async function playTimelineEvent(idx: number, sentence: string) {
    // Stop current audio first
    if (timelineAudioRef.current) {
      timelineAudioRef.current.pause();
      timelineAudioRef.current = null;
    }
    // Toggle off if same dot clicked while playing
    if (playingTimelineIdx === idx) {
      setPlayingTimelineIdx(null);
      if (USE_BROWSER_TTS) browserStop();
      return;
    }
    setTimelineAudioLoadingIdx(idx);
    try {
      if (USE_BROWSER_TTS) {
        setPlayingTimelineIdx(idx);
        setTimelineAudioLoadingIdx(null);
        browserSpeak(sentence, undefined, () => setPlayingTimelineIdx(null));
      } else {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sentence, voiceId: voiceSelection?.voiceId }),
        });
        if (!res.ok) throw new Error("TTS failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        timelineAudioRef.current = audio;
        setPlayingTimelineIdx(idx);
        audio.onended = () => {
          setPlayingTimelineIdx(null);
          URL.revokeObjectURL(url);
          timelineAudioRef.current = null;
        };
        audio.play();
      }
    } catch {
      setPlayingTimelineIdx(null);
    } finally {
      setTimelineAudioLoadingIdx(null);
    }
  }

  function buildHeirloomNarration(name: string, context: string, _wikiTitle: string): string {
    const parts: string[] = [`The history of ${name}.`];
    if (context) {
      parts.push(`What you hold, or what sits before you, carries centuries of human ingenuity.`, context);
    } else {
      parts.push(
        `This object, seemingly ordinary, is the product of countless generations of refinement.`,
        `Long before you came to possess it, craftspeople, inventors, and everyday people shaped its form.`,
      );
    }
    parts.push(
      `Every scratch, every worn edge, every imperfection is a marker of time - of hands that came before yours.`,
      `Objects do not simply exist. They carry history. And now, this piece of that history is yours.`,
    );
    return parts.join(" ");
  }

  function handleShare() {
    const url = new URL(window.location.href);
    url.pathname = "/heirloom";
    url.searchParams.set("object", objectName);
    navigator.clipboard.writeText(url.toString()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function handleSave() {
    if (saved) return;
    save({
      type: "heirloom",
      title: objectName,
      context: contextData?.context || "",
      thumbnail: contextData?.thumbnail || null,
      timeline,
    });
    setSaved(true);
    window.dispatchEvent(new CustomEvent("echoes:saved"));
  }

  function handleDownloadHeirloom() {
    const lines = [
      `The History of ${objectName}`,
      "",
      narrationScript || "",
      "",
      timeline.length > 0 ? "--- Timeline ---" : "",
      ...timeline.map(e => `${e.year}: ${e.sentence}`),
    ].filter(l => l !== null);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${objectName.replace(/\s+/g, "-")}-history.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function openCamera() {
    setCameraOpen(true); setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { setCameraError("Camera access denied. Please allow camera permission."); }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false); setCameraError(null);
  }

  async function detectObject() {
    if (!videoRef.current || !canvasRef.current) return;
    setDetecting(true); setModelLoading(true);
    try {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) { setCameraError("Camera not ready yet. Please wait a moment and try again."); return; }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available.");
      ctx.drawImage(video, 0, 0);
      const scale = Math.min(1, 512 / canvas.width);
      const small = document.createElement("canvas");
      small.width = Math.round(canvas.width * scale);
      small.height = Math.round(canvas.height * scale);
      small.getContext("2d")?.drawImage(canvas, 0, 0, small.width, small.height);
      const imageDataUrl = small.toDataURL("image/jpeg", 0.8);
      setModelLoading(true);
      const res = await fetch("/api/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      setModelLoading(false);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Identification failed"); }
      const { caption } = await res.json();
      if (caption) { setObjectName(caption); closeCamera(); }
      else setCameraError("Could not identify the object. Try better lighting or move closer.");
    } catch (e) { setCameraError(e instanceof Error ? e.message : "Detection failed. Try again."); }
    finally { setDetecting(false); setModelLoading(false); }
  }

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timelineAudioRef.current) { timelineAudioRef.current.pause(); timelineAudioRef.current = null; }
    if (USE_BROWSER_TTS) browserStop();
  }, []);

  const hasResult = audioUrl || browserText;

  return (
    <div className="relative overflow-hidden">
      {/* ── HERO ──────────────────────────────────────────────────── */}
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
          {/* Ornament */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div style={{ background: "linear-gradient(to right, transparent, rgba(201,150,58,0.5))", height: "1px", width: "80px" }} />
            <span style={{ color: "#5a4a38" }} className="text-[10px] tracking-[0.5em] uppercase flex items-center gap-2">
              <Package size={9} /> The Heirloom
            </span>
            <div style={{ background: "linear-gradient(to left, transparent, rgba(201,150,58,0.5))", height: "1px", width: "80px" }} />
          </div>

          {/* Big title */}
          <h1
            style={{
              color: "#f2ead8",
              textShadow: "0 0 80px rgba(201,150,58,0.18), 0 0 160px rgba(201,150,58,0.08)",
              letterSpacing: "0.12em",
            }}
            className="text-6xl md:text-8xl font-bold uppercase mb-5 leading-none"
          >
            The Heirloom
          </h1>

          {/* Gold tagline */}
          <p
            style={{ color: "#c9963a", textShadow: "0 0 30px rgba(201,150,58,0.3)" }}
            className="text-base md:text-lg tracking-[0.25em] uppercase font-light mb-5"
          >
            Every object has a story.
          </p>

          <p style={{ color: "#7a6550" }} className="max-w-md mx-auto text-sm leading-loose mb-8">
            Describe any everyday object you own or see around you. Echoes traces its full history -
            from first invention to cultural evolution - and narrates it back to you.
          </p>

          {/* Feature pills */}
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

      {/* ── CONTENT ───────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        {error && (
          <div role="alert" style={{ background: "rgba(200,50,50,0.07)", border: "1px solid rgba(200,50,50,0.2)", color: "#f87171" }} className="rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}
        <AnimatePresence mode="wait">
          {!hasResult ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              {/* Object input card - same anatomy as dashboard cards */}
              <div className="card-glow rounded-2xl overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(42,31,18,0.8)" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ background: "rgba(201,150,58,0.12)", border: "1px solid rgba(201,150,58,0.2)", boxShadow: "0 0 16px rgba(201,150,58,0.07)" }} className="w-11 h-11 rounded-xl flex items-center justify-center">
                      <Package size={19} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p style={{ color: "#f2ead8" }} className="text-sm font-semibold tracking-wide">Your Object</p>
                      <p style={{ color: "#c9963a" }} className="text-[10px] tracking-[0.2em] uppercase opacity-80">Describe what you have</p>
                    </div>
                  </div>
                  <span style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.5)" }} className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full">
                    Object History
                  </span>
                </div>

                {/* Input */}
                <div className="p-6">
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="e.g. a wooden rocking chair, a compass, a pocket watch..."
                      value={objectName}
                      onChange={e => setObjectName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleTrace()}
                      style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(42,31,18,0.9)", color: "#f0e8d8" }}
                      className="flex-1 px-4 py-3 rounded-xl text-sm placeholder:text-[#3a2d1e] outline-none focus:border-[#c9963a]/40 transition-colors"
                    />
                    <button onClick={openCamera} title="Identify with AI camera" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(42,31,18,0.9)", color: "#7a6550" }} className="px-3.5 rounded-xl hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all flex items-center">
                      <Camera size={17} />
                    </button>
                  </div>
                  <p style={{ color: "#3a2d1e" }} className="text-xs tracking-wide">Or use the camera to identify your object with AI.</p>
                </div>

                {/* CTA */}
                <div className="px-6 pb-6">
                  <button
                    onClick={handleTrace}
                    disabled={!objectName.trim() || loading}
                    style={{
                      background: objectName.trim() && !loading ? "linear-gradient(135deg, #d4a042 0%, #b07828 100%)" : "#1e1608",
                      color: objectName.trim() && !loading ? "#0d0a06" : "#3a2d1e",
                      boxShadow: objectName.trim() && !loading ? "0 2px 16px rgba(201,150,58,0.35), inset 0 1px 0 rgba(255,255,255,0.12)" : "none",
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed"
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin" />Tracing its history...</> : <><Clock size={16} />Trace Its History</>}
                  </button>
                </div>
              </div>

              {/* Examples */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ color: "#3a2d1e" }} className="text-[10px] uppercase tracking-[0.4em]">Try these</span>
                  <div style={{ background: "linear-gradient(to right, rgba(42,31,18,0.6), transparent)", height: "1px" }} className="flex-1" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex, i) => (
                    <motion.button
                      key={ex}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.04 }}
                      onClick={() => setObjectName(ex)}
                      style={{ border: "1px solid #2a1f12", color: "#7a6550", background: "rgba(26,18,7,0.6)" }}
                      className="text-xs px-3 py-1.5 rounded-full hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all capitalize tracking-wide"
                    >
                      {ex}
                    </motion.button>
                  ))}
                </div>
              </div>

            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              {/* Object result - same card anatomy */}
              <div className="card-glow rounded-2xl overflow-hidden">
                <div style={{ height: "2px", background: "linear-gradient(to right, transparent, #c9963a, transparent)" }} />
                <div className="p-5 flex items-start gap-4">
                  {contextData?.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={contextData.thumbnail} alt={objectName} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" style={{ boxShadow: "0 0 0 1px rgba(201,150,58,0.2), 0 4px 16px rgba(0,0,0,0.4)" }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p style={{ color: "#c9963a" }} className="text-[9px] tracking-[0.35em] uppercase">Object History</p>
                      <div style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)", color: "#c9963a" }} className="px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase flex items-center gap-1">
                        <Sparkles size={8} /><span>AI Traced</span>
                      </div>
                    </div>
                    <h2 style={{ color: "#f2ead8" }} className="text-lg font-semibold capitalize mb-1 tracking-wide">{objectName}</h2>
                    {contextData?.context && <p style={{ color: "#7a6550" }} className="text-xs leading-relaxed">{contextData.context.slice(0, 200)}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={handleShare} title="Copy share link" style={{ border: "1px solid #2a1f12", color: copied ? "#c9963a" : "#5a4a38", background: copied ? "rgba(201,150,58,0.08)" : "transparent" }} className="p-2 rounded-xl hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all">
                      {copied ? <Check size={14} /> : <Share2 size={14} />}
                    </button>
                    <button onClick={handleSave} title={saved ? "Saved" : "Save to archive"} style={{ border: "1px solid #2a1f12", color: saved ? "#c9963a" : "#5a4a38", background: saved ? "rgba(201,150,58,0.08)" : "transparent" }} className="p-2 rounded-xl hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all flex items-center gap-1">
                      {saved ? <><Check size={14} /></> : <><Archive size={14} /></>}
                    </button>
                    <button onClick={handleDownloadHeirloom} title="Download as text" style={{ border: "1px solid #2a1f12", color: "#5a4a38", background: "transparent" }} className="p-2 rounded-xl hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {timeline.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-glow rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(42,31,18,0.8)" }}>
                    <div style={{ background: "rgba(201,150,58,0.12)", border: "1px solid rgba(201,150,58,0.2)", boxShadow: "0 0 16px rgba(201,150,58,0.07)" }} className="w-11 h-11 rounded-xl flex items-center justify-center">
                      <Clock size={19} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p style={{ color: "#f2ead8" }} className="text-sm font-semibold tracking-wide">Historical Timeline</p>
                      <p style={{ color: "#c9963a" }} className="text-[10px] tracking-[0.2em] uppercase opacity-80">{timeline.length} key moments - click any to hear</p>
                    </div>
                  </div>
                  <div className="px-6 py-5 overflow-x-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#2a1f12 transparent" }}>
                    <div className="flex items-start min-w-max relative" style={{ paddingBottom: "8px" }}>
                      {/* Horizontal connecting line */}
                      <div style={{
                        position: "absolute",
                        top: "22px",
                        left: "32px",
                        right: "32px",
                        height: "1px",
                        background: "linear-gradient(to right, rgba(201,150,58,0.5), rgba(201,150,58,0.15))",
                      }} />
                      {timeline.map((event, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                          className="flex flex-col items-center relative"
                          style={{ width: "150px", flexShrink: 0, paddingTop: "4px", cursor: "pointer" }}
                          onClick={() => playTimelineEvent(i, event.sentence)}
                          title="Click to hear this moment"
                        >
                          {/* Year badge */}
                          <span style={{ color: playingTimelineIdx === i ? "#22c55e" : "#c9963a", background: playingTimelineIdx === i ? "rgba(34,197,94,0.08)" : "rgba(201,150,58,0.08)", border: playingTimelineIdx === i ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(201,150,58,0.25)", zIndex: 1 }}
                            className="text-[9px] font-mono tracking-wide px-2 py-0.5 rounded mb-2.5">
                            {event.year}
                          </span>
                          {/* Dot */}
                          <div style={{
                            background: playingTimelineIdx === i ? "#22c55e" : timelineAudioLoadingIdx === i ? "#f59e0b" : i === 0 ? "#c9963a" : "rgba(201,150,58,0.4)",
                            boxShadow: playingTimelineIdx === i ? "0 0 12px rgba(34,197,94,0.8), 0 0 24px rgba(34,197,94,0.3)" : timelineAudioLoadingIdx === i ? "0 0 12px rgba(245,158,11,0.6)" : i === 0 ? "0 0 12px rgba(201,150,58,0.7), 0 0 24px rgba(201,150,58,0.3)" : "0 0 6px rgba(201,150,58,0.2)",
                            width: i === 0 ? "12px" : "8px", height: i === 0 ? "12px" : "8px",
                            borderRadius: "50%", zIndex: 1,
                          }} className={playingTimelineIdx === i ? "animate-pulse" : ""} />
                          {/* Text */}
                          <p style={{ color: playingTimelineIdx === i ? "#22c55e" : timelineAudioLoadingIdx === i ? "#f59e0b" : i === 0 ? "#a89070" : "#5a4a38" }}
                            className="text-[10px] text-center mt-3 px-2 leading-relaxed">
                            {timelineAudioLoadingIdx === i ? <Loader2 size={10} className="inline animate-spin mr-1" /> : null}
                            {event.sentence.slice(0, 80)}{event.sentence.length > 80 ? "..." : ""}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Now Playing divider */}
              <div className="flex items-center gap-4">
                <div style={{ background: "linear-gradient(to right, transparent, rgba(201,150,58,0.4))", height: "1px" }} className="flex-1" />
                <span style={{ color: "#c9963a" }} className="text-[9px] tracking-[0.5em] uppercase">Now Playing</span>
                <div style={{ background: "linear-gradient(to left, transparent, rgba(201,150,58,0.4))", height: "1px" }} className="flex-1" />
              </div>

              {/* Voice type badge */}
              {voiceSelection && (
                <div className="flex items-center gap-2">
                  <span style={{ color: "#3a2d1e" }} className="text-[9px] tracking-[0.4em] uppercase">Voice</span>
                  <span style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)", color: "#c9963a" }} className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full">
                    {voiceSelection.voiceLabel}
                  </span>
                  <span style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.4)" }} className="text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-full">
                    {voiceSelection.docType}
                  </span>
                </div>
              )}

              {/* Audio + Transcript side-by-side */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch">
                <div className="md:w-[45%] flex-shrink-0">
                  {browserText
                    ? <BrowserAudioPlayer
                        text={browserText}
                        title={`The History of ${objectName}`}
                        autoPlay
                        onCharIndex={setNarrationCharIdx}
                      />
                    : audioUrl
                      ? <AudioPlayer audioUrl={audioUrl} title={`The History of ${objectName}`} />
                      : null}
                </div>
                <div className="flex-1 min-h-[320px] md:min-h-0">
                  <TranscriptPanel
                    text={narrationScript || ""}
                    charIndex={USE_BROWSER_TTS ? narrationCharIdx : 0}
                    title={`The History of ${objectName}`}
                  />
                </div>
              </div>

              <button onClick={() => { setAudioUrl(null); setBrowserText(null); setNarrationScript(null); setContextData(null); setTimeline([]); setObjectName(""); setError(null); setSaved(false); }} style={{ color: "#5a4a38" }} className="flex items-center gap-2 text-sm hover:text-[#c9963a] transition-colors">
                <ArrowRight size={13} style={{ transform: "rotate(180deg)" }} />Try another object
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Camera overlay */}
      <AnimatePresence>
        {cameraOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card-glow w-full max-w-md rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(42,31,18,0.8)" }}>
                <div className="flex items-center gap-2.5">
                  <div style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }} className="w-7 h-7 rounded-lg flex items-center justify-center">
                    <Crosshair size={13} style={{ color: "#c9963a" }} />
                  </div>
                  <span style={{ color: "#f0e8d8" }} className="text-sm font-semibold">Identify Your Object</span>
                </div>
                <button onClick={closeCamera} style={{ color: "#6a5840" }} className="hover:text-[#f0e8d8] transition-colors"><X size={18} /></button>
              </div>
              <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
                {cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center px-6 text-center"><p style={{ color: "#f87171" }} className="text-sm">{cameraError}</p></div>
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {detecting && <div className="scan-line" />}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div style={{ border: "2px solid rgba(201,150,58,0.55)", borderRadius: "14px" }} className="w-48 h-48" />
                    </div>
                  </>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="px-5 py-4 space-y-3">
                <p style={{ color: "#5a4a38" }} className="text-xs text-center tracking-wide">{modelLoading ? "Running AI model - first use takes ~30s to load..." : "Center your object and tap Identify"}</p>
                <button onClick={detectObject} disabled={detecting || !!cameraError} style={{ background: !detecting && !cameraError ? "linear-gradient(135deg, #d4a042 0%, #b07828 100%)" : "#1e1608", color: !detecting && !cameraError ? "#0d0a06" : "#3a2d1e", boxShadow: !detecting && !cameraError ? "0 2px 16px rgba(201,150,58,0.3)" : "none" }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed">
                  {detecting ? <><Loader2 size={16} className="animate-spin" />{modelLoading ? "Loading AI..." : "Identifying..."}</> : <><Crosshair size={16} />Identify Object</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HeirloomPage() {
  return <Suspense><HeirloomInner /></Suspense>;
}
