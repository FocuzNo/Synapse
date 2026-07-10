import "server-only";

export type PlanKey = "free" | "starter";

export type PlanLimits = {
  maxChatbots: number;
  maxDocuments: number;
  maxFileSizeMb: number;
  maxMonthlyMessages: number;
  brandingRemoval: boolean;
  analytics: boolean;
};

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    maxChatbots: 1,
    maxDocuments: 5,
    maxFileSizeMb: 2,
    maxMonthlyMessages: 100,
    brandingRemoval: false,
    analytics: false,
  },
  starter: {
    maxChatbots: 3,
    maxDocuments: 50,
    maxFileSizeMb: 10,
    maxMonthlyMessages: 2000,
    brandingRemoval: true,
    analytics: true,
  },
};

export function getWorkspacePlan(): PlanKey {
  return "free";
}

export function getPlanLimits(plan: PlanKey = getWorkspacePlan()) {
  return PLAN_LIMITS[plan];
}

export function assertCanCreateChatbot(currentCount: number) {
  const limits = getPlanLimits();

  if (currentCount >= limits.maxChatbots) {
    return {
      ok: false as const,
      message: `Free plan allows ${limits.maxChatbots} chatbot. Upgrade to create more.`,
    };
  }

  return { ok: true as const };
}

export function assertCanUploadDocument(currentDocumentCount: number, fileSizeBytes: number) {
  const limits = getPlanLimits();
  const maxBytes = limits.maxFileSizeMb * 1024 * 1024;

  if (currentDocumentCount >= limits.maxDocuments) {
    return {
      ok: false as const,
      code: "DOCUMENT_LIMIT_REACHED" as const,
      message: `Free plan allows ${limits.maxDocuments} documents per workspace.`,
    };
  }

  if (fileSizeBytes > maxBytes) {
    return {
      ok: false as const,
      code: "FILE_TOO_LARGE" as const,
      message: `Free plan allows TXT files up to ${limits.maxFileSizeMb} MB.`,
    };
  }

  return { ok: true as const };
}
