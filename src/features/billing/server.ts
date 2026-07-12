import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "@/features/workspaces/server";
import {
  calculateUsagePercentage,
  canAccessAnalyticsOnPlan,
  canCreateChatbotOnPlan,
  canRemoveBrandingOnPlan,
  canUploadDocumentOnPlan,
  isConversationRetainedAt,
} from "@/features/billing/logic";
import { getPlanDefinition, getPlanLabel, getPlanLimits } from "@/features/billing/plans";
import type {
  BillingActionResult,
  BillingErrorCode,
  PlanKey,
  WorkspaceSubscriptionSnapshot,
  WorkspaceUsageSummary,
} from "@/features/billing/types";
import type { Subscription, Workspace } from "@/types/database";

const SUBSCRIPTION_SELECT =
  "id,workspace_id,provider,provider_customer_id,provider_subscription_id,plan_key,scheduled_plan_key,status,billing_email,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at";

type UsageRecord = {
  workspace_id: string;
  period_start: string;
  ai_messages: number;
};

function getFallbackSubscriptionSnapshot(workspace: Workspace): WorkspaceSubscriptionSnapshot {
  return {
    workspace,
    subscription: null,
    effectivePlan: "free",
    provider: "mock",
    status: "active",
    scheduledPlan: null,
    cancelAtPeriodEnd: false,
    currentPeriodStart: null,
    currentPeriodEnd: null,
  };
}

function billingError<T>(code: BillingErrorCode, message: string): BillingActionResult<T> {
  return { ok: false, code, message };
}

async function loadWorkspaceSubscriptionByWorkspaceId(
  workspaceId: string,
  options?: { admin?: boolean }
): Promise<Subscription | null> {
  const supabase = options?.admin ? createSupabaseAdminClient() : await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("workspace_id", workspaceId)
    .maybeSingle()
    .returns<Subscription | null>();

  if (error) {
    console.error("Failed to load workspace subscription", {
      code: error.code,
      workspaceId,
      admin: options?.admin ?? false,
    });
    return null;
  }

  return data;
}

export async function getWorkspaceSubscription(): Promise<WorkspaceSubscriptionSnapshot | null> {
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return null;
  }

  const subscription = await loadWorkspaceSubscriptionByWorkspaceId(currentWorkspace.workspace.id);

  if (!subscription) {
    return getFallbackSubscriptionSnapshot(currentWorkspace.workspace);
  }

  return {
    workspace: currentWorkspace.workspace,
    subscription,
    effectivePlan: subscription.plan_key,
    provider: subscription.provider,
    status: subscription.status,
    scheduledPlan: subscription.scheduled_plan_key,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
  };
}

export async function getWorkspacePlan(): Promise<PlanKey> {
  const subscription = await getWorkspaceSubscription();
  return subscription?.effectivePlan ?? "free";
}

export async function getWorkspacePlanLimits() {
  return getPlanLimits(await getWorkspacePlan());
}

export async function getWorkspacePlanForPublicWorkspace(workspaceId: string) {
  const subscription = await loadWorkspaceSubscriptionByWorkspaceId(workspaceId, { admin: true });
  return subscription?.plan_key ?? "free";
}

export async function getWorkspacePlanLimitsForPublicWorkspace(workspaceId: string) {
  return getPlanLimits(await getWorkspacePlanForPublicWorkspace(workspaceId));
}

export async function getWorkspaceUsageSummary(): Promise<WorkspaceUsageSummary | null> {
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return null;
  }

  const [plan, chatbotsCount, documentsCount, usageRecord] = await Promise.all([
    getWorkspacePlan(),
    countTableForWorkspace("chatbots", currentWorkspace.workspace.id),
    countTableForWorkspace("documents", currentWorkspace.workspace.id),
    getCurrentUsageRecord(currentWorkspace.workspace.id),
  ]);
  const limits = getPlanLimits(plan);
  const monthlyMessagesUsed = usageRecord?.ai_messages ?? 0;

  return {
    plan,
    chatbotsUsed: chatbotsCount,
    documentsUsed: documentsCount,
    monthlyMessagesUsed,
    limits: {
      maxChatbots: limits.maxChatbots,
      maxDocuments: limits.maxDocuments,
      maxMonthlyMessages: limits.maxMonthlyMessages,
      maxFileSizeMb: limits.maxFileSizeMb,
    },
    usagePercentages: {
      chatbots: calculateUsagePercentage(chatbotsCount, limits.maxChatbots),
      documents: calculateUsagePercentage(documentsCount, limits.maxDocuments),
      monthlyMessages: calculateUsagePercentage(monthlyMessagesUsed, limits.maxMonthlyMessages),
    },
    currentPeriodStart: usageRecord?.period_start ?? null,
    conversationRetentionDays: limits.conversationHistoryDays,
  };
}

export async function assertCanCreateChatbot(currentCount: number): Promise<BillingActionResult> {
  const plan = await getWorkspacePlan();
  const limits = getPlanLimits(plan);

  if (!canCreateChatbotOnPlan(plan, currentCount)) {
    return billingError(
      "PLAN_LIMIT_REACHED",
      `${getPlanLabel(plan)} allows ${limits.maxChatbots} chatbot${limits.maxChatbots === 1 ? "" : "s"}. ${getPlanDefinition(plan).key === "pro" ? "Archive an existing chatbot before creating another one." : getPlanLabel(plan) === "Free" ? "Upgrade to Starter to add more assistants." : "Upgrade to Pro to add more assistants."}`
    );
  }

  return { ok: true as const, data: undefined };
}

export async function assertCanUploadDocument(
  currentDocumentCount: number,
  fileSizeBytes: number
): Promise<
  | { ok: true; data: undefined }
  | { ok: false; code: "DOCUMENT_LIMIT_REACHED" | "FILE_TOO_LARGE"; message: string }
> {
  const plan = await getWorkspacePlan();
  const limits = getPlanLimits(plan);

  const documentGate = canUploadDocumentOnPlan(plan, currentDocumentCount, fileSizeBytes);

  if (!documentGate.ok && documentGate.code === "DOCUMENT_LIMIT_REACHED") {
    return {
      ok: false,
      code: "DOCUMENT_LIMIT_REACHED",
      message: `${getPlanLabel(plan)} allows ${limits.maxDocuments} documents per workspace.`,
    };
  }

  if (!documentGate.ok && documentGate.code === "FILE_TOO_LARGE") {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: `${getPlanLabel(plan)} allows TXT files up to ${limits.maxFileSizeMb} MB.`,
    };
  }

  return { ok: true as const, data: undefined };
}

export async function assertCanRemoveBranding() {
  const plan = await getWorkspacePlan();

  if (!canRemoveBrandingOnPlan(plan)) {
    return billingError(
      "FEATURE_NOT_AVAILABLE",
      "Remove AskFlow branding by upgrading to Starter or Pro."
    );
  }

  return { ok: true as const, data: undefined };
}

export async function assertCanAccessAnalytics() {
  const plan = await getWorkspacePlan();

  if (!canAccessAnalyticsOnPlan(plan)) {
    return billingError(
      "FEATURE_NOT_AVAILABLE",
      "Analytics are available on Starter and Pro."
    );
  }

  return { ok: true as const, data: undefined };
}

export async function assertConversationIsRetained(lastMessageAt: string | Date) {
  const plan = await getWorkspacePlan();
  return isConversationRetainedForPlan(plan, lastMessageAt);
}

export function isConversationRetainedForPlan(plan: PlanKey, lastMessageAt: string | Date) {
  return isConversationRetainedAt(plan, lastMessageAt, new Date());
}

export async function assertCanSendMessage() {
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return billingError("WORKSPACE_NOT_FOUND", "Workspace was not found.");
  }

  return consumeWorkspaceMessageAllowance(currentWorkspace.workspace.id);
}

export async function consumeWorkspaceMessageAllowance(workspaceId: string) {
  const plan = await getWorkspacePlanForPublicWorkspace(workspaceId);
  const limits = getPlanLimits(plan);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_workspace_ai_usage", {
    target_workspace_id: workspaceId,
    message_limit: limits.maxMonthlyMessages,
    message_increment: 1,
    input_tokens_increment: 0,
    output_tokens_increment: 0,
  });

  if (error) {
    console.error("Workspace usage RPC failed", {
      code: error.code,
      workspaceId,
      plan,
    });
    return billingError(
      "DATABASE_ERROR",
      "Usage could not be checked right now. Please try again."
    );
  }

  const row = (data?.[0] ?? null) as
    | { allowed: boolean; current_count: number; limit_count: number }
    | null;

  if (!row?.allowed) {
    return billingError(
      "PLAN_LIMIT_REACHED",
      `${getPlanLabel(plan)} includes ${limits.maxMonthlyMessages} AI messages per month. Upgrade to keep replying.`
    );
  }

  return { ok: true as const, data: undefined };
}

export async function recordWorkspaceTokenUsage(params: {
  workspaceId: string;
  inputTokens: number | null;
  outputTokens: number | null;
}) {
  const plan = await getWorkspacePlanForPublicWorkspace(params.workspaceId);
  const limits = getPlanLimits(plan);
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("consume_workspace_ai_usage", {
    target_workspace_id: params.workspaceId,
    message_limit: limits.maxMonthlyMessages,
    message_increment: 0,
    input_tokens_increment: params.inputTokens ?? 0,
    output_tokens_increment: params.outputTokens ?? 0,
  });

  if (error) {
    console.error("Workspace token usage update failed", {
      code: error.code,
      workspaceId: params.workspaceId,
      plan,
    });
  }
}

async function countTableForWorkspace(
  table: "chatbots" | "documents",
  workspaceId: string
) {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("Failed to count workspace records", {
      code: error.code,
      table,
      workspaceId,
    });
    return 0;
  }

  return count ?? 0;
}

async function getCurrentUsageRecord(workspaceId: string): Promise<UsageRecord | null> {
  const supabase = await createServerSupabaseClient();
  const currentPeriodStart = new Date();
  currentPeriodStart.setUTCDate(1);
  currentPeriodStart.setUTCHours(0, 0, 0, 0);
  const isoDate = currentPeriodStart.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("usage_records")
    .select("workspace_id,period_start,ai_messages")
    .eq("workspace_id", workspaceId)
    .eq("period_start", isoDate)
    .maybeSingle()
    .returns<UsageRecord | null>();

  if (error) {
    console.error("Failed to load usage record", {
      code: error.code,
      workspaceId,
    });
    return null;
  }

  return data;
}
