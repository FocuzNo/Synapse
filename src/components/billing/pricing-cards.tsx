"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getBillingUpgradeMessage,
  getPlanLabel,
  getPlanPriceLabel,
  PLAN_DEFINITIONS,
  PLAN_ORDER,
} from "@/features/billing/plans";
import { changeWorkspacePlanAction } from "@/features/billing/actions";
import type { PlanKey } from "@/features/billing/types";

type PricingCardsProps = {
  currentPlan?: PlanKey | null;
  scheduledPlan?: PlanKey | null;
  interactive?: boolean;
};

const featureRows: Array<{
  label: string;
  getValue: (plan: PlanKey) => string;
}> = [
  { label: "Chatbots", getValue: (plan) => String(PLAN_DEFINITIONS[plan].limits.maxChatbots) },
  { label: "Documents", getValue: (plan) => String(PLAN_DEFINITIONS[plan].limits.maxDocuments) },
  { label: "File size", getValue: (plan) => `${PLAN_DEFINITIONS[plan].limits.maxFileSizeMb} MB` },
  { label: "Messages / month", getValue: (plan) => String(PLAN_DEFINITIONS[plan].limits.maxMonthlyMessages) },
  {
    label: "History retention",
    getValue: (plan) => {
      const value = PLAN_DEFINITIONS[plan].limits.conversationHistoryDays;
      return value === null ? "Unlimited" : `${value} days`;
    },
  },
  {
    label: "Branding removal",
    getValue: (plan) => (PLAN_DEFINITIONS[plan].limits.brandingRemoval ? "Included" : "Not included"),
  },
  {
    label: "Analytics",
    getValue: (plan) => (PLAN_DEFINITIONS[plan].limits.analytics ? "Included" : "Not included"),
  },
];

export function PricingCards({
  currentPlan = null,
  scheduledPlan = null,
  interactive = false,
}: PricingCardsProps) {
  const router = useRouter();
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);

  async function handlePlanChange(plan: PlanKey) {
    setPendingPlan(plan);
    const result = await changeWorkspacePlanAction({ plan });
    setPendingPlan(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Plan updated.");
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {PLAN_ORDER.map((plan) => {
        const definition = PLAN_DEFINITIONS[plan];
        const isCurrent = currentPlan === plan;
        const isScheduled = scheduledPlan === plan;
        const isPending = pendingPlan === plan;

        return (
          <Card key={plan} className={isCurrent ? "border-primary shadow-sm" : "shadow-sm"}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{definition.name}</CardTitle>
                  <CardDescription className="mt-2">{definition.description}</CardDescription>
                </div>
                {isCurrent ? <Badge>Current</Badge> : null}
              </div>
              <div className="mt-4">
                <p className="text-3xl font-semibold">{getPlanPriceLabel(plan)}</p>
                <p className="text-sm text-muted-foreground">
                  {definition.monthlyPriceUsd === 0 ? "Forever free" : "per month"}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{definition.headline}</p>
              <ul className="grid gap-3 text-sm">
                {featureRows.map((row) => (
                  <li key={`${plan}:${row.label}`} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 text-primary" />
                    <span>
                      <span className="font-medium">{row.label}:</span> {row.getValue(plan)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-3">
              {interactive ? (
                <Button
                  type="button"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isPending}
                  onClick={() => void handlePlanChange(plan)}
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isCurrent
                    ? scheduledPlan
                      ? "Cancel scheduled change"
                      : "Keep current plan"
                    : currentPlan && PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(currentPlan)
                      ? "Schedule downgrade"
                      : "Upgrade now"}
                </Button>
              ) : (
                <Link href="/signup" className={buttonVariants()}>
                  Get started
                </Link>
              )}
              <p className="text-sm text-muted-foreground">
                {isScheduled
                  ? `${getPlanLabel(plan)} starts at the next renewal.`
                  : isCurrent
                    ? getBillingUpgradeMessage(plan)
                    : definition.name === "Free"
                      ? "Ideal for the first assistant and live verification."
                      : `Move to ${definition.name} when your workspace needs more headroom.`}
              </p>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
