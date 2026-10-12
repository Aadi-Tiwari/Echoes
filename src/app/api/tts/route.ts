import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { type NextRequest } from "next/server";

const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = (await request.json().catch(() => ({}))) || {};
    if (typeof text !== "string" || !text.trim() || (voiceId !== undefined && typeof voiceId !== "string")) {
      return new Response("Provide text and a valid voice ID", { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return new Response("Audio could not be generated. Use your device's voice instead.", { status: 503 });

    const client = new ElevenLabsClient({ apiKey });
    const useVoiceId = voiceId || DEFAULT_VOICE_ID;

    const audioStream = await client.textToSpeech.convert(useVoiceId, {
      text: text.slice(0, 5000),
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
    return new Response("Audio could not be generated. Use your device's voice instead.", { status: 502 });
  }
}
