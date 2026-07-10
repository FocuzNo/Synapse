import Link from "next/link";
import { Bot, CheckCircle2, Circle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/chatbots/status-badge";
import { requireUser } from "@/features/auth/server";
import { getCurrentWorkspace } from "@/features/workspaces/server";
import { getChatbotsForCurrentWorkspace } from "@/features/chatbots/queries";
import { getWorkspacePlan } from "@/features/billing/plans";

const checklist = [
  { label: "Account created", done: true },
  { label: "Workspace created", done: true },
  { label: "Create chatbot", done: false },
  { label: "Upload knowledge", done: false },
  { label: "Test assistant", done: false },
];

export default async function AppOverviewPage() {
  const user = await requireUser();
  const currentWorkspace = await getCurrentWorkspace();
  const chatbots = await getChatbotsForCurrentWorkspace();
  const plan = getWorkspacePlan();
  const displayName =
    currentWorkspace?.profile.full_name ??
    user.user_metadata.full_name ??
    user.email ??
    "there";

  const hasChatbot = chatbots.length > 0;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {String(displayName)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentWorkspace
            ? `${currentWorkspace.workspace.name} is on the Free plan.`
            : "Workspace recovery is available from this protected area."}
        </p>
      </div>
      {currentWorkspace ? (
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Workspace</CardTitle>
            <Badge variant="secondary">{plan[0].toUpperCase() + plan.slice(1)}</Badge>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{currentWorkspace.workspace.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasChatbot
                ? "Next action: add knowledge to your assistant."
                : "Create your first chatbot to continue setup."}
            </p>
          </CardContent>
        </Card>
      ) : null}
      {hasChatbot ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Chatbots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{chatbots.length} chatbot created.</p>
            <div className="grid gap-3">
              {chatbots.slice(0, 3).map((chatbot) => (
                <div key={chatbot.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Link className="font-medium hover:underline" href={`/app/chatbots/${chatbot.id}`}>
                      {chatbot.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{chatbot.description || "No description yet."}</p>
                  </div>
                  <StatusBadge status={chatbot.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Onboarding checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 text-sm">
            {checklist.map((item) => {
              const done = item.label === "Create chatbot" ? hasChatbot : item.done;
              return (
              <li key={item.label} className="flex items-center gap-2">
                {done ? (
                  <CheckCircle2 className="size-4 text-primary" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className={done ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      {!hasChatbot ? (
        <EmptyState
          icon={<Bot className="size-6" />}
          title="No chatbots yet"
          description="Create your first chatbot, then add knowledge in the next milestone."
          action={<Link href="/app/onboarding" className={buttonVariants()}>Start onboarding</Link>}
        />
      ) : (
        <EmptyState
          icon={<Bot className="size-6" />}
          title="Knowledge comes next"
          description="TXT upload, chunking, embeddings, and grounded answers are the recommended next milestone."
          action={<Link href={`/app/chatbots/${chatbots[0].id}?tab=knowledge`} className={buttonVariants({ variant: "outline" })}>Add knowledge</Link>}
        />
      )}
    </section>
  );
}
