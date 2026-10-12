
function mapItem(item: Record<string, unknown>) {
  const descArr = Array.isArray(item.description) ? item.description as string[] : [];
  const ocrText = descArr.join(" ").slice(0, 800);
  const rawTitle = typeof item.title === "string" ? item.title : "Historical Document";
  const date = typeof item.date === "string" ? item.date : "";
  const imgArr = Array.isArray(item.image_url) ? item.image_url as string[] : [];
  const thumbnail = imgArr[0]?.split("#")[0] || null;
  const newspaper = typeof item.partof_title === "string"
    ? item.partof_title
    : Array.isArray(item.partof_title)
    ? (item.partof_title as string[])[0]
    : "";

  return {
    id: item.id || item.url,
    title: rawTitle,
    date,
    url: typeof item.url === "string" ? item.url : "",
    ocr_eng: ocrText,
    city: Array.isArray(item.location_city)
      ? (item.location_city as string[])[0]
      : (item.location_city as string) || "",
    state: Array.isArray(item.location_state)
      ? (item.location_state as string[])[0]
      : (item.location_state as string) || "",
    newspaper,
    thumbnail,
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("query") || "history";
  const page = params.get("page") || "1";

  try {
    // Fetch 3x more results so we can diversify across newspapers/cities
    const url = `https://www.loc.gov/search/?q=${encodeURIComponent(query)}&fo=json&at=results&c=36&fa=original_format:newspaper&sp=${page}`;

    const res = await fetch(url, {
      next: { revalidate: 1800 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return Response.json({ error: "The archive service is unavailable. Please try again later." }, { status: 502 });
    }

    const data = await res.json();
    const allItems = (data.results || []).map(mapItem);
    const totalItems = (data.pagination as Record<string, unknown>)?.total || allItems.length;

    // Deduplicate: keep at most 2 results per unique newspaper title,
    // ensuring results feel diverse rather than all from one source.
    const seenNewspaper = new Map<string, number>();
    const diverse: typeof allItems = [];

    for (const item of allItems) {
      const key = item.newspaper.toLowerCase().trim() || item.city.toLowerCase().trim() || "unknown";
      const count = seenNewspaper.get(key) ?? 0;
      if (count < 2) {
        diverse.push(item);
        seenNewspaper.set(key, count + 1);
      }
      if (diverse.length >= 12) break;
    }

    // If dedup left us short, fill from remaining - still cap at 3 per newspaper
    if (diverse.length < 12) {
      for (const item of allItems) {
        if (!diverse.find((d: (typeof allItems)[number]) => d.id === item.id)) {
          const key = item.newspaper.toLowerCase().trim() || item.city.toLowerCase().trim() || "unknown";
          const count = seenNewspaper.get(key) ?? 0;
          if (count < 3) {
            diverse.push(item);
            seenNewspaper.set(key, count + 1);
          }
          if (diverse.length >= 12) break;
        }
      }
    }

    return Response.json({ items: diverse, totalItems });
  } catch {
    return Response.json({ error: "The archive service could not be reached. Please try again later." }, { status: 502 });
  }
}
