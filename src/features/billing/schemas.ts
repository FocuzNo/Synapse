import { z } from "zod";

export const changePlanSchema = z.object({
  plan: z.enum(["free", "starter", "pro"]),
});

export type ChangePlanInput = z.infer<typeof changePlanSchema>;
