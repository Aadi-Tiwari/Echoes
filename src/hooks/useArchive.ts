"use client";

import { useCallback, useEffect, useState } from "react";

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

function load(): ArchiveEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

function persist(entries: ArchiveEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* quota */ }
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
  try { return (JSON.parse(localStorage.getItem(KEY) || "[]") as unknown[]).length; }
  catch { return 0; }
}
