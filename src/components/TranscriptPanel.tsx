"use client";

import { useEffect, useRef } from "react";
import { FileText } from "lucide-react";

interface Props {
  text: string;
  charIndex: number;
  title?: string;
}

// Split text into sentences for per-sentence highlighting
function splitSentences(text: string): { sentence: string; start: number }[] {
  const result: { sentence: string; start: number }[] = [];
  const re = /[^.!?]+[.!?]+|[^.!?]+$/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    result.push({ sentence: match[0], start: match.index });
  }
  return result;
}

export default function TranscriptPanel({ text, charIndex, title }: Props) {
  const sentences = splitSentences(text);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);

  // Find which sentence is currently active
  let activeSentenceIdx = 0;
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (sentences[i].start <= charIndex) {
      activeSentenceIdx = i;
      break;
    }
  }

  // Auto-scroll the active sentence into view
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeSentenceIdx]);

  return (
    <div
      style={{
        background: "linear-gradient(160deg, #161009 0%, #0f0b05 100%)",
        border: "1px solid #2a1f12",
        boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
      className="rounded-2xl flex flex-col overflow-hidden h-full"
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-5 py-3.5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(42,31,18,0.7)" }}
      >
        <div
          style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.15)" }}
          className="w-7 h-7 rounded-lg flex items-center justify-center"
        >
          <FileText size={13} style={{ color: "#c9963a" }} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ color: "#f2ead8" }} className="text-xs font-semibold tracking-wide truncate">
            {title || "Transcript"}
          </p>
          <p style={{ color: "#3a2d1e" }} className="text-[9px] tracking-[0.25em] uppercase">
            Live narration
          </p>
        </div>
        {/* Progress pip */}
        <div
          style={{
            width: "28px",
            height: "4px",
            background: "#1e1608",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${text.length > 0 ? Math.min(100, (charIndex / text.length) * 100) : 0}%`,
              height: "100%",
              background: "linear-gradient(to right, #a07028, #e8b95a)",
              borderRadius: "2px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Scrollable transcript */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ scrollBehavior: "smooth" }}
      >
        <p style={{ lineHeight: "1.9", fontSize: "0.8rem" }} className="select-text">
          {sentences.length > 0 ? (
            sentences.map((s, i) => {
              const isPast = i < activeSentenceIdx;
              const isActive = i === activeSentenceIdx && charIndex > 0;
              const isFuture = i > activeSentenceIdx;

              let color = "#4a3c2c";
              if (isActive) color = "#e8d5a0";
              else if (isPast) color = "#6a5840";
              else if (isFuture) color = "#3a2d1e";

              return (
                <span
                  key={i}
                  ref={isActive ? activeRef : undefined}
                  style={{
                    color,
                    transition: "color 0.3s ease",
                    background: isActive ? "rgba(201,150,58,0.18)" : "transparent",
                    borderRadius: "3px",
                    padding: isActive ? "0 3px" : "0",
                    boxShadow: isActive ? "0 0 14px rgba(201,150,58,0.25)" : "none",
                    textDecorationLine: isActive ? "underline" : "none",
                    textDecorationColor: isActive ? "rgba(201,150,58,0.6)" : "transparent",
                    textUnderlineOffset: "3px",
                  }}
                >
                  {s.sentence}
                </span>
              );
            })
          ) : (
            <span style={{ color: "#3a2d1e" }}>No transcript available.</span>
          )}
        </p>
      </div>

      {/* Footer ornament */}
      <div
        className="flex items-center gap-3 px-5 py-2.5 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(42,31,18,0.5)" }}
      >
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, rgba(42,31,18,0.8), transparent)" }} />
        <span style={{ color: "#2a1f12" }} className="text-[8px] tracking-[0.35em] uppercase">Echoes</span>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, rgba(42,31,18,0.8), transparent)" }} />
      </div>
    </div>
  );
}
