import test from "node:test";
import assert from "node:assert/strict";
import { buildConversationTitle, FALLBACK_CONVERSATION_TITLE } from "@/features/conversations/title";

test("buildConversationTitle preserves a short question", () => {
  assert.equal(buildConversationTitle("How do I invite a teammate?"), "How do I invite a teammate?");
});

test("buildConversationTitle normalizes whitespace and leading markdown", () => {
  assert.equal(buildConversationTitle("  ** Как   это работает? ** "), "Как это работает?");
});

test("buildConversationTitle supports non-English text and emoji", () => {
  assert.equal(buildConversationTitle("Как включить 2FA? 🔐"), "Как включить 2FA? 🔐");
});

test("buildConversationTitle falls back for empty input", () => {
  assert.equal(buildConversationTitle(" \n\t "), FALLBACK_CONVERSATION_TITLE);
});

test("buildConversationTitle truncates at a word boundary", () => {
  const title = buildConversationTitle("How can I configure the CloudDesk Slack integration for our support team?");
  assert.equal(title, "How can I configure the CloudDesk Slack integration for...");
  assert.ok(title.length <= 60);
});

test("buildConversationTitle truncates an unbroken long word safely", () => {
  const title = buildConversationTitle("a".repeat(100));
  assert.equal(title.length, 60);
  assert.ok(title.endsWith("..."));
});
