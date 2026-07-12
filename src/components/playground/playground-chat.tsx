"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { askPlaygroundQuestionAction } from "@/features/rag/actions";
import type { Conversation, ConversationWithMessages, MessageWithSources } from "@/features/conversations/types";
import { cn } from "@/lib/utils";
import { ConversationTitleControl } from "@/components/playground/conversation-title-control";

const suggestions = [
  "What does the documentation say about getting started?",
  "How can users manage their account?",
  "What support options are available?",
];

type PlaygroundChatProps = {
  chatbotId: string;
  hasReadyDocuments: boolean;
  conversations: Conversation[];
  activeConversation: ConversationWithMessages | null;
};

export function PlaygroundChat({
  chatbotId,
  hasReadyDocuments,
  conversations,
  activeConversation,
}: PlaygroundChatProps) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState(activeConversation?.id ?? null);
  const [messages, setMessages] = useState<MessageWithSources[]>(activeConversation?.messages ?? []);
  const activeId = conversationId ?? activeConversation?.id ?? null;
  const optimisticIdRef = useRef(0);

  async function sendQuestion(value = question) {
    const trimmed = value.trim();
    if (!trimmed || pending || !hasReadyDocuments) return;

    setPending(true);
    optimisticIdRef.current += 1;
    const optimisticUserId = `local-user-${optimisticIdRef.current}`;
    setMessages((current) => [
      ...current,
      {
        id: optimisticUserId,
        conversation_id: conversationId ?? "pending",
        role: "user",
        content: trimmed,
        input_tokens: null,
        output_tokens: null,
        is_answered: true,
        created_at: new Date().toISOString(),
        sources: [],
      },
    ]);
    setQuestion("");

    const result = await askPlaygroundQuestionAction({
      chatbotId,
      conversationId,
      question: trimmed,
    });
    setPending(false);

    if (!result.ok) {
      setMessages((current) => current.filter((message) => message.id !== optimisticUserId));
      setQuestion(trimmed);
      toast.error(result.message);
      return;
    }

    setConversationId(result.data.conversationId);
    setMessages((current) => [
      ...current,
      {
        id: `local-assistant-${optimisticIdRef.current}`,
        conversation_id: result.data.conversationId,
        role: "assistant",
        content: result.data.answer,
        input_tokens: null,
        output_tokens: null,
        is_answered: result.data.isAnswered,
        created_at: new Date().toISOString(),
        sources: result.data.sources.map((source) => ({
          id: source.chunkId,
          filename: source.filename,
          content: source.content,
          similarityScore: source.similarityScore,
        })),
      },
    ]);
    router.replace(`/app/chatbots/${chatbotId}?tab=playground&conversation=${result.data.conversationId}`);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Card className="min-w-0 overflow-visible shadow-sm">
        <CardContent className="p-3">
          <Link href={`/app/chatbots/${chatbotId}?tab=playground`} className={buttonVariants({ variant: "outline" })}>
            New conversation
          </Link>
          <div className="mt-4 grid gap-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  activeId === conversation.id && "bg-primary/10 text-primary"
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <Link
                    href={`/app/chatbots/${chatbotId}?tab=playground&conversation=${conversation.id}`}
                    className="min-w-0 flex-1 break-words hover:underline"
                    title={conversation.title}
                  >
                    <span className="block line-clamp-2 leading-5">{conversation.title}</span>
                  </Link>
                  <ConversationTitleControl key={`${conversation.id}-${conversation.title}`} chatbotId={chatbotId} conversationId={conversation.id} title={conversation.title} />
                </div>
                <span className="text-xs text-muted-foreground">{new Date(conversation.last_message_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="flex min-h-[560px] flex-col p-4">
          {!hasReadyDocuments ? (
            <div className="m-auto max-w-md text-center">
              <h2 className="text-lg font-medium">Add knowledge first</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload and process a TXT document before asking questions.
              </p>
              <Link href={`/app/chatbots/${chatbotId}?tab=knowledge`} className={`${buttonVariants()} mt-4`}>
                Add knowledge
              </Link>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">Try a suggested question:</p>
                    {suggestions.map((suggestion) => (
                      <Button key={suggestion} variant="outline" className="justify-start" onClick={() => sendQuestion(suggestion)}>
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                ) : null}
                {messages.map((message) => (
                  <div key={message.id} className={cn("max-w-[85%] rounded-lg border p-3", message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-card")}>
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    {message.role === "assistant" && !message.is_answered ? (
                      <p className="mt-2 text-xs text-muted-foreground">Fallback answer</p>
                    ) : null}
                    {message.sources.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Sources</p>
                        {message.sources.map((source, index) => (
                          <details key={source.id} className="rounded-md border p-2 text-xs">
                            <summary className="cursor-pointer font-medium">
                              Source {index + 1}: {source.filename}
                            </summary>
                            <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-muted-foreground">
                              {source.content}
                            </p>
                          </details>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                {pending ? <p className="text-sm text-muted-foreground">Thinking...</p> : null}
              </div>
              <form
                className="mt-4 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendQuestion();
                }}
              >
                <Textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask from the uploaded knowledge..."
                  rows={2}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendQuestion();
                    }
                  }}
                />
                <Button type="submit" disabled={pending || !question.trim()}>
                  <Send className="size-4" />
                  Send
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
