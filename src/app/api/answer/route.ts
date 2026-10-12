export async function POST(request: Request) {
  try {
    const { question, documentText, documentTitle } = (await request.json().catch(() => ({}))) || {};

    if (typeof question !== "string" || !question.trim() ||
        typeof documentText !== "string" || !documentText.trim()) {
      return Response.json({ answer: "Please provide both a question and a document." }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return Response.json({ answer: "Document questions are unavailable right now. You can still read and listen to the document." }, { status: 503 });
    }

    const systemPrompt = `You are a knowledgeable historian and expert on historical documents. You have been given the following historical document to study:

Title: ${documentTitle || "Historical Document"}

Document text:
${documentText.slice(0, 1500)}

Answer the user's question based on this document and your broader historical knowledge. Be concise (2-4 sentences), authoritative, and speak as a historian would. Do not say you are an AI. Do not repeat the question back. Give a direct, informative answer.`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_completion_tokens: 2048,
        reasoning_effort: "low",
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      throw new Error("Groq API failed");
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("Groq returned an empty answer");

    return Response.json({ answer });
  } catch {
    return Response.json({
      answer: "Document questions are temporarily unavailable. Please try again.",
    }, { status: 502 });
  }
}
