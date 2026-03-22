let currentUtterance: SpeechSynthesisUtterance | null = null;

export function isBrowserTTSMode(): boolean {
  return process.env.NEXT_PUBLIC_BROWSER_TTS === "true";
}

export function browserSpeak(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (msg: string) => void
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onError?.("Browser TTS not supported");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text.slice(0, 3000));

  // Pick the most human-sounding available voice
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => v.lang.startsWith("en"));
  const priority = [
    "Microsoft Aria Online (Natural)", "Microsoft Jenny Online (Natural)",
    "Microsoft Guy Online (Natural)", "Microsoft Emma Online (Natural)",
    "Microsoft Brian Online (Natural)", "Samantha", "Karen", "Daniel",
    "Google US English", "Google UK English Female", "Google UK English Male",
  ];
  let best = en[0];
  for (const name of priority) {
    const match = en.find((v) => v.name === name);
    if (match) { best = match; break; }
  }
  if (best) utterance.voice = best;

  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1;

  utterance.onstart = () => onStart?.();
  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };
  utterance.onerror = (e) => {
    currentUtterance = null;
    onError?.(e.error);
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function browserStop(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false;
  return window.speechSynthesis.speaking;
}
