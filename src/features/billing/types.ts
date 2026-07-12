import type {
  PlanKey,
  Subscription,
  SubscriptionStatus,
  Workspace,
} from "@/types/database";

export type { PlanKey, Subscription, SubscriptionStatus };

export type BillingProvider = "mock" | "stripe";

export type BillingErrorCode =
  | "UNAUTHORIZED"
  | "WORKSPACE_NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "PLAN_LIMIT_REACHED"
  | "FEATURE_NOT_AVAILABLE"
  | "INVALID_PLAN"
  | "INVALID_PLAN_TRANSITION"
  | "SUBSCRIPTION_NOT_FOUND"
  | "BILLING_PROVIDER_ERROR"
  | "DATABASE_ERROR";

export type BillingActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; code: BillingErrorCode; message: string };

export type WorkspaceSubscriptionSnapshot = {
  workspace: Workspace;
  subscription: Subscription | null;
  effectivePlan: PlanKey;
  provider: BillingProvider;
  status: SubscriptionStatus;
  scheduledPlan: PlanKey | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
};

export type WorkspaceUsageSummary = {
  plan: PlanKey;
  chatbotsUsed: number;
  documentsUsed: number;
  monthlyMessagesUsed: number;
  limits: {
    maxChatbots: number;
    maxDocuments: number;
    maxMonthlyMessages: number;
    maxFileSizeMb: number;
  };
  usagePercentages: {
    chatbots: number;
    documents: number;
    monthlyMessages: number;
  };
  currentPeriodStart: string | null;
  conversationRetentionDays: number | null;
};
