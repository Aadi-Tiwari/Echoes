"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, ChevronDown, Download, FileText, Loader2, Mic2 } from "lucide-react";

interface ElevenVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}

interface Props {
  text: string;
  title?: string;
  autoPlay?: boolean;
  onCharIndex?: (idx: number) => void;
}

export default function BrowserAudioPlayer({ text, title, autoPlay, onCharIndex }: Props) {
  const [voices, setVoices] = useState<ElevenVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<ElevenVoice | null>(null);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Cache blob URLs per voice_id so we don't regenerate on every play/pause
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const didAutoPlay = useRef(false);

  // Load ElevenLabs voices on mount
  useEffect(() => {
    fetch("/api/voices")
      .then(r => r.json())
      .then(data => {
        const list: ElevenVoice[] = data.voices ?? [];
        setVoices(list);
        setSelectedVoice(prev => prev ?? list[0] ?? null);
      })
      .catch(() => {});
  }, []);

  // Wire up HTML5 audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const d = audio.duration;
      const t = audio.currentTime;
      setCurrentTime(t);
      setProgress(d ? (t / d) * 100 : 0);
      if (d && onCharIndex) onCharIndex(Math.round((t / d) * text.length));
    };
    const onEnded = () => { setPlaying(false); setProgress(100); };
    const onDurationChange = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [text, onCharIndex]);

  // Clear everything when text changes
  useEffect(() => {
    audioCacheRef.current.clear();
    didAutoPlay.current = false;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setHasAudio(false);
  }, [text]);

  // Clear cached audio for old voice when voice changes, stop playback
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      audio.src = "";
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      setHasAudio(false);
    }
  }, [selectedVoice]);

  const loadAudioForVoice = useCallback(async (voiceId: string): Promise<string | null> => {
    if (audioCacheRef.current.has(voiceId)) {
      return audioCacheRef.current.get(voiceId)!;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioCacheRef.current.set(voiceId, url);
      return url;
    } catch {
      return null;
    } finally {
      setGenerating(false);
    }
  }, [text]);

  async function play(fromStart = false) {
    if (!selectedVoice) return;
    const audio = audioRef.current;
    if (!audio) return;

    // If we already have the audio loaded, just play
    if (audio.src && audioCacheRef.current.has(selectedVoice.voice_id)) {
      if (fromStart) audio.currentTime = 0;
      audio.play();
      return;
    }

    const url = await loadAudioForVoice(selectedVoice.voice_id);
    if (!url) {
      alert("Could not generate audio. Please try again.");
      return;
    }
    audio.src = url;
    setHasAudio(true);
    if (fromStart) audio.currentTime = 0;
    audio.play();
  }

  // AutoPlay once when voice list loads
  useEffect(() => {
    if (!autoPlay || !selectedVoice || didAutoPlay.current) return;
    didAutoPlay.current = true;
    setTimeout(() => play(true), 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVoice, autoPlay]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      play(false);
    }
  }

  function restart() {
    play(true);
  }

  function skip(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(parseFloat(e.target.value));
  }

  function handleWaveformClick(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  }

  function pickVoice(voice: ElevenVoice) {
    setSelectedVoice(voice);
    setShowVoicePicker(false);
  }

  async function handleSaveAudio() {
    if (!selectedVoice) return;
    setDownloading(true);
    try {
      const voiceId = selectedVoice.voice_id;
      // Reuse cached audio if already generated
      let url = audioCacheRef.current.get(voiceId);
      if (!url) {
        url = await loadAudioForVoice(voiceId) ?? undefined;
      }
      if (!url) throw new Error("No audio");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "narration"}.mp3`;
      a.click();
    } catch {
      alert("Could not generate audio file. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  function formatTime(s: number) {
    if (!s || isNaN(s) || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const bars = Array.from({ length: 36 });

  const voiceLabel = selectedVoice
    ? `${selectedVoice.name}${selectedVoice.labels?.accent ? ` - ${selectedVoice.labels.accent}` : ""}`
    : voices.length === 0 ? "Loading..." : "Select Voice";

  return (
    <div className="card-glow rounded-2xl p-5 w-full">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="none" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Volume2 size={13} style={{ color: "#c9963a" }} />
        {title ? (
          <span style={{ color: "#7a6550" }} className="text-[10px] tracking-[0.2em] uppercase truncate flex-1">
            {title}
          </span>
        ) : (
          <span className="flex-1" />
        )}

        {playing && (
          <span
            style={{ color: "#c9963a", border: "1px solid rgba(201,150,58,0.3)", background: "rgba(201,150,58,0.08)" }}
            className="text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full"
          >
            Live
          </span>
        )}

        {generating && !playing && (
          <span
            style={{ color: "#c9963a", border: "1px solid rgba(201,150,58,0.3)", background: "rgba(201,150,58,0.08)" }}
            className="text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full flex items-center gap-1"
          >
            <Loader2 size={8} className="animate-spin" /> Generating
          </span>
        )}

        {/* Voice picker */}
        <div className="relative">
          <button
            onClick={() => setShowVoicePicker(v => !v)}
            style={{ border: "1px solid #2a1f12", color: "#7a6550", background: "#1a1207" }}
            className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all tracking-wider uppercase ml-1 max-w-[140px]"
            title="Change ElevenLabs voice"
          >
            <Mic2 size={8} style={{ flexShrink: 0 }} />
            <span className="truncate">{selectedVoice?.name ?? (voices.length === 0 ? "Loading..." : "Select")}</span>
            <ChevronDown size={9} style={{ flexShrink: 0 }} />
          </button>

          {showVoicePicker && voices.length > 0 && (
            <div
              style={{
                background: "#161009",
                border: "1px solid #2a1f12",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                zIndex: 50,
              }}
              className="absolute right-0 top-8 rounded-xl w-72 max-h-64 overflow-y-auto"
            >
              <p style={{ color: "#3a2d1e" }} className="text-[9px] uppercase tracking-widest px-3 pt-3 pb-1 flex items-center gap-1">
                <Mic2 size={9} /> ElevenLabs Voices
              </p>
              {voices.map(v => {
                const isSelected = selectedVoice?.voice_id === v.voice_id;
                const accent = v.labels?.accent;
                const useCase = v.labels?.use_case;
                const description = v.labels?.description;
                return (
                  <button
                    key={v.voice_id}
                    onClick={() => pickVoice(v)}
                    style={{
                      color: isSelected ? "#c9963a" : "#7a6550",
                      background: isSelected ? "rgba(201,150,58,0.07)" : "transparent",
                    }}
                    className="w-full text-left px-3 py-2 hover:text-[#f0e8d8] hover:bg-[#1e1608] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium truncate">{v.name}</span>
                      {useCase && (
                        <span style={{ color: "#c9963a", background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }}
                          className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0">
                          {useCase.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    {(accent || description) && (
                      <p style={{ color: "#3a2d1e" }} className="text-[9px] mt-0.5 truncate">
                        {[accent, description].filter(Boolean).join(" - ")}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Waveform */}
      <div
        className="flex items-end justify-center gap-[2px] h-12 mb-3 cursor-pointer select-none rounded-lg px-1"
        style={{ background: "rgba(0,0,0,0.2)" }}
        onClick={handleWaveformClick}
        title="Click to seek"
      >
        {bars.map((_, i) => {
          const height = 14 + Math.sin(i * 0.75) * 10 + Math.cos(i * 1.4) * 6;
          const filled = progress > 0 && (i / bars.length) * 100 <= progress;
          return (
            <div
              key={i}
              style={{
                height: `${height}px`,
                background: filled ? "linear-gradient(to top, #a07028, #e8b95a)" : "#2a1f12",
                animationDelay: `${i * 0.05}s`,
                animationDuration: `${0.8 + (i % 5) * 0.15}s`,
                animation: playing ? "waveform infinite" : "none",
                boxShadow: filled && playing ? "0 0 4px rgba(201,150,58,0.3)" : "none",
              }}
              className="w-1.5 rounded-full transition-all duration-150"
            />
          );
        })}
      </div>

      {/* Scrubber */}
      <input
        type="range" min={0} max={100} step={0.1}
        value={progress} onChange={handleSeek}
        className="w-full mb-4"
        style={{ accentColor: "#c9963a", cursor: "pointer" }}
      />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <span style={{ color: "#6a5840" }} className="text-xs font-mono w-10">
          {formatTime(currentTime)}
        </span>

        <div className="flex items-center gap-3">
          <button onClick={restart} style={{ color: "#6a5840" }} className="hover:text-[#c9963a] transition-colors p-1" title="Restart">
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => skip(-5)}
            style={{ color: "#7a6550", border: "1px solid #2a1f12", background: "#1a1207" }}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all leading-none tracking-wide"
          >
            -5s
          </button>
          <button
            onClick={togglePlay}
            disabled={generating}
            style={{
              background: generating
                ? "linear-gradient(135deg, #5a4020 0%, #3a2810 100%)"
                : "linear-gradient(135deg, #d4a042 0%, #b07828 100%)",
              color: "#0d0a06",
              boxShadow: generating ? "none" : "0 2px 12px rgba(201,150,58,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
              cursor: generating ? "not-allowed" : "pointer",
            }}
            className="w-11 h-11 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            {generating
              ? <Loader2 size={17} className="animate-spin" style={{ color: "#c9963a" }} />
              : playing
                ? <Pause size={17} strokeWidth={2.5} />
                : <Play size={17} strokeWidth={2.5} fill="currentColor" />
            }
          </button>
          <button
            onClick={() => skip(5)}
            style={{ color: "#7a6550", border: "1px solid #2a1f12", background: "#1a1207" }}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all leading-none tracking-wide"
          >
            +5s
          </button>
        </div>

        <span style={{ color: "#6a5840" }} className="text-xs font-mono w-10 text-right">
          {formatTime(duration)}
        </span>
      </div>

      {/* Save */}
      <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: "1px solid #2a1f12" }}>
        <button
          onClick={() => {
            const blob = new Blob([text], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `${title || "narration"}.txt`; a.click();
            URL.revokeObjectURL(url);
          }}
          style={{ border: "1px solid #2a1f12", color: "#7a6550", background: "#1a1207" }}
          className="flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-xs tracking-wider uppercase hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all"
        >
          <FileText size={13} /> Save Transcript
        </button>
        <button
          onClick={handleSaveAudio}
          disabled={downloading || generating}
          style={{
            border: "1px solid #2a1f12",
            color: (downloading || generating) ? "#3a2d1e" : "#7a6550",
            background: "#1a1207",
            cursor: (downloading || generating) ? "not-allowed" : "pointer",
          }}
          className="flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-xs tracking-wider uppercase hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all"
        >
          {(downloading || generating) ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          {downloading ? "Saving..." : generating ? "Generating..." : "Save Audio"}
        </button>
      </div>

      {/* ElevenLabs badge */}
      <p style={{ color: "#2a1f12" }} className="text-center text-[8px] tracking-widest uppercase mt-3">
        Powered by ElevenLabs AI Voice
      </p>
    </div>
  );
}
