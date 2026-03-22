"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, Download } from "lucide-react";

interface Props {
  audioUrl: string;
  title?: string;
  textLength?: number;
  onCharIndex?: (idx: number) => void;
}

export default function AudioPlayer({ audioUrl, title, textLength, onCharIndex }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, [audioUrl]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }

  function restart() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
    setPlaying(true);
  }

  function skip(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    setProgress((audio.currentTime / audio.duration) * 100 || 0);
    if (onCharIndex && textLength && audio.duration) {
      onCharIndex(Math.round((audio.currentTime / audio.duration) * textLength));
    }
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
  }

  function handleEnded() {
    setPlaying(false);
    setProgress(100);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const val = parseFloat(e.target.value);
    audio.currentTime = (val / 100) * audio.duration;
    setProgress(val);
  }

  function handleWaveformClick(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio * 100);
    setCurrentTime(audio.currentTime);
    if (!playing) {
      audio.play();
      setPlaying(true);
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const bars = Array.from({ length: 36 });

  return (
    <div className="card-glow rounded-2xl p-5 w-full">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <div className="flex items-center gap-2 mb-4">
        <Volume2 size={13} style={{ color: "#c9963a" }} />
        {title && (
          <span style={{ color: "#7a6550" }} className="text-[10px] tracking-[0.2em] uppercase truncate flex-1">
            {title}
          </span>
        )}
        {!title && <span className="flex-1" />}
        {playing && (
          <span
            style={{ color: "#c9963a", border: "1px solid rgba(201,150,58,0.3)", background: "rgba(201,150,58,0.08)" }}
            className="text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full"
          >
            Live
          </span>
        )}
      </div>

      {/* Clickable waveform */}
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
                background: filled
                  ? "linear-gradient(to top, #a07028, #e8b95a)"
                  : "#2a1f12",
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
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={progress}
        onChange={handleSeek}
        className="w-full mb-4"
        style={{ accentColor: "#c9963a", cursor: "pointer" }}
      />

      {/* Controls row */}
      <div className="flex items-center justify-between">
        <span style={{ color: "#6a5840" }} className="text-xs font-mono w-10">
          {formatTime(currentTime)}
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={restart}
            style={{ color: "#6a5840" }}
            className="hover:text-[#c9963a] transition-colors p-1"
            title="Restart"
          >
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
            style={{
              background: "linear-gradient(135deg, #d4a042 0%, #b07828 100%)",
              color: "#0d0a06",
              boxShadow: "0 2px 12px rgba(201,150,58,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
            className="w-11 h-11 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            {playing ? (
              <Pause size={17} strokeWidth={2.5} />
            ) : (
              <Play size={17} strokeWidth={2.5} fill="currentColor" />
            )}
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
          {duration > 0 ? formatTime(duration) : "--:--"}
        </span>
      </div>

      {/* Save button */}
      <div className="mt-4 pt-4" style={{ borderTop: "1px solid #2a1f12" }}>
        <button
          onClick={async () => {
            try {
              const res = await fetch(audioUrl);
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${title || "narration"}.mp3`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              window.open(audioUrl, "_blank");
            }
          }}
          style={{
            border: "1px solid #2a1f12",
            color: "#7a6550",
            background: "#1a1207",
          }}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs tracking-wider uppercase hover:border-[#c9963a]/40 hover:text-[#c9963a] transition-all"
        >
          <Download size={13} />
          Save Audio (.mp3)
        </button>
      </div>
    </div>
  );
}
