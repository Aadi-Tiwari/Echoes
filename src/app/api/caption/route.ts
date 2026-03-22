import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Singleton - model loads once and stays cached for the server lifetime
let captionerPromise: Promise<(path: string) => Promise<Array<{ generated_text: string }>>> | null = null;

function getCaptioner() {
  if (!captionerPromise) {
    captionerPromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      return await pipeline("image-to-text", "Xenova/vit-gpt2-image-captioning") as (
        path: string
      ) => Promise<Array<{ generated_text: string }>>;
    })();
  }
  return captionerPromise;
}

export async function POST(req: NextRequest) {
  let tempPath: string | null = null;

  try {
    const { image } = await req.json();
    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Transformers.js in Node.js can't read data URLs - write to a temp file instead
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    tempPath = join(tmpdir(), `echoes-caption-${Date.now()}.jpg`);
    writeFileSync(tempPath, buffer);

    const captioner = await getCaptioner();
    const result = await captioner(tempPath);
    const caption = result?.[0]?.generated_text?.trim() ?? "";

    if (!caption) {
      return NextResponse.json({ error: "Could not identify object" }, { status: 422 });
    }

    return NextResponse.json({ caption });
  } catch (e) {
    console.error("Caption error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Caption failed" },
      { status: 500 }
    );
  } finally {
    // Clean up temp file
    if (tempPath) {
      try { unlinkSync(tempPath); } catch {}
    }
  }
}
