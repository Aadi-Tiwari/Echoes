import { type NextRequest } from "next/server";

// Heuristic pre-filter - runs before the LLM, catches obvious garbage lines.
// A line is kept only if it has at least 2 tokens that are real-word-like
// (3+ letters, no digits or symbols) AND those tokens make up at least 45% of the line.
function prefilter(raw: string): string {
  const lines = raw.split("\n");
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 4) return false;

    // Remove lines that are purely symbols / decorators
    if (/^[^a-zA-Z]+$/.test(trimmed)) return false;

    const tokens = trimmed.split(/\s+/);
    // Word-like: 3+ letters, no digits, no special chars
    const wordLike = tokens.filter((t) => /^[a-zA-Z]{3,}$/.test(t));

    // Need at least 2 real-word tokens and they must be ≥45% of all tokens
    return wordLike.length >= 2 && wordLike.length / tokens.length >= 0.45;
  });

  return kept.join("\n").trim();
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text?.trim()) return Response.json({ cleaned: text });

    // Step 1: heuristic garbage filter - no LLM needed
    const prefiltered = prefilter(text);
    if (!prefiltered) return Response.json({ cleaned: "" });

    // Step 2: LLM pass for word-level OCR corrections and paragraph formatting
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `You are an OCR correction engine. The input has already been pre-filtered to remove the worst garbage. Your job is to do final word-level fixes only:
- Fix OCR character misreads in real words (e.g. "tn"->"in", "tho"->"the", "che"->"the", "fra"->"from", "rn"->"m", "li"->"h")
- Join words broken across lines by hyphens or hard line breaks into flowing sentences
- Merge lines into clean paragraphs - new paragraph only at a real topic change
- Do NOT invent, add, or remove any content
- Do NOT add labels, headers, or explanations
- Return ONLY the corrected text`,
          },
          {
            role: "user",
            content: prefiltered.slice(0, 3000),
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      // LLM failed - return the pre-filtered text at least
      return Response.json({ cleaned: prefiltered });
    }

    const data = await res.json();
    const cleaned = data.choices?.[0]?.message?.content?.trim() || prefiltered;
    return Response.json({ cleaned });
  } catch {
    return Response.json({ cleaned: null });
  }
}
