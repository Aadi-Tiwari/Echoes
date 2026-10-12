import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam - documentary narrator

import { looksLikeOCRGarbage } from "@/lib/ocrUtils";

// Regex-based OCR artifact cleaner - runs synchronously as a last line of defense
// before text reaches ElevenLabs. Catches patterns that slip through the LLM clean-ocr pass:
// stray underscores, single-char insertions, broken word spacing.
function scrubOcrArtifacts(text: string): string {
  return text
    // Remove isolated single non-letter characters surrounded by spaces (e.g. "_ " "j ")
    .replace(/ [^a-zA-Z0-9] /g, " ")
    // Collapse runs of spaces
    .replace(/ {2,}/g, " ")
    // Remove trailing/leading underscores on words
    .replace(/_+/g, "")
    // Fix common OCR splits: "des uction" - but don't join legitimate spaced words
    // Only join if the gap produces a known common pattern (simple heuristic: single-char gaps)
    .replace(/\b([a-zA-Z]{2,})\s([a-zA-Z])\b/g, (_, a, b) => {
      // Only collapse if the orphaned char looks like part of a split word (rare case)
      // Leave it - too aggressive to auto-join. Just clean obvious junk above.
      return `${a} ${b}`;
    })
    .trim();
}

function buildNarrationScript(title: string, context: string, text: string): string {
  const parts: string[] = [];

  if (title) {
    parts.push(`${title.slice(0, 80)}.`);
  }

  if (context) {
    parts.push(context.slice(0, 150));
  }

  // Only include document text if it isn't OCR garbage
  if (text.trim() && !looksLikeOCRGarbage(text)) {
    parts.push(scrubOcrArtifacts(text).slice(0, 400));
  }

  const script = parts.join(" ");
  return script.slice(0, 700);
}

export async function POST(request: Request) {
  try {
    const { text, title, context, voiceId } = (await request.json().catch(() => ({}))) || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }
    if ([title, context, voiceId].some(value => value !== undefined && typeof value !== "string")) {
      return Response.json({ error: "Title, context, and voice ID must be strings." }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey === "your_key_here") {
      return Response.json(
        { error: "Audio could not be generated. Use your device's voice instead." },
        { status: 503 }
      );
    }

    const client = new ElevenLabsClient({ apiKey });
    const script = buildNarrationScript(title || "", context || "", text);

    console.log(`[narrate] script length: ${script.length} chars`);

    const audioStream = await client.textToSpeech.convert(voiceId || DEFAULT_VOICE_ID, {
      text: script,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_64",
      voiceSettings: {
        stability: 0.55,
        similarityBoost: 0.75,
      },
    });

    return new Response(audioStream as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Audio could not be generated. Use your device's voice instead." }, { status: 502 });
  }
}
