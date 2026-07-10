"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/server";
import { getCurrentWorkspace } from "@/features/workspaces/server";

const settingsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  workspaceName: z.string().trim().min(2, "Enter a workspace name."),
  website: z.union([z.url("Enter a valid URL."), z.literal("")]),
  industry: z.string().trim().max(80, "Industry is too long.").optional(),
});

export type SettingsState = {
  ok: boolean;
  message: string;
};

export type SettingsInput = z.infer<typeof settingsSchema>;

export async function updateSettingsAction(input: SettingsInput): Promise<SettingsState> {
  const parsed = settingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: z.prettifyError(parsed.error),
    };
  }

  const user = await requireUser();
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return {
      ok: false,
      message: "Workspace is missing. Repair it before saving settings.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const profileUpdate = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName.trim(),
    })
    .eq("id", user.id);

  if (profileUpdate.error) {
    return {
      ok: false,
      message: "Profile could not be updated. Please try again.",
    };
  }

  const workspaceUpdate = await supabase
    .from("workspaces")
    .update({
      name: parsed.data.workspaceName.trim(),
      website: parsed.data.website.trim() || null,
      industry: parsed.data.industry?.trim() || null,
    })
    .eq("id", currentWorkspace.workspace.id);

  if (workspaceUpdate.error) {
    return {
      ok: false,
      message: "Workspace could not be updated. Please try again.",
    };
  }

  revalidatePath("/app", "layout");
  revalidatePath("/app/settings");

  return {
    ok: true,
    message: "Settings saved.",
  };
}
