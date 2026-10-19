export interface ArchiveEntry {
  id: string;
  type: "document" | "heirloom" | "discovery";
  title: string;
  savedAt: number;
  text?: string;
  context?: string;
  thumbnail?: string | null;
  timeline?: Array<{ year: string; yearNum: number; sentence: string }>;
}

const KEY = "echoes-archive";
const LEGACY_KEY = "echoes_archive";

function parseEntries(raw: string | null): ArchiveEntry[] {
  try {
    const entries = JSON.parse(raw || "[]");
    if (!Array.isArray(entries)) return [];
    return entries.filter((entry) => entry && typeof entry.id === "string" && typeof entry.title === "string" &&
      typeof entry.savedAt === "number" && ["document", "heirloom", "discovery", "discover"].includes(entry.type))
      .map((entry) => ({ ...entry, type: entry.type === "discover" ? "discovery" : entry.type }));
  } catch { return []; }
}

export function readArchive(storage: Storage): ArchiveEntry[] {
  const current = parseEntries(storage.getItem(KEY));
  const legacy = parseEntries(storage.getItem(LEGACY_KEY));
  if (!legacy.length) return current;
  const entries = [...current, ...legacy.filter((entry) => !current.some((saved) => saved.id === entry.id))]
    .sort((a, b) => b.savedAt - a.savedAt);
  try {
    storage.setItem(KEY, JSON.stringify(entries));
    storage.removeItem(LEGACY_KEY);
  } catch { /* Keep the legacy copy if storage is full or unavailable. */ }
  return entries;
}

export function persistArchive(storage: Storage, entries: ArchiveEntry[]) {
  storage.setItem(KEY, JSON.stringify(entries));
}
