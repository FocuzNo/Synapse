import Link from "next/link";
import { Bot, MoreHorizontal } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/chatbots/status-badge";
import { ChatbotStatusActions } from "@/components/chatbots/chatbot-status-actions";
import { DeleteChatbotButton } from "@/components/chatbots/delete-chatbot-button";
import { getPlanLabel } from "@/features/billing/plans";
import { getWorkspaceUsageSummary } from "@/features/billing/server";
import { getChatbotsForCurrentWorkspace } from "@/features/chatbots/queries";

export default async function ChatbotsPage() {
  const [chatbots, usageSummary] = await Promise.all([
    getChatbotsForCurrentWorkspace(),
    getWorkspaceUsageSummary(),
  ]);
  const limits = usageSummary?.limits ?? {
    maxChatbots: 1,
    maxDocuments: 5,
    maxMonthlyMessages: 100,
    maxFileSizeMb: 2,
  };
  const plan = usageSummary?.plan ?? "free";
  const atLimit = chatbots.length >= limits.maxChatbots;

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Chatbots</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {chatbots.length} of {limits.maxChatbots} chatbots used on the {getPlanLabel(plan)} plan.
          </p>
        </div>
        {atLimit ? (
          <div className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
            Limit reached. Visit Billing to upgrade this workspace.
          </div>
        ) : (
          <Link href="/app/chatbots/new" className={buttonVariants()}>
            Create chatbot
          </Link>
        )}
      </div>

      {chatbots.length === 0 ? (
        <EmptyState
          icon={<Bot className="size-6" />}
          title="Create your first chatbot"
          description="Turn your workspace knowledge into a focused support assistant. Knowledge upload is next."
          action={
            atLimit ? (
              <Link href="/app/billing" className={buttonVariants()}>
                Upgrade workspace
              </Link>
            ) : (
              <Link href="/app/chatbots/new" className={buttonVariants()}>
                Create chatbot
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4">
          {chatbots.map((chatbot) => (
            <Card key={chatbot.id} className="overflow-visible shadow-sm">
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{chatbot.name}</CardTitle>
                  <CardDescription>{chatbot.description || "No description yet."}</CardDescription>
                </div>
                <StatusBadge status={chatbot.status} />
              </CardHeader>
              <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <p className="text-sm text-muted-foreground">
                  Created {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(chatbot.created_at))}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/app/chatbots/${chatbot.id}`} className={buttonVariants({ variant: "outline" })}>
                    Open
                  </Link>
                  <details className="relative">
                    <summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-lg border px-2 text-sm">
                      <MoreHorizontal className="size-4" />
                      More
                    </summary>
                    <div className="absolute right-0 z-10 mt-2 grid min-w-44 gap-2 rounded-lg border bg-card p-2 shadow">
                      <Link href={`/app/chatbots/${chatbot.id}?tab=overview`} className="px-2 py-1 text-sm hover:bg-muted">
                        Edit
                      </Link>
                      <ChatbotStatusActions chatbot={chatbot} />
                      <DeleteChatbotButton chatbotId={chatbot.id} redirectAfterDelete={false} />
                    </div>
                  </details>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
