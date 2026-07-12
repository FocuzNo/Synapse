"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/server";
import { getCurrentWorkspace } from "@/features/workspaces/server";
import {
  assertCanCreateChatbot,
  assertCanRemoveBranding,
} from "@/features/billing/server";
import { DEFAULT_CHATBOT_SYSTEM_PROMPT } from "@/features/chatbots/prompt";
import {
  chatbotAppearanceSchema,
  chatbotStatusSchema,
  createChatbotSchema,
  deleteChatbotSchema,
  updateChatbotSchema,
} from "@/features/chatbots/schemas";
import { getChatbotById, getChatbotCountForCurrentWorkspace } from "@/features/chatbots/queries";
import { getReadyDocumentCount } from "@/features/documents/queries";
import type { ActionErrorCode, ActionResult, ChatbotStatus } from "@/features/chatbots/types";

function actionError<T>(code: ActionErrorCode, message: string): ActionResult<T> {
  return { ok: false, code, message };
}

function validationError<T>(error: z.ZodError): ActionResult<T> {
  return actionError("VALIDATION_ERROR", z.prettifyError(error));
}

async function requireCurrentWorkspaceForMutation(): Promise<
  | { ok: true; workspaceId: string; role: string }
  | { ok: false; code: ActionErrorCode; message: string }
> {
  await requireUser();
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return {
      ok: false,
      code: "WORKSPACE_NOT_FOUND",
      message: "Workspace was not found. Repair workspace setup before continuing.",
    };
  }

  if (!["owner", "admin"].includes(currentWorkspace.membership.role)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You do not have permission to manage chatbots in this workspace.",
    };
  }

  return {
    ok: true,
    workspaceId: currentWorkspace.workspace.id,
    role: currentWorkspace.membership.role,
  };
}

export async function createChatbotAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createChatbotSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const workspace = await requireCurrentWorkspaceForMutation();

  if (!workspace.ok) {
    return actionError(workspace.code, workspace.message);
  }

  const currentCount = await getChatbotCountForCurrentWorkspace();
  const limitCheck = await assertCanCreateChatbot(currentCount);

  if (!limitCheck.ok) {
    return actionError("PLAN_LIMIT_REACHED", limitCheck.message);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("chatbots")
    .insert({
      workspace_id: workspace.workspaceId,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      welcome_message: parsed.data.welcomeMessage.trim(),
      system_prompt: DEFAULT_CHATBOT_SYSTEM_PROMPT,
      status: "draft",
      primary_color: "#6D5DFB",
      theme: "light",
      position: "bottom-right",
      branding_enabled: true,
    })
    .select("id")
    .single()
    .returns<{ id: string }>();

  if (error || !data) {
    console.error("Failed to create chatbot", { code: error?.code });
    return actionError("DATABASE_ERROR", "Chatbot could not be created. Please try again.");
  }

  revalidatePath("/app");
  revalidatePath("/app/chatbots");

  return { ok: true, data, message: "Chatbot created." };
}

export async function createChatbotAndRedirectAction(input: unknown): Promise<ActionResult> {
  const result = await createChatbotAction(input);

  if (!result.ok) {
    return result;
  }

  redirect(`/app/chatbots/${result.data.id}`);
}

export async function updateChatbotAction(input: unknown): Promise<ActionResult> {
  const parsed = updateChatbotSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const workspace = await requireCurrentWorkspaceForMutation();

  if (!workspace.ok) {
    return actionError(workspace.code, workspace.message);
  }

  const existing = await getChatbotById(parsed.data.chatbotId);

  if (!existing) {
    return actionError("CHATBOT_NOT_FOUND", "Chatbot was not found.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("chatbots")
    .update({
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      welcome_message: parsed.data.welcomeMessage.trim(),
      system_prompt: parsed.data.systemPrompt.trim(),
    })
    .eq("id", existing.id)
    .eq("workspace_id", workspace.workspaceId);

  if (error) {
    console.error("Failed to update chatbot", { code: error.code });
    return actionError("DATABASE_ERROR", "Chatbot settings could not be saved.");
  }

  revalidatePath("/app/chatbots");
  revalidatePath(`/app/chatbots/${existing.id}`);

  return { ok: true, data: undefined, message: "Chatbot settings saved." };
}

export async function updateChatbotAppearanceAction(input: unknown): Promise<ActionResult> {
  const parsed = chatbotAppearanceSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const workspace = await requireCurrentWorkspaceForMutation();

  if (!workspace.ok) {
    return actionError(workspace.code, workspace.message);
  }

  const existing = await getChatbotById(parsed.data.chatbotId);

  if (!existing) {
    return actionError("CHATBOT_NOT_FOUND", "Chatbot was not found.");
  }

  let brandingEnabled = true;

  if (!parsed.data.brandingEnabled) {
    const brandingGate = await assertCanRemoveBranding();

    if (!brandingGate.ok) {
      return actionError(brandingGate.code, brandingGate.message);
    }

    brandingEnabled = false;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("chatbots")
    .update({
      primary_color: parsed.data.primaryColor,
      theme: parsed.data.theme,
      position: parsed.data.position,
      branding_enabled: brandingEnabled,
    })
    .eq("id", existing.id)
    .eq("workspace_id", workspace.workspaceId);

  if (error) {
    console.error("Failed to update chatbot appearance", { code: error.code });
    return actionError("DATABASE_ERROR", "Appearance could not be saved.");
  }

  revalidatePath(`/app/chatbots/${existing.id}`);

  return { ok: true, data: undefined, message: "Appearance saved." };
}

function canTransitionStatus(current: ChatbotStatus, next: ChatbotStatus) {
  if (current === next) {
    return true;
  }

  return (
    (current === "draft" && next === "active") ||
    (current === "active" && next === "disabled") ||
    (current === "disabled" && next === "active")
  );
}

export async function updateChatbotStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = chatbotStatusSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const workspace = await requireCurrentWorkspaceForMutation();

  if (!workspace.ok) {
    return actionError(workspace.code, workspace.message);
  }

  const existing = await getChatbotById(parsed.data.chatbotId);

  if (!existing) {
    return actionError("CHATBOT_NOT_FOUND", "Chatbot was not found.");
  }

  if (!canTransitionStatus(existing.status, parsed.data.status)) {
    return actionError("VALIDATION_ERROR", "This status transition is not allowed.");
  }

  if (existing.status === "draft" && parsed.data.status === "active") {
    const readyDocuments = await getReadyDocumentCount(existing.id);

    if (readyDocuments === 0) {
      return actionError("CHATBOT_NOT_READY", "Add at least one ready TXT document before activating this chatbot.");
    }
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("chatbots")
    .update({ status: parsed.data.status })
    .eq("id", existing.id)
    .eq("workspace_id", workspace.workspaceId);

  if (error) {
    console.error("Failed to update chatbot status", { code: error.code });
    return actionError("DATABASE_ERROR", "Status could not be updated.");
  }

  revalidatePath("/app/chatbots");
  revalidatePath(`/app/chatbots/${existing.id}`);

  return { ok: true, data: undefined, message: "Status updated." };
}

export async function deleteChatbotAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteChatbotSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const workspace = await requireCurrentWorkspaceForMutation();

  if (!workspace.ok) {
    return actionError(workspace.code, workspace.message);
  }

  const existing = await getChatbotById(parsed.data.chatbotId);

  if (!existing) {
    return actionError("CHATBOT_NOT_FOUND", "Chatbot was not found.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("chatbots")
    .delete()
    .eq("id", existing.id)
    .eq("workspace_id", workspace.workspaceId);

  if (error) {
    console.error("Failed to delete chatbot", { code: error.code });
    return actionError("DATABASE_ERROR", "Chatbot could not be deleted.");
  }

  revalidatePath("/app");
  revalidatePath("/app/chatbots");

  return { ok: true, data: undefined, message: "Chatbot deleted." };
}
