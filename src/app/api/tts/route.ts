import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { type NextRequest } from "next/server";

const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json();
    if (!text?.trim()) return new Response("Missing text", { status: 400 });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return new Response("ElevenLabs API key not configured", { status: 500 });

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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[tts] error:", message);
    return new Response("TTS generation failed", { status: 500 });
  }
}
