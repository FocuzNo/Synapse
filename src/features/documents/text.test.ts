import test from "node:test";
import assert from "node:assert/strict";
import { chunkText, normalizeTxtBuffer, sanitizeFilename } from "./text";
import {
  CHUNK_OVERLAP_CHARACTERS,
  CHUNK_TARGET_CHARACTERS,
  MAX_EXTRACTED_CHARACTERS,
} from "../rag/constants";

test("sanitizeFilename strips path traversal and preserves txt extension", () => {
  assert.equal(sanitizeFilename("../Quarterly Notes.TXT"), "quarterly-notes.txt");
  assert.equal(sanitizeFilename("..\\..\\unsafe<>name"), "unsafename.txt");
  assert.equal(sanitizeFilename("   "), "document.txt");
  assert.equal(sanitizeFilename("release notes"), "release-notes.txt");
  assert.equal(
    sanitizeFilename("résumé upload notes.txt"),
    "resume-upload-notes.txt"
  );
});

test("sanitizeFilename caps very long names before adding extension", () => {
  const sanitized = sanitizeFilename(`${"a".repeat(200)}.txt`);

  assert.ok(sanitized.endsWith(".txt"));
  assert.ok(sanitized.length <= 120);
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

test("normalizeTxtBuffer preserves paragraph boundaries and rejects empty files", () => {
  const text = "  First\t\tline  \n\n\nSecond line   \n";

  assert.equal(
    normalizeTxtBuffer(new TextEncoder().encode(text).buffer),
    "First line\n\nSecond line"
  );
  assert.throws(
    () => normalizeTxtBuffer(new TextEncoder().encode("   \n\t").buffer),
    /empty/i
  );
});

test("normalizeTxtBuffer truncates extracted text to the configured maximum", () => {
  const normalized = normalizeTxtBuffer(
    new TextEncoder().encode("A".repeat(MAX_EXTRACTED_CHARACTERS + 500)).buffer
  );

  assert.equal(normalized.length, MAX_EXTRACTED_CHARACTERS);
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

test("chunkText is deterministic and keeps overlap for long paragraphs", () => {
  const paragraph = Array.from({ length: CHUNK_TARGET_CHARACTERS * 2 }, (_, index) =>
    String.fromCharCode(65 + (index % 26))
  ).join("");
  const first = chunkText(paragraph);
  const second = chunkText(paragraph);

  assert.deepEqual(second, first);
  assert.ok(first.length >= 2);
  assert.equal(
    first[0].content.slice(-CHUNK_OVERLAP_CHARACTERS),
    first[1].content.slice(0, CHUNK_OVERLAP_CHARACTERS)
  );
});

test("chunkText returns no chunks for empty normalized input", () => {
  assert.deepEqual(chunkText("   \n\n\t"), []);
});
