import {
  CHUNK_OVERLAP_CHARACTERS,
  CHUNK_TARGET_CHARACTERS,
  MAX_EXTRACTED_CHARACTERS,
} from "@/features/rag/constants";

export type TextChunk = {
  content: string;
  tokenCount: number;
};

export function sanitizeFilename(filename: string) {
  const withoutPath = filename.split(/[/\\]/).pop() ?? "document.txt";
  const normalized = withoutPath
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 120);

  if (!normalized.endsWith(".txt")) {
    return `${normalized || "document"}.txt`;
  }

  return normalized || "document.txt";
}

function containsBinaryContent(bytes: Uint8Array) {
  let suspiciousControlBytes = 0;

  for (const byte of bytes) {
    if (byte === 0) {
      return true;
    }

    const isAllowedWhitespace = byte === 9 || byte === 10 || byte === 13;
    const isPrintableAscii = byte >= 32 && byte <= 126;
    const isUtf8ContinuationOrLead = byte >= 128;

    if (!isAllowedWhitespace && !isPrintableAscii && !isUtf8ContinuationOrLead) {
      suspiciousControlBytes += 1;
    }
  }

  return suspiciousControlBytes > 0;
}

export function normalizeTxtBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);

  if (containsBinaryContent(bytes)) {
    throw new Error("File appears to contain binary data.");
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const decoded = decoder.decode(bytes).replace(/^\uFEFF/, "");
  const normalized = decoded
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    throw new Error("File is empty.");
  }

  return normalized.slice(0, MAX_EXTRACTED_CHARACTERS);
}

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function chunkText(text: string): TextChunk[] {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).trim().length <= CHUNK_TARGET_CHARACTERS) {
      current = (current + "\n\n" + paragraph).trim();
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length <= CHUNK_TARGET_CHARACTERS) {
      current = paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += CHUNK_TARGET_CHARACTERS - CHUNK_OVERLAP_CHARACTERS) {
      chunks.push(paragraph.slice(index, index + CHUNK_TARGET_CHARACTERS).trim());
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks
    .filter(Boolean)
    .map((content) => ({
      content,
      tokenCount: estimateTokens(content),
    }));
}
