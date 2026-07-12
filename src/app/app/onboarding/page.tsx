import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { CreateChatbotForm } from "@/components/chatbots/create-chatbot-form";
import { SettingsForm } from "@/components/settings/settings-form";
import { StatusBadge } from "@/components/chatbots/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getChatbotById, getChatbotsForCurrentWorkspace } from "@/features/chatbots/queries";
import { getCurrentWorkspace } from "@/features/workspaces/server";

type OnboardingPageProps = {
  searchParams: Promise<{ created?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const currentWorkspace = await getCurrentWorkspace();
  const chatbots = await getChatbotsForCurrentWorkspace();
  const created = params.created ? await getChatbotById(params.created) : chatbots[0] ?? null;

  if (!currentWorkspace) {
    return null;
  }

  if (created) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Your chatbot is ready</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The next milestone will add knowledge ingestion.
          </p>
        </div>
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{created.name}</CardTitle>
            <StatusBadge status={created.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid gap-3 text-sm">
              {["Chatbot created", "Add knowledge", "Test assistant"].map((item, index) => (
                <li key={item} className="flex items-center gap-2">
                  {index === 0 ? <CheckCircle2 className="size-4 text-primary" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span className={index === 0 ? "" : "text-muted-foreground"}>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Link href={`/app/chatbots/${created.id}`} className={buttonVariants()}>
                Open chatbot
              </Link>
              <Link href={`/app/chatbots/${created.id}?tab=knowledge`} className={buttonVariants({ variant: "outline" })}>
                Add knowledge
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Set up AskFlow</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm your workspace, then create your first chatbot.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Step 1 - Workspace</h2>
          <SettingsForm profile={currentWorkspace.profile} workspace={currentWorkspace.workspace} />
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Step 2 - Create chatbot</h2>
          <CreateChatbotForm
            defaultName={`${currentWorkspace.workspace.name} Assistant`}
            afterCreate="onboarding"
          />
        </div>
      </div>
    </section>
  );
}
