import test from "node:test";
import assert from "node:assert/strict";
import { publicChatSchema } from "@/features/widget/schemas";
import {
  buildPublicRateLimitKeys,
  buildWidgetEmbedCode,
  hashRateLimitKey,
  mapPublicAnswerSources,
  mapPublicChatbotConfig,
} from "@/features/widget/logic";

const publicId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";

test("publicChatSchema validates public identifiers and message length", () => {
  assert.equal(
    publicChatSchema.safeParse({
      chatbotId: publicId,
      sessionId,
      message: "How do I invite a team member?",
    }).success,
    true
  );
  assert.equal(
    publicChatSchema.safeParse({
      chatbotId: "internal-id",
      sessionId,
      message: "How do I invite a team member?",
    }).success,
    false
  );
  assert.equal(
    publicChatSchema.safeParse({
      chatbotId: publicId,
      sessionId,
      message: "x".repeat(2001),
    }).success,
    false
  );
});

test("mapPublicChatbotConfig exposes only public-safe fields", () => {
  const config = mapPublicChatbotConfig({
    public_id: publicId,
    name: "CloudDesk Assistant",
    welcome_message: "Ask me about CloudDesk.",
    primary_color: "#6D5DFB",
    theme: "dark",
    position: "bottom-left",
    branding_enabled: true,
  });

  assert.deepEqual(Object.keys(config).sort(), [
    "available",
    "brandingEnabled",
    "name",
    "position",
    "primaryColor",
    "publicId",
    "theme",
    "welcomeMessage",
  ]);
  assert.equal(config.publicId, publicId);
  assert.equal(config.available, true);
  assert.equal("workspace_id" in config, false);
  assert.equal("system_prompt" in config, false);
});

test("rate-limit keys hash IP addresses but keep session boundaries readable", () => {
  const first = buildPublicRateLimitKeys({
    clientIp: "203.0.113.42",
    chatbotPublicId: publicId,
    sessionId,
    salt: "test-salt",
  });
  const second = buildPublicRateLimitKeys({
    clientIp: "203.0.113.42",
    chatbotPublicId: publicId,
    sessionId,
    salt: "test-salt",
  });
  const differentSalt = buildPublicRateLimitKeys({
    clientIp: "203.0.113.42",
    chatbotPublicId: publicId,
    sessionId,
    salt: "other-salt",
  });

  assert.deepEqual(first, second);
  assert.equal(first.sessionKey, `widget:${publicId}:session:${sessionId}`);
  assert.match(first.ipKey, new RegExp(`^widget:${publicId}:ip:[a-f0-9]{64}$`));
  assert.equal(first.ipKey.includes("203.0.113.42"), false);
  assert.notEqual(first.ipKey, differentSalt.ipKey);
  assert.equal(hashRateLimitKey("203.0.113.42", "test-salt").length, 64);
});

test("mapPublicAnswerSources strips internal IDs and truncates excerpts", () => {
  const sources = mapPublicAnswerSources([
    {
      document_chunks: {
        content: ` ${"CloudDesk source text. ".repeat(20)} `,
        documents: { original_filename: "clouddesk-knowledge.txt" },
      },
    },
    {
      document_chunks: {
        content: "Fallback document name.",
        documents: null,
      },
    },
    {
      document_chunks: null,
    },
  ]);

  assert.equal(sources.length, 2);
  assert.deepEqual(Object.keys(sources[0]).sort(), [
    "excerpt",
    "filename",
    "sourceNumber",
  ]);
  assert.equal(sources[0].sourceNumber, 1);
  assert.equal(sources[0].filename, "clouddesk-knowledge.txt");
  assert.equal(sources[0].excerpt.length, 180);
  assert.equal(sources[1].filename, "Document");
});

test("buildWidgetEmbedCode uses app URL and public id without trailing-slash drift", () => {
  assert.equal(
    buildWidgetEmbedCode({
      appUrl: "https://askflow.example/",
      publicId,
    }),
    `<script\n  src="https://askflow.example/widget.js"\n  data-chatbot-id="${publicId}"\n  async>\n</script>`
  );
});

