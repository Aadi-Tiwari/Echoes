"use client";

import { useCallback, useEffect, useState } from "react";

import { readArchive, persistArchive, type ArchiveEntry } from "@/lib/archive";
export type { ArchiveEntry } from "@/lib/archive";

function load(): ArchiveEntry[] {
  if (typeof window === "undefined") return [];
  try { return readArchive(localStorage); }
  catch { return []; }
}

function persist(entries: ArchiveEntry[]) {
  try { persistArchive(localStorage, entries); } catch { /* quota */ }
}

export function useArchive() {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  useEffect(() => { setEntries(load()); }, []);

  const save = useCallback((entry: Omit<ArchiveEntry, "id" | "savedAt">) => {
    const next: ArchiveEntry = { ...entry, id: crypto.randomUUID(), savedAt: Date.now() };
    setEntries(prev => {
      const updated = [next, ...prev];
      persist(updated);
      return updated;
    });
    return next.id;
  }, []);

  const remove = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  return { entries, save, remove };
}

export function getArchiveCount(): number {
  if (typeof window === "undefined") return 0;
  try { return (readArchive(localStorage) as unknown[]).length; }
  catch { return 0; }
}
