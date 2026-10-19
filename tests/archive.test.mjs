import assert from "node:assert/strict";
import { test } from "node:test";
import { readArchive, persistArchive } from "../src/lib/archive.ts";

function storage(values) {
  const map = new Map(Object.entries(values));
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: (key) => map.delete(key) };
}

test("legacy and current archives merge once without duplicating entries", () => {
  const current = { id: "new", type: "document", title: "Letter", savedAt: 20, text: "Full letter" };
  const legacy = { id: "old", type: "discover", title: "Object", savedAt: 10, text: "Object history" };
  const saved = storage({ "echoes-archive": JSON.stringify([current]), echoes_archive: JSON.stringify([legacy, current]) });
  const entries = readArchive(saved);
  assert.equal(entries.length, 2);
  assert.equal(entries[1].type, "discovery");
  assert.equal(entries[1].text, "Object history");
  assert.equal(saved.getItem("echoes_archive"), null);
  persistArchive(saved, entries.filter((entry) => entry.id !== "old"));
  assert.deepEqual(readArchive(saved), [current]);
});

test("failed migration keeps the legacy copy and malformed storage does not break the archive", () => {
  const legacy = [{ id: "old", type: "heirloom", title: "Clock", savedAt: 1 }];
  const saved = storage({ "echoes-archive": "{}", echoes_archive: JSON.stringify(legacy) });
  saved.setItem = () => { throw new Error("Storage full"); };
  assert.deepEqual(readArchive(saved), legacy);
  assert.equal(saved.getItem("echoes_archive"), JSON.stringify(legacy));
  assert.deepEqual(readArchive(storage({ "echoes-archive": "invalid" })), []);
});
