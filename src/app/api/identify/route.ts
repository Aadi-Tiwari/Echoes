export async function POST(request: Request) {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = await request.json();
    if (!imageBase64) {
      return Response.json({ error: "imageBase64 is required" }, { status: 400 });
    }

    // Convert base64 to binary buffer
    const binary = Buffer.from(imageBase64, "base64");

    // Use HuggingFace BLIP image captioning via new router endpoint
    const hfRes = await fetch(
      "https://router.huggingface.co/hf-inference/models/Salesforce/blip-image-captioning-large",
      {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: binary,
      }
    );

    if (!hfRes.ok) {
      const text = await hfRes.text();
      // Model may be loading (503) - give a friendly message
      if (hfRes.status === 503) {
        return Response.json(
          { error: "Model is warming up, please try again in 10 seconds." },
          { status: 503 }
        );
      }
      throw new Error(`HuggingFace error ${hfRes.status}: ${text}`);
    }

    const result = await hfRes.json();
    // BLIP returns: [{ generated_text: "a person holding a pair of white earbuds" }]
    const caption: string = Array.isArray(result)
      ? result[0]?.generated_text ?? ""
      : result?.generated_text ?? "";

    if (!caption) {
      return Response.json({ error: "Could not identify object" }, { status: 422 });
    }

    // Strip leading "a " or "an " prefix since we add it ourselves
    const label = caption
      .replace(/^(a|an)\s+/i, "")
      .trim()
      .toLowerCase();

    return Response.json({ label });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[identify] error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
