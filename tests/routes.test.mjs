import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST as answer } from "../src/app/api/answer/route.ts";
import { POST as cleanOcr } from "../src/app/api/clean-ocr/route.ts";
import { POST as timeline } from "../src/app/api/timeline-narrative/route.ts";
import { GET as archiveSearch } from "../src/app/api/chronicling/route.ts";

const originalFetch = globalThis.fetch;
const originalKey = process.env.GROQ_API_KEY;
const request = (body) => new Request("http://localhost/api/test", {
  method: "POST",
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
});

test("archive outages are distinct from an empty search", async () => {
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  const response = await archiveSearch(new Request("http://localhost/api/chronicling?query=bicycle"));
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /unavailable/);
  globalThis.fetch = async () => Response.json({ results: [], pagination: { total: 0 } });
  const empty = await archiveSearch(new Request("http://localhost/api/chronicling?query=unknown"));
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), { items: [], totalItems: 0 });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalKey;
});

test("document questions reject invalid input before contacting a provider", async () => {
  globalThis.fetch = () => { throw new Error("unexpected provider request"); };
  const response = await answer(request({ question: 123, documentText: "A letter." }));
  assert.equal(response.status, 400);
});

test("missing credentials are reported as unavailable", async () => {
  delete process.env.GROQ_API_KEY;
  globalThis.fetch = () => { throw new Error("unexpected provider request"); };
  const response = await answer(request({ question: "Who wrote this?", documentText: "A letter." }));
  assert.equal(response.status, 503);
});

test("provider failure is not presented as a historical answer", async () => {
  process.env.GROQ_API_KEY = "test-only";
  globalThis.fetch = async () => Response.json({ error: { message: "unavailable" } }, { status: 503 });
  const response = await answer(request({ question: "Who wrote this?", documentText: "A letter." }));
  assert.equal(response.status, 502);
  assert.match((await response.json()).answer, /unavailable/i);
});

test("successful routes use supported models", async () => {
  process.env.GROQ_API_KEY = "test-only";
  const models = [];
  globalThis.fetch = async (_url, init) => {
    models.push(JSON.parse(init.body).model);
    return Response.json({ choices: [{ message: { content: "A documented answer." } }] });
  };
  const responses = await Promise.all([
    answer(request({ question: "Who?", documentText: "A letter." })),
    cleanOcr(request({ text: "This historical document contains readable text." })),
    timeline(request({ query: "railways", items: [{ year: "1901", city: "Boston", state: "MA", newspaper: "Daily" }] })),
  ]);
  assert.ok(responses.every((response) => response.status === 200));
  assert.deepEqual(models, ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
});

test("OCR preserves text and labels a provider fallback", async () => {
  delete process.env.GROQ_API_KEY;
  globalThis.fetch = () => { throw new Error("unexpected provider request"); };
  const response = await cleanOcr(request({ text: "This document contains readable words." }));
  const body = await response.json();
  assert.equal(body.cleaned, "This document contains readable words.");
  assert.equal(body.fallback, true);
});

test("questions include the end of the document as source material", async () => {
  process.env.GROQ_API_KEY = "test-only";
  let sent;
  globalThis.fetch = async (_url, init) => {
    sent = JSON.parse(init.body);
    return Response.json({ choices: [{ message: { content: "The letter was signed by Ada." } }] });
  };
  const documentText = "Background material. ".repeat(120) + "Signed, Ada.";
  const response = await answer(request({ question: "Who signed this?", documentText }));
  assert.equal(response.status, 200);
  assert.ok(sent.messages.some((message) => message.role === "user" && message.content.includes(documentText)));
  assert.match(sent.messages[0].content, /not.*supported|does not.*support/i);
});

test("oversized documents are rejected without silently truncating them", async () => {
  process.env.GROQ_API_KEY = "test-only";
  let called = false;
  globalThis.fetch = async () => { called = true; return Response.json({}); };
  const response = await answer(request({ question: "Who?", documentText: "x".repeat(50_001) }));
  assert.equal(response.status, 400);
  assert.equal(called, false);
});
