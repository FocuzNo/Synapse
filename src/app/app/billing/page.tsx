import { CreditCard, Gauge, ShieldCheck } from "lucide-react";
import { PricingCards } from "@/components/billing/pricing-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceSubscription, getWorkspaceUsageSummary } from "@/features/billing/server";
import { getPlanLabel } from "@/features/billing/plans";

export default async function BillingPage() {
  const [subscription, usageSummary] = await Promise.all([
    getWorkspaceSubscription(),
    getWorkspaceUsageSummary(),
  ]);

  if (!subscription || !usageSummary) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AskFlow is using a mock billing provider in this milestone. Upgrades apply immediately, while downgrades are scheduled for period end.
          </p>
        </div>
        <Badge variant="secondary">Provider: {subscription.provider}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              Current plan
            </CardTitle>
            <CardDescription>Workspace subscription snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{getPlanLabel(subscription.effectivePlan)}</p>
            <p className="text-muted-foreground">
              Status: {subscription.status}
            </p>
            {subscription.scheduledPlan ? (
              <p className="text-muted-foreground">
                Scheduled change: {getPlanLabel(subscription.scheduledPlan)}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-5" />
              Current usage
            </CardTitle>
            <CardDescription>Server-side feature gating uses these values.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Chatbots: <span className="font-medium">{usageSummary.chatbotsUsed} / {usageSummary.limits.maxChatbots}</span>
            </p>
            <p>
              Documents: <span className="font-medium">{usageSummary.documentsUsed} / {usageSummary.limits.maxDocuments}</span>
            </p>
            <p>
              AI messages: <span className="font-medium">{usageSummary.monthlyMessagesUsed} / {usageSummary.limits.maxMonthlyMessages}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              Entitlements
            </CardTitle>
            <CardDescription>Applied from the active plan, not from the UI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Branding removal: {usageSummary.plan === "free" ? "No" : "Yes"}</p>
            <p>Analytics: {usageSummary.plan === "free" ? "No" : "Yes"}</p>
            <p>
              Conversation retention: {usageSummary.conversationRetentionDays === null ? "Unlimited" : `${usageSummary.conversationRetentionDays} days`}
            </p>
          </CardContent>
        </Card>
      </div>

      <PricingCards
        currentPlan={subscription.effectivePlan}
        scheduledPlan={subscription.scheduledPlan}
        interactive
      />
    </section>
  );
}
