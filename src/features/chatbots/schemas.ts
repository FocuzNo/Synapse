import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a 6-digit HEX color like #6D5DFB.");

export const createChatbotSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  description: z.string().trim().max(240, "Description is too long.").optional(),
  welcomeMessage: z
    .string()
    .trim()
    .min(2, "Welcome message must be at least 2 characters.")
    .max(240, "Welcome message is too long."),
});

export const updateChatbotSchema = z.object({
  chatbotId: z.uuid(),
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  description: z.string().trim().max(240, "Description is too long.").optional(),
  welcomeMessage: z
    .string()
    .trim()
    .min(2, "Welcome message must be at least 2 characters.")
    .max(240, "Welcome message is too long."),
  systemPrompt: z.string().trim().min(20, "System prompt is too short.").max(4000),
});

export const chatbotAppearanceSchema = z.object({
  chatbotId: z.uuid(),
  primaryColor: hexColorSchema,
  theme: z.enum(["light", "dark"]),
  position: z.enum(["bottom-right", "bottom-left"]),
});

export const chatbotStatusSchema = z.object({
  chatbotId: z.uuid(),
  status: z.enum(["draft", "active", "disabled"]),
});

export const deleteChatbotSchema = z.object({
  chatbotId: z.uuid(),
});

export type CreateChatbotInput = z.infer<typeof createChatbotSchema>;
export type UpdateChatbotInput = z.infer<typeof updateChatbotSchema>;
export type ChatbotAppearanceInput = z.infer<typeof chatbotAppearanceSchema>;
export type ChatbotStatusInput = z.infer<typeof chatbotStatusSchema>;
