"use client";

import { useCallback, useEffect, useState } from "react";
import { browserSpeak, browserStop } from "@/lib/browserTTS";

interface Props {
  text: string;
  title?: string;
  autoPlay?: boolean;
  onCharIndex?: (idx: number) => void;
}

export default function BrowserAudioPlayer({ text, title, autoPlay, onCharIndex }: Props) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(() => {
    setError(null);
    onCharIndex?.(0);
    browserSpeak(text, () => setPlaying(true), () => {
      setPlaying(false);
      onCharIndex?.(Math.min(text.length, 3000));
    }, message => {
      setPlaying(false);
      if (message !== "canceled" && message !== "interrupted") {
        setError(message === "not-allowed" ? "Press Play narration to start the browser voice." : "The browser voice is unavailable on this device.");
      }
    }, onCharIndex);
  }, [text, onCharIndex]);

  useEffect(() => {
    if (autoPlay) play();
    return browserStop;
  }, [autoPlay, play]);

  function stop() {
    browserStop();
    setPlaying(false);
  }

  return (
    <div className="rounded-xl border border-[#2a1f12] bg-[#130e08] p-5 space-y-4">
      <p className="text-sm text-[#f2ead8]">{title || "Narration"}</p>
      <p className="text-xs text-[#9a8570]">Uses your device's voice.</p>
      <div className="flex gap-3">
        <button type="button" onClick={play} disabled={!text.trim()} className="rounded-lg bg-[#c9963a] px-4 py-2 text-sm text-[#130e08] disabled:opacity-50">
          {playing ? "Restart narration" : "Play narration"}
        </button>
        <button type="button" onClick={stop} disabled={!playing} className="rounded-lg border border-[#5a4a38] px-4 py-2 text-sm text-[#f2ead8] disabled:opacity-50">Stop</button>
      </div>
      {error && <p role="status" className="text-xs text-[#e7b98a]">{error}</p>}
    </div>
  );
}
