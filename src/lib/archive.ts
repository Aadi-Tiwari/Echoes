export interface ArchiveItem {
  id: string;
  title: string;
  text: string;
  type: "document" | "heirloom" | "discover";
  savedAt: number;
}

const KEY = "echoes_archive";

function read(): ArchiveItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: ArchiveItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function saveToArchive(item: Omit<ArchiveItem, "id" | "savedAt">): ArchiveItem {
  const items = read();
  const newItem: ArchiveItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: Date.now(),
  };
  write([newItem, ...items]);
  return newItem;
}

export function getArchive(): ArchiveItem[] {
  return read();
}

export function removeFromArchive(id: string): void {
  write(read().filter((item) => item.id !== id));
}

export function isInArchive(title: string): boolean {
  return read().some((item) => item.title === title);
}
