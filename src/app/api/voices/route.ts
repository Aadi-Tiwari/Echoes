import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return Response.json({ voices: [] });

    const client = new ElevenLabsClient({ apiKey });
    const data = await client.voices.getAll();

    const voices = (data.voices ?? [])
      .filter(v => v.category === "premade" || v.category === "professional")
      .map(v => ({
        voice_id: v.voiceId,
        name: v.name ?? "Unknown",
        category: v.category ?? "premade",
        labels: v.labels ?? {},
      }))
      .sort((a, b) => {
        const aScore = a.labels?.use_case?.includes("narration") ? 0 : a.labels?.use_case?.includes("news") ? 1 : 2;
        const bScore = b.labels?.use_case?.includes("narration") ? 0 : b.labels?.use_case?.includes("news") ? 1 : 2;
        if (aScore !== bScore) return aScore - bScore;
        return a.name.localeCompare(b.name);
      });

    return Response.json({ voices });
  } catch {
    return Response.json({ voices: [] });
  }
}
