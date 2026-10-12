interface TimelineItem {
  year: string;
  city: string;
  state: string;
  newspaper: string;
}

export async function POST(request: Request) {
  try {
    const { items, query }: { items: TimelineItem[]; query: string } = (await request.json().catch(() => ({}))) || {};
    if (!Array.isArray(items) || !items.length || items.some(item => !item || typeof item !== "object") ||
        typeof query !== "string" || !query.trim()) return Response.json({ script: null }, { status: 400 });
    if (!process.env.GROQ_API_KEY) return Response.json({ script: null }, { status: 503 });

    const bulletPoints = items
      .map(it => {
        const place = [it.city, it.state].filter(Boolean).join(", ");
        const paper = it.newspaper || "an unknown publication";
        return `- ${it.year}${place ? `, ${place}` : ""}: ${paper}`;
      })
      .join("\n");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: `You are a documentary narrator writing a spoken historical timeline. You will receive a search topic and a list of real newspaper publications with their dates and locations. Write a natural, flowing 4-6 sentence narrative that:
- Opens with a broad statement about the topic's history
- Weaves through the sources chronologically, mentioning each newspaper and city naturally
- Varies sentence structure and vocabulary - never repeat the same phrasing
- Sounds like a real documentary voiceover, not a list
- Keeps each source mention brief and natural (e.g. "In 1836, New York's Herald was already documenting...")
- Ends with a closing reflection on the historical arc
Return ONLY the narration text. No labels, no headers.`,
          },
          {
            role: "user",
            content: `Topic: ${query}\n\nSources:\n${bulletPoints}`,
          },
        ],
        max_completion_tokens: 2048,
        reasoning_effort: "low",
        temperature: 0.7,
      }),
    });

    if (!res.ok) return Response.json({ script: null }, { status: 502 });
    const data = await res.json();
    const script = data.choices?.[0]?.message?.content?.trim() || null;
    return Response.json({ script }, { status: script ? 200 : 502 });
  } catch {
    return Response.json({ script: null }, { status: 502 });
  }
}
