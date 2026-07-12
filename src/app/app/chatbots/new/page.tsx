import Link from "next/link";
import { CreateChatbotForm } from "@/components/chatbots/create-chatbot-form";
import { buttonVariants } from "@/components/ui/button";
import { getPlanLabel } from "@/features/billing/plans";
import { getWorkspaceUsageSummary } from "@/features/billing/server";
import { getCurrentWorkspace } from "@/features/workspaces/server";
import { getChatbotCountForCurrentWorkspace } from "@/features/chatbots/queries";

export default async function NewChatbotPage() {
  const [currentWorkspace, count, usageSummary] = await Promise.all([
    getCurrentWorkspace(),
    getChatbotCountForCurrentWorkspace(),
    getWorkspaceUsageSummary(),
  ]);
  const limits = usageSummary?.limits ?? {
    maxChatbots: 1,
    maxDocuments: 5,
    maxMonthlyMessages: 100,
    maxFileSizeMb: 2,
  };
  const workspaceName = currentWorkspace?.workspace.name ?? "AskFlow";

  if (count >= limits.maxChatbots) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Create chatbot</h1>
        <div className="rounded-lg border bg-card p-6">
          <p className="font-medium">Plan limit reached</p>
          <p className="mt-2 text-sm text-muted-foreground">
            You already use {count} of {limits.maxChatbots} chatbots on the {getPlanLabel(usageSummary?.plan ?? "free")} plan.
          </p>
          <Link href="/app/billing" className={`${buttonVariants({ variant: "outline" })} mt-4`}>
            Open billing
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create chatbot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create the assistant record now. Knowledge ingestion comes in the next milestone.
        </p>
      </div>
      <CreateChatbotForm defaultName={`${workspaceName} Assistant`} />
    </section>
  );
}
