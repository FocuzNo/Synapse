import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { assertCanAccessAnalytics } from "@/features/billing/server";
import { getWorkspaceAnalyticsSummary } from "@/features/billing/analytics";

export default async function AnalyticsPage() {
  const gate = await assertCanAccessAnalytics();

  if (!gate.ok) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This route is plan-gated server-side even before analytics are implemented.
          </p>
        </div>
        <EmptyState
          icon={<BarChart3 className="size-6" />}
          title="Upgrade required"
          description={gate.message}
        />
      </section>
    );
  }

  const summary = await getWorkspaceAnalyticsSummary();

  if (!summary) {
    return <EmptyState icon={<BarChart3 className="size-6" />} title="Analytics unavailable" description="Analytics could not be loaded right now. Please try again." />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
            These counts are read from this workspace only. No estimated or placeholder numbers are shown.
        </p>
      </div>
      <EmptyState
        icon={<BarChart3 className="size-6" />}
        title="Workspace activity"
        description={`Conversations: ${summary.totalConversations}. Messages: ${summary.totalMessages}. Answered: ${summary.answeredCount}. Fallbacks: ${summary.fallbackCount}. Widget conversations: ${summary.widgetConversations}. Playground conversations: ${summary.playgroundConversations}.`}
      />
    </section>
  );
}
