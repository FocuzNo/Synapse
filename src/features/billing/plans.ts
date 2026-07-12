import type { PlanKey } from "@/types/database";

export type PlanLimits = {
  maxChatbots: number;
  maxDocuments: number;
  maxFileSizeMb: number;
  maxMonthlyMessages: number;
  brandingRemoval: boolean;
  analytics: boolean;
  conversationHistoryDays: number | null;
  widgetCustomization: "basic" | "full";
  prioritySupport: boolean;
};

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  monthlyPriceUsd: number;
  description: string;
  headline: string;
  limits: PlanLimits;
};

export const PLAN_ORDER: PlanKey[] = ["free", "starter", "pro"];

export const PLAN_DEFINITIONS: Record<PlanKey, PlanDefinition> = {
  free: {
    key: "free",
    name: "Free",
    monthlyPriceUsd: 0,
    description: "Start building a single grounded support assistant.",
    headline: "For MVP validation and first live embed tests.",
    limits: {
      maxChatbots: 1,
      maxDocuments: 5,
      maxFileSizeMb: 2,
      maxMonthlyMessages: 100,
      brandingRemoval: false,
      analytics: false,
      conversationHistoryDays: 7,
      widgetCustomization: "basic",
      prioritySupport: false,
    },
  },
  starter: {
    key: "starter",
    name: "Starter",
    monthlyPriceUsd: 19,
    description: "Grow beyond the first assistant with more usage headroom.",
    headline: "Best for the first production workspace.",
    limits: {
      maxChatbots: 3,
      maxDocuments: 50,
      maxFileSizeMb: 10,
      maxMonthlyMessages: 2000,
      brandingRemoval: true,
      analytics: true,
      conversationHistoryDays: 90,
      widgetCustomization: "full",
      prioritySupport: false,
    },
  },
  pro: {
    key: "pro",
    name: "Pro",
    monthlyPriceUsd: 49,
    description: "Higher scale, deeper history, and room for future analytics.",
    headline: "For multi-assistant teams and heavier support traffic.",
    limits: {
      maxChatbots: 10,
      maxDocuments: 200,
      maxFileSizeMb: 20,
      maxMonthlyMessages: 10000,
      brandingRemoval: true,
      analytics: true,
      conversationHistoryDays: null,
      widgetCustomization: "full",
      prioritySupport: true,
    },
  },
};

export function getPlanDefinition(plan: PlanKey) {
  return PLAN_DEFINITIONS[plan];
}

export function getPlanLimits(plan: PlanKey) {
  return PLAN_DEFINITIONS[plan].limits;
}

export function getPlanLabel(plan: PlanKey) {
  return PLAN_DEFINITIONS[plan].name;
}

export function getPlanPriceLabel(plan: PlanKey) {
  const { monthlyPriceUsd } = PLAN_DEFINITIONS[plan];
  return monthlyPriceUsd === 0 ? "$0" : `$${monthlyPriceUsd}`;
}

export function getNextHigherPlan(plan: PlanKey): PlanKey | null {
  const index = PLAN_ORDER.indexOf(plan);
  return index >= 0 && index < PLAN_ORDER.length - 1 ? PLAN_ORDER[index + 1] : null;
}

export function getBillingUpgradeMessage(plan: PlanKey) {
  const nextPlan = getNextHigherPlan(plan);
  if (!nextPlan) {
    return "Your workspace is already on the highest available plan.";
  }

  return `Upgrade to ${getPlanLabel(nextPlan)} to unlock more capacity.`;
}
