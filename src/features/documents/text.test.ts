import test from "node:test";
import assert from "node:assert/strict";
import { chunkText, normalizeTxtBuffer, sanitizeFilename } from "./text";
import { CHUNK_TARGET_CHARACTERS } from "../rag/constants";

test("sanitizeFilename strips path traversal and preserves txt extension", () => {
  assert.equal(sanitizeFilename("../Quarterly Notes.TXT"), "quarterly-notes.txt");
  assert.equal(sanitizeFilename("..\\..\\unsafe<>name"), "unsafename.txt");
});

test("normalizeTxtBuffer trims bom, normalizes line endings, and rejects binary data", () => {
  const text = "\uFEFFHello\r\n\r\nWorld  \r\n";
  const normalized = normalizeTxtBuffer(new TextEncoder().encode(text).buffer);

  assert.equal(normalized, "Hello\n\nWorld");
  assert.throws(
    () => normalizeTxtBuffer(Uint8Array.from([0, 159, 146, 150]).buffer),
    /binary data/i
  );
});

test("chunkText creates bounded non-empty chunks", () => {
  const paragraph = "A".repeat(CHUNK_TARGET_CHARACTERS + 200);
  const text = `Intro paragraph.\n\n${paragraph}\n\nClosing paragraph.`;
  const chunks = chunkText(text);

  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every((chunk) => chunk.content.length > 0));
  assert.ok(chunks.every((chunk) => chunk.content.length <= CHUNK_TARGET_CHARACTERS));
  assert.ok(chunks.every((chunk) => chunk.tokenCount > 0));
});
