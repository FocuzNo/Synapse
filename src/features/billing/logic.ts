import type { PlanKey } from "@/types/database";
import { getPlanLimits, PLAN_ORDER } from "@/features/billing/plans";

export function resolveWorkspacePlan(plan: PlanKey | null | undefined): PlanKey {
  return plan ?? "free";
}

export function getPlanChangeDirection(currentPlan: PlanKey, nextPlan: PlanKey) {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  const nextIndex = PLAN_ORDER.indexOf(nextPlan);

  if (currentIndex === nextIndex) {
    return "same" as const;
  }

  return nextIndex > currentIndex ? ("upgrade" as const) : ("downgrade" as const);
}

export function canRemoveBrandingOnPlan(plan: PlanKey) {
  return getPlanLimits(plan).brandingRemoval;
}

export function canAccessAnalyticsOnPlan(plan: PlanKey) {
  return getPlanLimits(plan).analytics;
}

export function canCreateChatbotOnPlan(plan: PlanKey, currentCount: number) {
  return currentCount < getPlanLimits(plan).maxChatbots;
}

export function canUploadDocumentOnPlan(
  plan: PlanKey,
  currentDocumentCount: number,
  fileSizeBytes: number
) {
  const limits = getPlanLimits(plan);
  const maxBytes = limits.maxFileSizeMb * 1024 * 1024;

  if (currentDocumentCount >= limits.maxDocuments) {
    return { ok: false as const, code: "DOCUMENT_LIMIT_REACHED" as const };
  }

  if (fileSizeBytes > maxBytes) {
    return { ok: false as const, code: "FILE_TOO_LARGE" as const };
  }

  return { ok: true as const };
}

export function canSendMessageOnPlan(plan: PlanKey, currentMonthlyMessages: number) {
  return currentMonthlyMessages < getPlanLimits(plan).maxMonthlyMessages;
}

export function calculateUsagePercentage(used: number, limit: number) {
  if (limit <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

export function isConversationRetainedAt(
  plan: PlanKey,
  lastMessageAt: string | Date,
  now: Date
) {
  const retentionDays = getPlanLimits(plan).conversationHistoryDays;

  if (retentionDays === null) {
    return true;
  }

  const timestamp = typeof lastMessageAt === "string" ? new Date(lastMessageAt) : lastMessageAt;

  if (Number.isNaN(timestamp.getTime())) {
    return false;
  }

  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);

  return timestamp >= cutoff;
}
