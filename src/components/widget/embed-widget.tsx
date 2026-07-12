"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  PublicChatFailure,
  PublicChatHistorySuccess,
  PublicChatMessage,
  PublicChatSuccess,
  PublicChatbotConfig,
} from "@/features/widget/types";

type EmbedWidgetProps = {
  publicId: string;
};

type WidgetMessage = PublicChatMessage;

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getStorageKey(publicId: string) {
  return `askflow-widget-session:${publicId}`;
}

function subscribeToWidgetSession() {
  return () => {};
}

function readWidgetSession(publicId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const key = getStorageKey(publicId);
  const existing = window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const next = createSessionId();
  window.localStorage.setItem(key, next);
  return next;
}

export function EmbedWidget({ publicId }: EmbedWidgetProps) {
  const [config, setConfig] = useState<PublicChatbotConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sessionId = useSyncExternalStore(
    subscribeToWidgetSession,
    () => readWidgetSession(publicId),
    () => null
  );

  useEffect(() => {
    let ignore = false;

    async function loadConfigAndHistory() {
      setLoadingConfig(true);
      const response = await fetch(`/api/public/chatbots/${publicId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        available: boolean;
        chatbot: PublicChatbotConfig | null;
      };

      if (ignore) {
        return;
      }

      if (!payload.available || !payload.chatbot) {
        setUnavailable(true);
        setConfig(null);
        setMessages([]);
        setLoadingConfig(false);
        return;
      }

      setConfig(payload.chatbot);
      setUnavailable(false);
      const historyResponse = sessionId
        ? await fetch(
            `/api/public/chat?chatbotId=${encodeURIComponent(publicId)}&sessionId=${encodeURIComponent(sessionId)}`,
            {
              cache: "no-store",
            }
          )
        : null;
      const historyPayload = historyResponse
        ? ((await historyResponse.json()) as PublicChatHistorySuccess)
        : null;
      const historyMessages = historyPayload?.ok ? historyPayload.messages : [];

      setMessages(
        historyMessages.length > 0
          ? historyMessages
          : [
              {
                id: "welcome",
                role: "assistant",
                content: payload.chatbot.welcomeMessage,
                sources: [],
                isAnswered: true,
              },
            ]
      );
      setLoadingConfig(false);
    }

    void loadConfigAndHistory();

    return () => {
      ignore = true;
    };
  }, [publicId, sessionId]);

  async function sendMessage() {
    const question = input.trim();
    if (!question || pending || !config || !sessionId) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    const optimisticUserId = `user-${Date.now()}`;
    setMessages((current) => [
      ...current,
      {
        id: optimisticUserId,
        role: "user",
        content: question,
        sources: [],
        isAnswered: true,
      },
    ]);
    setInput("");

    const response = await fetch("/api/public/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatbotId: publicId,
        sessionId,
        message: question,
      }),
    });

    const payload = (await response.json()) as PublicChatSuccess | PublicChatFailure;
    setPending(false);

    if (!response.ok || !payload.ok) {
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticUserId)
      );
      setInput(question);
      setErrorMessage(
        "message" in payload
          ? payload.message
          : "The assistant could not answer right now."
      );
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: payload.answer,
        sources: payload.sources,
        isAnswered: payload.isAnswered,
      },
    ]);
  }

  const dark = config?.theme === "dark";

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border shadow-2xl",
        dark ? "border-white/10 bg-zinc-950 text-white" : "bg-white"
      )}
    >
      <div
        className="flex items-center justify-between px-4 py-3 text-sm font-medium text-white"
        style={{ backgroundColor: config?.primaryColor ?? "#6D5DFB" }}
      >
        <div className="truncate">{config?.name ?? "AskFlow assistant"}</div>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          onClick={() => window.parent.postMessage({ type: "askflow:close" }, "*")}
          aria-label="Close widget"
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto px-4 py-4",
          dark ? "bg-zinc-950" : "bg-slate-50"
        )}
      >
        {loadingConfig ? (
          <p className="text-sm text-muted-foreground">Loading assistant...</p>
        ) : unavailable ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">This assistant is unavailable.</p>
            <p className="text-muted-foreground">
              Please try again later.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                  message.role === "user"
                    ? "ml-auto text-white"
                    : dark
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-foreground"
                )}
                style={
                  message.role === "user"
                    ? { backgroundColor: config?.primaryColor ?? "#6D5DFB" }
                    : undefined
                }
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.role === "assistant" && message.sources.length > 0 ? (
                  <div className="mt-3 space-y-2 border-t border-black/5 pt-2">
                    <p className="text-xs font-medium opacity-70">Sources</p>
                    {message.sources.map((source) => (
                      <details
                        key={`${message.id}-${source.sourceNumber}`}
                        className={cn(
                          "rounded-xl border px-2 py-1.5 text-xs",
                          dark ? "border-white/10" : "border-slate-200"
                        )}
                      >
                        <summary className="cursor-pointer font-medium">
                          Source {source.sourceNumber}: {source.filename}
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap opacity-80">
                          {source.excerpt}
                        </p>
                      </details>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {pending ? (
              <p className="text-sm text-muted-foreground">Thinking...</p>
            ) : null}
          </div>
        )}
      </div>

      <div
        className={cn(
          "border-t px-4 py-3",
          dark ? "border-white/10 bg-zinc-950" : "bg-white"
        )}
      >
        {errorMessage ? (
          <p className="mb-2 text-xs text-destructive">{errorMessage}</p>
        ) : null}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
        >
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              unavailable
                ? "Assistant unavailable"
                : "Ask a question about this knowledge base..."
            }
            rows={2}
            disabled={pending || unavailable || loadingConfig || !sessionId}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <Button
            type="submit"
            disabled={
              pending ||
              unavailable ||
              loadingConfig ||
              !sessionId ||
              input.trim().length < 2
            }
            className="self-end"
          >
            <Send className="size-4" />
            Send
          </Button>
        </form>
        {config?.brandingEnabled ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Powered by AskFlow
          </p>
        ) : null}
      </div>
    </div>
  );
}
