import { type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { question, documentText, documentTitle } = await request.json();

    if (!question?.trim() || !documentText?.trim()) {
      return Response.json({ answer: "Please provide both a question and a document." }, { status: 400 });
    }

    const systemPrompt = `You are a knowledgeable historian and expert on historical documents. You have been given the following historical document to study:

Title: ${documentTitle || "Historical Document"}

Document text:
${documentText.slice(0, 1500)}

Answer the user's question based on this document and your broader historical knowledge. Be concise (2-4 sentences), authoritative, and speak as a historian would. Do not say you are an AI. Do not repeat the question back. Give a direct, informative answer.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Groq error:", err);
      throw new Error("Groq API failed");
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || "I was unable to find an answer to that question in the historical record.";

    return Response.json({ answer });
  } catch (err) {
    console.error("Answer route error:", err);
    return Response.json({
      answer: "The historical record is silent on this matter. Please try rephrasing your question.",
    });
  }
}
