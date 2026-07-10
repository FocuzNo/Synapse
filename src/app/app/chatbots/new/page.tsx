import Link from "next/link";
import { CreateChatbotForm } from "@/components/chatbots/create-chatbot-form";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentWorkspace } from "@/features/workspaces/server";
import { getChatbotCountForCurrentWorkspace } from "@/features/chatbots/queries";
import { getPlanLimits } from "@/features/billing/plans";

export default async function NewChatbotPage() {
  const currentWorkspace = await getCurrentWorkspace();
  const count = await getChatbotCountForCurrentWorkspace();
  const limits = getPlanLimits();
  const workspaceName = currentWorkspace?.workspace.name ?? "AskFlow";

  if (count >= limits.maxChatbots) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Create chatbot</h1>
        <div className="rounded-lg border bg-card p-6">
          <p className="font-medium">Free plan limit reached</p>
          <p className="mt-2 text-sm text-muted-foreground">
            You already use {count} of {limits.maxChatbots} chatbots. Upgrade flow is planned with billing.
          </p>
          <Link href="/app/chatbots" className={`${buttonVariants({ variant: "outline" })} mt-4`}>
            Back to chatbots
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
