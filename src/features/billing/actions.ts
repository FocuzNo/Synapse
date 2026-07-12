"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/features/auth/server";
import { getPlanChangeDirection } from "@/features/billing/logic";
import { getPlanLabel } from "@/features/billing/plans";
import { changePlanSchema, type ChangePlanInput } from "@/features/billing/schemas";
import { getWorkspaceSubscription } from "@/features/billing/server";
import { getCurrentWorkspace } from "@/features/workspaces/server";
import type { BillingActionResult, BillingErrorCode, PlanKey } from "@/features/billing/types";

function billingError<T>(code: BillingErrorCode, message: string): BillingActionResult<T> {
  return { ok: false, code, message };
}

export async function changeWorkspacePlanAction(
  input: ChangePlanInput
): Promise<BillingActionResult<{ effectivePlan: PlanKey; scheduledPlan: PlanKey | null }>> {
  await requireUser();
  const parsed = changePlanSchema.safeParse(input);

  if (!parsed.success) {
    return billingError("VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const subscription = await getWorkspaceSubscription();
  const currentWorkspace = await getCurrentWorkspace();

  if (!subscription || !currentWorkspace) {
    return billingError("WORKSPACE_NOT_FOUND", "Workspace was not found.");
  }

  if (!["owner", "admin"].includes(currentWorkspace.membership.role)) {
    return billingError("FORBIDDEN", "You do not have permission to change billing.");
  }

  const currentPlan = subscription.effectivePlan;
  const targetPlan = parsed.data.plan;
  const direction = getPlanChangeDirection(currentPlan, targetPlan);

  if (direction === "same" && subscription.scheduledPlan === null && !subscription.cancelAtPeriodEnd) {
    return billingError("INVALID_PLAN_TRANSITION", `Workspace is already on ${getPlanLabel(targetPlan)}.`);
  }

  const supabase = createSupabaseAdminClient();

  if (direction === "upgrade" || targetPlan === currentPlan) {
    const { error } = await supabase.from("subscriptions").upsert(
      {
        workspace_id: subscription.workspace.id,
        provider: "mock",
        plan_key: targetPlan,
        scheduled_plan_key: null,
        status: "active",
        billing_email: null,
        cancel_at_period_end: false,
        current_period_start: new Date().toISOString(),
        current_period_end: null,
      },
      { onConflict: "workspace_id" }
    );

    if (error) {
      console.error("Mock billing upgrade failed", {
        code: error.code,
        workspaceId: subscription.workspace.id,
        targetPlan,
      });
      return billingError("DATABASE_ERROR", "Plan change could not be saved.");
    }

    revalidatePath("/app", "layout");
    revalidatePath("/app");
    revalidatePath("/app/billing");
    revalidatePath("/app/chatbots");

    return {
      ok: true,
      data: { effectivePlan: targetPlan, scheduledPlan: null },
      message:
        targetPlan === currentPlan
          ? "Scheduled downgrade canceled."
          : `${getPlanLabel(targetPlan)} is active now.`,
    };
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        workspace_id: subscription.workspace.id,
        provider: "mock",
        plan_key: currentPlan,
        scheduled_plan_key: targetPlan,
        status: "active",
        cancel_at_period_end: true,
        billing_email: null,
        current_period_start:
          subscription.currentPeriodStart ?? new Date().toISOString(),
        current_period_end:
          subscription.currentPeriodEnd ??
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "workspace_id" }
    );

  if (error) {
    console.error("Mock billing downgrade scheduling failed", {
      code: error.code,
      workspaceId: subscription.workspace.id,
      targetPlan,
    });
    return billingError("DATABASE_ERROR", "Plan change could not be scheduled.");
  }

  revalidatePath("/app", "layout");
  revalidatePath("/app");
  revalidatePath("/app/billing");

  return {
    ok: true,
    data: { effectivePlan: currentPlan, scheduledPlan: targetPlan },
    message: `${getPlanLabel(targetPlan)} will start at the end of the current billing period.`,
  };
}
