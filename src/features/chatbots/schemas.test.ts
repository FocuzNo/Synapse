import test from "node:test";
import assert from "node:assert/strict";
import {
  chatbotAppearanceSchema,
  chatbotStatusSchema,
  createChatbotSchema,
  updateChatbotSchema,
} from "@/features/chatbots/schemas";

const chatbotId = "11111111-1111-4111-8111-111111111111";

test("createChatbotSchema trims accepted user input", () => {
  const parsed = createChatbotSchema.parse({
    name: "  CloudDesk Assistant  ",
    description: "  Support helper  ",
    welcomeMessage: "  Hi there  ",
  });

  assert.equal(parsed.name, "CloudDesk Assistant");
  assert.equal(parsed.description, "Support helper");
  assert.equal(parsed.welcomeMessage, "Hi there");
});

test("createChatbotSchema rejects too-short names and welcome messages", () => {
  assert.equal(
    createChatbotSchema.safeParse({
      name: "A",
      welcomeMessage: "Hi",
    }).success,
    false
  );
  assert.equal(
    createChatbotSchema.safeParse({
      name: "Support Bot",
      welcomeMessage: "A",
    }).success,
    false
  );
});

test("updateChatbotSchema requires tenant-safe UUID and meaningful system prompt", () => {
  assert.equal(
    updateChatbotSchema.safeParse({
      chatbotId,
      name: "CloudDesk Assistant",
      description: "",
      welcomeMessage: "How can I help?",
      systemPrompt: "Use only the provided knowledge base context.",
    }).success,
    true
  );

  assert.equal(
    updateChatbotSchema.safeParse({
      chatbotId: "not-a-uuid",
      name: "CloudDesk Assistant",
      welcomeMessage: "How can I help?",
      systemPrompt: "too short",
    }).success,
    false
  );
});

test("chatbotAppearanceSchema accepts only six-digit HEX colors and known widget settings", () => {
  assert.equal(
    chatbotAppearanceSchema.safeParse({
      chatbotId,
      primaryColor: "#6D5DFB",
      theme: "light",
      position: "bottom-right",
      brandingEnabled: true,
    }).success,
    true
  );

  assert.equal(
    chatbotAppearanceSchema.safeParse({
      chatbotId,
      primaryColor: "purple",
      theme: "system",
      position: "top-right",
      brandingEnabled: false,
    }).success,
    false
  );
});

test("chatbotStatusSchema accepts only supported lifecycle states", () => {
  assert.equal(
    chatbotStatusSchema.safeParse({ chatbotId, status: "active" }).success,
    true
  );
  assert.equal(
    chatbotStatusSchema.safeParse({ chatbotId, status: "archived" }).success,
    false
  );
});

