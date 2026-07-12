import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, Database, MessagesSquare } from "lucide-react";
import { getServerEnv } from "@/lib/env/server";
import { ChatbotAppearanceForm } from "@/components/chatbots/chatbot-appearance-form";
import { ChatbotGeneralForm } from "@/components/chatbots/chatbot-general-form";
import { InstallSnippetCard } from "@/components/chatbots/install-snippet-card";
import { ChatbotStatusActions } from "@/components/chatbots/chatbot-status-actions";
import { DeleteChatbotButton } from "@/components/chatbots/delete-chatbot-button";
import { StatusBadge } from "@/components/chatbots/status-badge";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { KnowledgeUploadForm } from "@/components/documents/knowledge-panel";
import { PlaygroundChat } from "@/components/playground/playground-chat";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspacePlanLimits } from "@/features/billing/server";
import { getChatbotById } from "@/features/chatbots/queries";
import { getConversationWithMessages, getConversationsForChatbot } from "@/features/conversations/queries";
import { getDocumentsForChatbot, getReadyDocumentCount } from "@/features/documents/queries";
import { buildWidgetEmbedCode } from "@/features/widget/logic";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "playground", label: "Playground" },
  { key: "knowledge", label: "Knowledge" },
  { key: "conversations", label: "Conversations" },
  { key: "appearance", label: "Appearance" },
  { key: "install", label: "Install" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

type ChatbotDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; conversation?: string }>;
};

function getTab(value?: string): TabKey {
  return tabs.some((tab) => tab.key === value) ? (value as TabKey) : "overview";
}

export default async function ChatbotDetailPage({
  params,
  searchParams,
}: ChatbotDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const chatbot = await getChatbotById(id);

  if (!chatbot) {
    notFound();
  }

  const activeTab = getTab(query.tab);
  const readyDocumentCount = await getReadyDocumentCount(chatbot.id);
  const planLimits = await getWorkspacePlanLimits();
  const documents = activeTab === "knowledge" ? await getDocumentsForChatbot(chatbot.id) : [];
  const conversations =
    activeTab === "playground" || activeTab === "conversations"
      ? await getConversationsForChatbot(chatbot.id)
      : [];
  const activeConversation =
    activeTab === "playground"
      ? await getConversationWithMessages(chatbot.id, query.conversation ?? null)
      : null;
  const appUrl = getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const embedCode = buildWidgetEmbedCode({
    appUrl,
    publicId: chatbot.public_id,
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{chatbot.name}</h1>
            <StatusBadge status={chatbot.status} />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {chatbot.description || "No description yet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ChatbotStatusActions chatbot={chatbot} />
          <DeleteChatbotButton chatbotId={chatbot.id} />
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto border-b pb-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/app/chatbots/${chatbot.id}?tab=${tab.key}`}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
              activeTab === tab.key && "bg-primary/10 text-primary"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <>
          <ChatbotGeneralForm chatbot={chatbot} />
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="size-5" />
                Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This chatbot has {readyDocumentCount} ready document
                {readyDocumentCount === 1 ? "" : "s"}. Activation from draft
                now requires at least one ready TXT document.
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}

      {activeTab === "appearance" ? (
        <ChatbotAppearanceForm
          chatbot={chatbot}
          canRemoveBranding={planLimits.brandingRemoval}
        />
      ) : null}

      {activeTab === "knowledge" ? (
        <div className="space-y-4">
          <KnowledgeUploadForm chatbotId={chatbot.id} />
          {documents.length === 0 ? (
            <EmptyState
              icon={<Database className="size-6" />}
              title="No knowledge files yet"
              description="Upload a UTF-8 .txt file. AskFlow will process it synchronously into chunks and embeddings."
            />
          ) : (
            <div className="grid gap-3">
              {documents.map((document) => (
                <Card key={document.id} className="shadow-sm">
                  <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{document.original_filename}</p>
                        <DocumentStatusBadge status={document.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(document.size_bytes / 1024).toFixed(1)} KB · {document.chunks_count} chunks · Uploaded{" "}
                        {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(document.created_at))}
                      </p>
                      {document.error_message ? (
                        <p className="mt-2 text-sm text-destructive">{document.error_message}</p>
                      ) : null}
                    </div>
                    <DeleteDocumentButton documentId={document.id} chatbotId={chatbot.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "playground" ? (
        <PlaygroundChat
          key={query.conversation ?? "new-conversation"}
          chatbotId={chatbot.id}
          hasReadyDocuments={readyDocumentCount > 0}
          conversations={conversations}
          activeConversation={activeConversation}
        />
      ) : null}

      {activeTab === "conversations" ? (
        conversations.length === 0 ? (
          <EmptyState
            icon={<MessagesSquare className="size-6" />}
            title="No conversations yet"
            description="Use the Playground to ask questions. Conversations persist after refresh."
          />
        ) : (
          <div className="grid gap-3">
            {conversations.map((conversation) => (
              <Card key={conversation.id} className="shadow-sm">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{conversation.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Last message{" "}
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(conversation.last_message_at))}
                    </p>
                  </div>
                  <Link
                    href={`/app/chatbots/${chatbot.id}?tab=playground&conversation=${conversation.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Open
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {activeTab === "install" ? (
        <InstallSnippetCard
          chatbotPublicId={chatbot.public_id}
          chatbotStatus={chatbot.status}
          hasReadyDocuments={readyDocumentCount > 0}
          appUrl={appUrl}
          embedCode={embedCode}
        />
      ) : null}
    </section>
  );
}
