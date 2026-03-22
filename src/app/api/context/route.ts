import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");

  if (!query) {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

  try {
    // Search Wikipedia for the topic
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json&origin=*`,
      { next: { revalidate: 3600 } }
    );
    const searchData = await searchRes.json();
    const titles: string[] = searchData[1] || [];

    if (titles.length === 0) {
      return Response.json({ context: "", summary: "" });
    }

    // Get summary of best match
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titles[0])}`,
      { next: { revalidate: 3600 } }
    );
    const summaryData = await summaryRes.json();

    const context = summaryData.extract || "";
    const thumbnail = summaryData.thumbnail?.source || null;

    return Response.json({
      context: context.slice(0, 600),
      title: summaryData.title || titles[0],
      thumbnail,
      url: summaryData.content_urls?.desktop?.page || null,
    });
  } catch (err) {
    console.error("Context fetch error:", err);
    return Response.json({ context: "", summary: "" });
  }
}
