"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Mic, FileText, Loader2, Send, Camera, X,
  ScanText, Share2, Check, MessageSquare, ArrowRight, Languages,
  Archive, Download, Mic2,
} from "lucide-react";
import { useArchive } from "@/hooks/useArchive";
import AudioPlayer from "@/components/AudioPlayer";
import BrowserAudioPlayer from "@/components/BrowserAudioPlayer";
import TranscriptPanel from "@/components/TranscriptPanel";
import { isBrowserTTSMode } from "@/lib/browserTTS";
import { looksLikeOCRGarbage } from "@/lib/ocrUtils";
import { selectVoice, type VoiceSelection } from "@/lib/voiceSelect";

const USE_BROWSER_TTS = isBrowserTTSMode();

interface ContextData {
  context: string;
  title: string;
  thumbnail: string | null;
  url: string | null;
}

const FEATURES = [
  { label: "OCR Scan", desc: "Camera or image upload" },
  { label: "AI Narration", desc: "Document narration" },
  { label: "Ask Questions", desc: "Live archive Q&A" },
];

function SpeakInner() {
  const searchParams = useSearchParams();
  const prefillText  = searchParams.get("text")  || "";
  const prefillTitle = searchParams.get("title") || "";

  const [text,        setText]        = useState(prefillText);
  const [title,       setTitle]       = useState(prefillTitle);
  const [loading,     setLoading]     = useState(false);
  const [audioUrl,    setAudioUrl]    = useState<string | null>(null);
  const [browserText, setBrowserText] = useState<string | null>(null);
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [question,    setQuestion]    = useState("");
  const [qaLoading,   setQaLoading]   = useState(false);
  const [qaItems,     setQaItems]     = useState<{ id: number; question: string; audioUrl?: string; browserText?: string }[]>([]);
  const [copied,      setCopied]      = useState(false);
  const [langMode,    setLangMode]    = useState<"original" | "english">("original");
  const [narrationCharIdx, setNarrationCharIdx] = useState(0);
  const [narrationText,    setNarrationText]    = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { save } = useArchive();
  const [saved, setSaved] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSelection, setVoiceSelection] = useState<VoiceSelection | null>(null);

  function openConvAI() {
    try {
      const el = document.querySelector("elevenlabs-convai") as (HTMLElement & { shadowRoot: ShadowRoot | null }) | null;
      if (!el) return;
      if (el.shadowRoot) {
        const btn = el.shadowRoot.querySelector("button") as HTMLButtonElement | null;
        if (btn) { btn.click(); return; }
      }
      el.click();
    } catch { /* silent fail - widget button still visible in corner */ }
  }

  async function translateToEnglish(input: string): Promise<string> {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(input.slice(0, 500))}`;
      const res = await fetch(url);
      const data = await res.json();
      // data[0] is an array of [translated_chunk, original_chunk, ...]
      const translated = (data[0] as [string, string][]).map(item => item[0]).join("");
      if (translated) return translated;
    } catch { /* fall back to original */ }
    return input;
  }

  const [cameraOpen,  setCameraOpen]  = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning,    setScanning]    = useState(false);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleNarrate = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true); setError(null); setAudioUrl(null);
    setNarrationCharIdx(0); setNarrationText("");
    setBrowserText(null); setContextData(null); setQaItems([]);
    try {
      let ctxData: ContextData = { context: "", title: title || "", thumbnail: null, url: null };
      try {
        const ctx = await fetch(`/api/context?query=${encodeURIComponent(title || text.slice(0, 60))}`);
        if (ctx.ok) ctxData = await ctx.json();
      } catch { /* optional */ }
      setContextData(ctxData);

      const narrateText = langMode === "english" ? await translateToEnglish(text) : text;

      // Don't speak OCR garbage - if the text is mostly unreadable, omit it
      // and let the narration rely on the Wikipedia context instead.
      const safeText = looksLikeOCRGarbage(narrateText) ? "" : narrateText;
      setNarrationText(safeText || "");

      // Select voice based on document content
      const vs = selectVoice(title || ctxData.title || "", safeText || ctxData.context || "");
      setVoiceSelection(vs);

      if (USE_BROWSER_TTS) {
        const narrationText = [
          title || ctxData.title ? `${(title || ctxData.title).slice(0, 80)}.` : "",
          ctxData.context ? ctxData.context.slice(0, 150) : "",
          safeText.slice(0, 400),
        ].filter(Boolean).join(" ");
        setBrowserText(narrationText);
      } else {
        const finalText = safeText || ctxData.context || title || "";
        setNarrationText(finalText);
        const res = await fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: finalText, title: title || ctxData.title || "", context: ctxData.context || "", voiceId: vs.voiceId }),
        });
        if (!res.ok) {
          setBrowserText(finalText);
        } else {
          const blob = await res.blob();
          if (blob.size === 0) throw new Error("Audio could not be generated. Please try again.");
          setAudioUrl(URL.createObjectURL(blob));
        }
      }
      // Dispatch context to ConvAI widget
      window.dispatchEvent(new CustomEvent("echoes:context", {
        detail: { title: title || ctxData.title || "Historical Document", context: ctxData.context || safeText.slice(0, 400) }
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  }, [text, title, langMode]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    setLoading(true); setError(null);
    try {
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const raw = data.text.trim();
      const cleanRes = await fetch("/api/clean-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw }),
      });
      const { cleaned } = await cleanRes.json();
      const finalText = cleaned && !cleaned.includes("[No readable text found]") ? cleaned : raw;
      setText(finalText);
      setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch { setError("Failed to extract text from image"); }
    finally { setLoading(false); }
  }, []);

  const handleAskQuestion = useCallback(async () => {
    if (!question.trim() || !text) return;
    const askedQuestion = question;
    setQaLoading(true); setQuestion("");
    const id = Date.now();
    try {
      // Get a real LLM answer from Groq
      const answerRes = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: askedQuestion,
          documentText: text,
          documentTitle: title || contextData?.title || "",
        }),
      });
      const { answer } = await answerRes.json();
      if (!answerRes.ok) throw new Error(answer || "Document questions are unavailable.");
      if (typeof answer !== "string" || !answer.trim()) throw new Error("No answer was returned. Please try again.");
      const answerText = answer;

      if (USE_BROWSER_TTS) {
        setQaItems(prev => [...prev, { id, question: askedQuestion, browserText: answerText }]);
      } else {
        const res = await fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: answerText, title: `Answer: ${askedQuestion}`, context: "", voiceId: voiceSelection?.voiceId }),
        });
        if (!res.ok) {
          setQaItems(prev => [...prev, { id, question: askedQuestion, browserText: answerText }]);
        } else {
          const blob = await res.blob();
          setQaItems(prev => [...prev, { id, question: askedQuestion, audioUrl: URL.createObjectURL(blob) }]);
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to answer"); }
    finally { setQaLoading(false); }
  }, [question, text, title, contextData]);

  function handleShare() {
    const url = new URL(window.location.href);
    url.pathname = "/speak";
    url.searchParams.set("title", title.slice(0, 120));
    url.searchParams.set("text", text.slice(0, 800));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSave() {
    if (saved) return;
    save({
      type: "document",
      title: title || contextData?.title || "Untitled Document",
      text: text.slice(0, 500),
      context: contextData?.context || "",
      thumbnail: contextData?.thumbnail || null,
    });
    setSaved(true);
    window.dispatchEvent(new CustomEvent("echoes:saved"));
  }

  function handleVoiceInput() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Voice input not supported in this browser. Use Chrome for best results."); return; }
    setIsListening(true);
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      setQuestion(e.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }

  function handleDownload() {
    const blob = new Blob([text, "\n\n---\n\n", contextData?.context || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "echoes-document").replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function openCamera() {
    setCameraOpen(true); setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { setCameraError("Camera access denied. Please allow camera permission and try again."); }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false); setCameraError(null);
  }

  async function scanDocument() {
    if (!videoRef.current || !canvasRef.current) return;
    setScanning(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Canvas empty")), "image/png"));
      const file = new File([blob], "camera-scan.png", { type: "image/png" });
      closeCamera();
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const extracted = data.text.trim();
      if (!extracted) { setError("No text detected. Make sure the document is well-lit and clearly visible."); return; }
      const cleanRes = await fetch("/api/clean-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extracted }),
      });
      const { cleaned } = await cleanRes.json();
      const finalText = cleaned && !cleaned.includes("[No readable text found]") ? cleaned : extracted;
      setText(finalText); setTitle("Scanned Document");
    } catch (e) { setError(e instanceof Error ? e.message : "Scan failed. Try again."); }
    finally { setScanning(false); }
  }

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const hasResult = audioUrl || browserText;

  return (
    <div className="relative overflow-hidden">
      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
        {/* Stronger page glow behind hero */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(201,150,58,0.09) 0%, transparent 65%)",
          }}
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
              <FileText size={9} /> Archive Mode
            </span>
            <div style={{ background: "linear-gradient(to left, transparent, rgba(201,150,58,0.5))", height: "1px", width: "80px" }} />
          </div>

          {/* Big title */}
          <h1
            style={{
              color: "#f2ead8",
              textShadow: "0 0 80px rgba(201,150,58,0.18), 0 0 160px rgba(201,150,58,0.08)",
              letterSpacing: "0.15em",
            }}
            className="text-5xl md:text-7xl font-bold uppercase mb-5 leading-none"
          >
            Archive Mode
          </h1>

          {/* Gold tagline */}
          <p
            style={{ color: "#c9963a", textShadow: "0 0 30px rgba(201,150,58,0.3)" }}
            className="text-base md:text-lg tracking-[0.25em] uppercase font-light mb-5"
          >
            Make History Speak
          </p>

          {/* Description */}
          <p style={{ color: "#7a6550" }} className="max-w-md mx-auto text-sm leading-loose mb-8">
            Paste any historical document - a letter, newspaper, speech, diary entry.
            Echoes narrates it with full context, then lets you question the archive.
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
        <AnimatePresence>
          {!hasResult && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              {/* Document input card */}
              <div className="card-glow rounded-2xl overflow-hidden">
                {/* Card header row - same anatomy as dashboard cards */}
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(42,31,18,0.8)" }}>
                  <div className="flex items-center gap-3">
                    <div
                      style={{ background: "rgba(201,150,58,0.12)", border: "1px solid rgba(201,150,58,0.2)", boxShadow: "0 0 16px rgba(201,150,58,0.07)" }}
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                    >
                      <FileText size={19} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p style={{ color: "#f2ead8" }} className="text-sm font-semibold tracking-wide">Your Document</p>
                      <p style={{ color: "#c9963a" }} className="text-[10px] tracking-[0.2em] uppercase opacity-80">Paste or upload any text</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {wordCount > 0 && (
                      <span style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.6)" }} className="text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-full">
                        {wordCount} words
                      </span>
                    )}
                    <span style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.5)" }} className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full">
                      Upload & Narrate
                    </span>
                  </div>
                </div>

                {/* Inputs */}
                <div className="p-6 space-y-3">
                  <input
                    type="text"
                    placeholder="Document title (optional)"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(42,31,18,0.9)", color: "#f0e8d8" }}
                    className="w-full px-4 py-2.5 rounded-xl text-sm placeholder:text-[#3a2d1e] outline-none focus:border-[#c9963a]/40 transition-colors"
                  />
                  <textarea
                    placeholder="Paste the text of any historical document - a letter, newspaper article, speech, diary entry, telegram..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={8}
                    style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(42,31,18,0.9)", color: "#f0e8d8", resize: "vertical" }}
                    className="w-full px-4 py-3 rounded-xl text-sm placeholder:text-[#3a2d1e] outline-none focus:border-[#c9963a]/40 transition-colors font-mono leading-relaxed"
                  />
                </div>

                {/* Action row */}
                <div className="px-6 pb-6 space-y-3" style={{ borderTop: "1px solid rgba(42,31,18,0.5)", paddingTop: "16px" }}>
                  {/* Language toggle */}
                  <div className="flex items-center gap-2">
                    <Languages size={12} style={{ color: "#5a4a38" }} />
                    <span style={{ color: "#5a4a38" }} className="text-[10px] tracking-[0.2em] uppercase">Narrate in</span>
                    <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid #2a1f12" }}>
                      <button
                        onClick={() => setLangMode("original")}
                        style={{
                          background: langMode === "original" ? "rgba(201,150,58,0.15)" : "rgba(0,0,0,0.2)",
                          color: langMode === "original" ? "#c9963a" : "#5a4a38",
                          borderRight: "1px solid #2a1f12",
                        }}
                        className="px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase transition-all"
                      >
                        Original
                      </button>
                      <button
                        onClick={() => setLangMode("english")}
                        style={{
                          background: langMode === "english" ? "rgba(201,150,58,0.15)" : "rgba(0,0,0,0.2)",
                          color: langMode === "english" ? "#c9963a" : "#5a4a38",
                        }}
                        className="px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase transition-all"
                      >
                        English
                      </button>
                    </div>
                    {langMode === "english" && (
                      <span style={{ color: "#3a2d1e", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.4)" }} className="text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-full">
                        auto-translated
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => fileInputRef.current?.click()} style={{ border: "1px solid #2a1f12", color: "#7a6550", background: "rgba(0,0,0,0.2)" }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all tracking-wider uppercase">
                      <Upload size={12} /> Upload
                    </button>
                    <button onClick={openCamera} style={{ border: "1px solid #2a1f12", color: "#7a6550", background: "rgba(0,0,0,0.2)" }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all tracking-wider uppercase">
                      <Camera size={12} /> Scan
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />

                    {/* CTA */}
                    <button
                      onClick={handleNarrate}
                      disabled={!text.trim() || loading}
                      style={{
                        background: text.trim() && !loading ? "linear-gradient(135deg, #d4a042 0%, #b07828 100%)" : "#1e1608",
                        color: text.trim() && !loading ? "#0d0a06" : "#3a2d1e",
                        boxShadow: text.trim() && !loading ? "0 2px 16px rgba(201,150,58,0.35), inset 0 1px 0 rgba(255,255,255,0.12)" : "none",
                      }}
                      className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed"
                    >
                      {loading
                        ? <><Loader2 size={14} className="animate-spin" />{langMode === "english" ? "Translating..." : "Processing..."}</>
                        : <><Mic size={14} />Make it Speak</>}
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div role="alert" style={{ background: "rgba(200,50,50,0.07)", border: "1px solid rgba(200,50,50,0.2)", color: "#f87171" }} className="rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {hasResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              {/* Now playing ornament */}
              <div className="flex items-center gap-4">
                <div style={{ background: "linear-gradient(to right, transparent, rgba(201,150,58,0.4))", height: "1px" }} className="flex-1" />
                <span style={{ color: "#c9963a" }} className="text-[9px] tracking-[0.5em] uppercase">Now Playing</span>
                <div style={{ background: "linear-gradient(to left, transparent, rgba(201,150,58,0.4))", height: "1px" }} className="flex-1" />
              </div>

              {/* Voice type badge */}
              {voiceSelection && (
                <div className="flex items-center gap-2">
                  <span style={{ color: "#3a2d1e" }} className="text-[9px] tracking-[0.4em] uppercase">Voice</span>
                  <span style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)", color: "#c9963a" }} className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <Mic2 size={8} />{voiceSelection.voiceLabel}
                  </span>
                  <span style={{ color: "#5a4a38", border: "1px solid #2a1f12", background: "rgba(42,31,18,0.4)" }} className="text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-full">
                    {voiceSelection.docType}
                  </span>
                </div>
              )}

              {/* Context card */}
              {contextData?.context && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-glow rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    {contextData.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={contextData.thumbnail} alt={contextData.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" style={{ boxShadow: "0 0 0 1px rgba(201,150,58,0.15)" }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p style={{ color: "#c9963a" }} className="text-[9px] tracking-[0.35em] uppercase mb-1">Historical Context</p>
                      <p style={{ color: "#f0e8d8" }} className="text-sm font-semibold mb-2">{contextData.title}</p>
                      <p style={{ color: "#7a6550" }} className="text-xs leading-relaxed">{contextData.context.slice(0, 280)}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Audio + Transcript side-by-side */}
              <div className="relative">
                <div className="absolute -top-3 right-2 z-10 flex items-center gap-2">
                  <button onClick={handleShare} style={{ border: "1px solid #2a1f12", color: copied ? "#c9963a" : "#6a5840", background: copied ? "rgba(201,150,58,0.08)" : "#161009" }} className="flex items-center gap-1.5 text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all">
                    {copied ? <Check size={10} /> : <Share2 size={10} />}{copied ? "Copied!" : "Share"}
                  </button>
                  <button onClick={handleSave} style={{ border: "1px solid #2a1f12", color: saved ? "#c9963a" : "#6a5840", background: saved ? "rgba(201,150,58,0.08)" : "#161009" }} className="flex items-center gap-1.5 text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all">
                    {saved ? <><Check size={10} />Saved</> : <><Archive size={10} />Save</>}
                  </button>
                  <button onClick={handleDownload} style={{ border: "1px solid #2a1f12", color: "#6a5840", background: "#161009" }} className="flex items-center gap-1.5 text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all">
                    <Download size={10} />Export
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-stretch">
                  {/* Left: player */}
                  <div className="md:w-[45%] flex-shrink-0">
                    {browserText
                      ? <BrowserAudioPlayer
                          text={browserText}
                          title={title || contextData?.title || "Historical Narration"}
                          autoPlay
                          onCharIndex={setNarrationCharIdx}
                        />
                      : audioUrl
                        ? <AudioPlayer audioUrl={audioUrl} title={title || contextData?.title || "Historical Narration"} textLength={narrationText.length} onCharIndex={setNarrationCharIdx} />
                        : null}
                  </div>
                  {/* Right: transcript - only in browser TTS mode */}
                  {browserText && (
                    <div className="flex-1 min-h-[320px] md:min-h-0">
                      <TranscriptPanel
                        text={browserText || ""}
                        charIndex={narrationCharIdx}
                        title={title || contextData?.title || "Transcript"}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ElevenLabs ConvAI voice agent banner */}
              <div style={{ background: "linear-gradient(135deg, rgba(201,150,58,0.07) 0%, rgba(42,31,18,0.3) 100%)", border: "1px solid rgba(201,150,58,0.2)", boxShadow: "0 0 40px rgba(201,150,58,0.04)" }} className="rounded-2xl p-4 flex items-center gap-4">
                <div style={{ background: "rgba(201,150,58,0.12)", border: "1px solid rgba(201,150,58,0.25)", boxShadow: "0 0 20px rgba(201,150,58,0.08)" }} className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mic2 size={18} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ color: "#f2ead8" }} className="text-sm font-semibold tracking-wide mb-0.5">Live Voice Conversation</p>
                  <p style={{ color: "#7a6550" }} className="text-xs leading-relaxed">Ask follow-up questions about the selected document using your voice.</p>
                </div>
                <button
                  onClick={openConvAI}
                  style={{ background: "linear-gradient(135deg, #d4a042 0%, #b07828 100%)", color: "#0d0a06", boxShadow: "0 2px 16px rgba(201,150,58,0.35), inset 0 1px 0 rgba(255,255,255,0.12)", flexShrink: 0 }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap hover:opacity-90"
                >
                  <Mic2 size={13} />Open Voice Agent
                </button>
              </div>

              {/* Q&A card */}
              <div className="card-glow rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(42,31,18,0.8)" }}>
                  <div style={{ background: "rgba(201,150,58,0.12)", border: "1px solid rgba(201,150,58,0.2)", boxShadow: "0 0 16px rgba(201,150,58,0.07)" }} className="w-11 h-11 rounded-xl flex items-center justify-center">
                    <MessageSquare size={19} style={{ color: "#c9963a" }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p style={{ color: "#f2ead8" }} className="text-sm font-semibold tracking-wide">Ask the Archive</p>
                    <p style={{ color: "#c9963a" }} className="text-[10px] tracking-[0.2em] uppercase opacity-80">Each question gets a narrated response</p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="What happened after this was written?"
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAskQuestion()}
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(42,31,18,0.9)", color: "#f0e8d8" }}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm placeholder:text-[#3a2d1e] outline-none focus:border-[#c9963a]/40 transition-colors"
                    />
                    <button
                      onClick={handleVoiceInput}
                      disabled={isListening || qaLoading}
                      title={isListening ? "Listening..." : "Speak your question"}
                      style={{
                        background: isListening ? "rgba(201,150,58,0.15)" : "rgba(0,0,0,0.25)",
                        border: isListening ? "1px solid rgba(201,150,58,0.5)" : "1px solid rgba(42,31,18,0.9)",
                        color: isListening ? "#c9963a" : "#7a6550",
                      }}
                      className="px-3 py-2.5 rounded-xl transition-all disabled:cursor-not-allowed flex items-center"
                    >
                      <Mic2 size={16} className={isListening ? "animate-pulse" : ""} />
                    </button>
                    <button
                      onClick={handleAskQuestion}
                      disabled={!question.trim() || qaLoading}
                      style={{
                        background: question.trim() && !qaLoading ? "linear-gradient(135deg, #d4a042 0%, #b07828 100%)" : "#1e1608",
                        color: question.trim() && !qaLoading ? "#0d0a06" : "#3a2d1e",
                        boxShadow: question.trim() && !qaLoading ? "0 2px 12px rgba(201,150,58,0.25)" : "none",
                      }}
                      className="px-4 py-2.5 rounded-xl transition-all disabled:cursor-not-allowed"
                    >
                      {qaLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                  {qaLoading && (
                    <div className="mt-3 flex items-center gap-2">
                      <Loader2 size={12} style={{ color: "#c9963a" }} className="animate-spin" />
                      <span style={{ color: "#5a4a38" }} className="text-xs tracking-wide">The archive is responding...</span>
                    </div>
                  )}
                  {qaItems.length > 0 && (
                    <div className="mt-5 space-y-4" style={{ borderTop: "1px solid #2a1f12", paddingTop: "16px" }}>
                      {[...qaItems].reverse().map((item, idx) => (
                        <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div style={{ color: "#c9963a", background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }} className="px-2 py-0.5 rounded text-[10px] tracking-wider uppercase flex-shrink-0">
                              Q{qaItems.length - idx}
                            </div>
                            <p style={{ color: "#f0e8d8" }} className="text-xs truncate">{item.question}</p>
                          </div>
                          {item.browserText
                            ? <BrowserAudioPlayer text={item.browserText} title={`Response to: ${item.question.slice(0, 40)}${item.question.length > 40 ? "..." : ""}`} autoPlay={idx === 0} />
                            : item.audioUrl ? <AudioPlayer audioUrl={item.audioUrl} title={`Response to: ${item.question.slice(0, 40)}${item.question.length > 40 ? "..." : ""}`} /> : null}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button onClick={() => { setAudioUrl(null); setBrowserText(null); setContextData(null); setQaItems([]); setText(""); setTitle(""); setError(null); setSaved(false); }} style={{ color: "#5a4a38" }} className="flex items-center gap-2 text-sm hover:text-[#c9963a] transition-colors">
                <ArrowRight size={13} style={{ transform: "rotate(180deg)" }} />Try another document
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Camera overlay */}
      <AnimatePresence>
        {cameraOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card-glow w-full max-w-lg rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(42,31,18,0.8)" }}>
                <div className="flex items-center gap-2.5">
                  <div style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }} className="w-7 h-7 rounded-lg flex items-center justify-center">
                    <ScanText size={13} style={{ color: "#c9963a" }} />
                  </div>
                  <span style={{ color: "#f0e8d8" }} className="text-sm font-semibold">Scan Document</span>
                </div>
                <button onClick={closeCamera} style={{ color: "#6a5840" }} className="hover:text-[#f0e8d8] transition-colors"><X size={18} /></button>
              </div>
              <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
                {cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center px-8 text-center"><p style={{ color: "#f87171" }} className="text-sm">{cameraError}</p></div>
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {scanning && <div className="scan-line" />}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div style={{ border: "2px solid rgba(201,150,58,0.6)", borderRadius: "6px" }} className="w-4/5 h-4/5" />
                      <div className="absolute top-[10%] left-[10%] w-5 h-5 border-t-2 border-l-2" style={{ borderColor: "#c9963a" }} />
                      <div className="absolute top-[10%] right-[10%] w-5 h-5 border-t-2 border-r-2" style={{ borderColor: "#c9963a" }} />
                      <div className="absolute bottom-[10%] left-[10%] w-5 h-5 border-b-2 border-l-2" style={{ borderColor: "#c9963a" }} />
                      <div className="absolute bottom-[10%] right-[10%] w-5 h-5 border-b-2 border-r-2" style={{ borderColor: "#c9963a" }} />
                    </div>
                  </>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="px-5 py-4 space-y-3">
                <p style={{ color: "#6a5840" }} className="text-xs text-center tracking-wide">Hold the document flat and well-lit, then tap Scan</p>
                <button onClick={scanDocument} disabled={scanning || !!cameraError} style={{ background: !scanning && !cameraError ? "linear-gradient(135deg, #d4a042 0%, #b07828 100%)" : "#1e1608", color: !scanning && !cameraError ? "#0d0a06" : "#3a2d1e", boxShadow: !scanning && !cameraError ? "0 2px 16px rgba(201,150,58,0.3)" : "none" }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed">
                  {scanning ? <><Loader2 size={16} className="animate-spin" />Reading text...</> : <><ScanText size={16} />Scan Document</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SpeakPage() {
  return <Suspense><SpeakInner /></Suspense>;
}
