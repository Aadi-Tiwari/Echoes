const COMMON_CAPS = new Set([
  "THAT","THIS","THEN","WITH","FROM","HAVE","BEEN","WILL","THEY","THEIR",
  "WHICH","WHAT","WHEN","YOUR","ALSO","WERE","THAN","INTO","UPON","SUCH",
  "EACH","BOTH","VERY","JUST","OVER","AFTER","SOME","MOST","ONLY","MANY",
  "LIKE","WELL","THESE","THOSE","ABOUT","WOULD","COULD","SHOULD","SAID",
  "FIRST","WHILE","STILL","EVEN","EVERY","NEVER","ALWAYS","BEFORE","DURING",
]);

// Common 2-char English words that are legitimate and should not count as "noise"
const COMMON_SHORT = new Set([
  "of","to","in","it","is","be","as","at","so","we","he","by","or","on",
  "do","if","me","my","up","an","go","no","us","am","a","i","an","he","she",
]);

// Returns true when text is mostly OCR garbage:
// stamps, letterheads, fragmented old-newspaper scans, symbol noise, etc.
export function looksLikeOCRGarbage(text: string): boolean {
  if (!text.trim()) return true;
  const tokens = text.split(/\s+/).filter(t => t.length > 0);

  // Too short to be meaningful
  if (tokens.length < 3) return true;

  const total = tokens.length;

  // Tokens with digits
  const withDigits = tokens.filter(t => /\d/.test(t));

  // Tokens with non-standard symbols
  const withSymbols = tokens.filter(t => /[^a-zA-Z0-9'\-.,!?;:]/.test(t));

  // ALL-CAPS words of 4+ chars that aren't common English
  const allCapsLong = tokens.filter(t => /^[A-Z]{4,}$/.test(t) && !COMMON_CAPS.has(t));

  // "Tiny" tokens: single chars OR 2-char combos that aren't real English words
  // e.g. "w", "e", "rd", "ae", "pg", "rs" - typical OCR fragmentation noise
  const tinyNoise = tokens.filter(t =>
    t.length === 1 ||
    (t.length === 2 && !COMMON_SHORT.has(t.toLowerCase()))
  );

  // Suspicious intra-word mixed case: "iS", "eS", "pG" (lowercase then uppercase)
  const suspiciousMixedCase = tokens.filter(t => t.length >= 2 && /[a-z][A-Z]/.test(t));

  // Repeated character runs: "nnn", "eee", "---"
  const repeatedChars = tokens.filter(t => /(.)\1{2,}/.test(t));

  // Word-like tokens: 3+ letters only (no digits/symbols)
  const wordLike = tokens.filter(t => t.length >= 3 && /^[a-zA-Z]+$/.test(t));

  const garbageRatio = (withDigits.length + withSymbols.length) / total;
  const capsRatio    = allCapsLong.length / total;
  const tinyRatio    = tinyNoise.length / total;

  return (
    garbageRatio > 0.15 ||           // too many numbers / symbols
    capsRatio > 0.25 ||              // too many unexplained ALL-CAPS clusters
    tinyRatio > 0.15 ||              // too many single-char / noise fragments
    suspiciousMixedCase.length >= 2 || // intra-word mixed case noise
    repeatedChars.length >= 1 ||     // any repeated-char run (nnn, eee)
    wordLike.length < 3              // fewer than 3 real word-like tokens
  );
}
