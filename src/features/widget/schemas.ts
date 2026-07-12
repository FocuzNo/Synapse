import { z } from "zod";

export const publicChatSchema = z.object({
  chatbotId: z.uuid(),
  sessionId: z.uuid(),
  message: z
    .string()
    .trim()
    .min(2, "Ask a longer question.")
    .max(2000, "Message is too long."),
});

export type PublicChatInput = z.infer<typeof publicChatSchema>;
