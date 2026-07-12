"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateChatbotStatusAction } from "@/features/chatbots/actions";
import type { Chatbot, ChatbotStatus } from "@/features/chatbots/types";

type ChatbotStatusActionsProps = {
  chatbot: Chatbot;
};

function nextStatus(status: ChatbotStatus): ChatbotStatus {
  if (status === "draft") return "active";
  if (status === "active") return "disabled";
  return "active";
}

export function ChatbotStatusActions({ chatbot }: ChatbotStatusActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const target = nextStatus(chatbot.status);

  async function updateStatus() {
    setPending(true);
    const result = await updateChatbotStatusAction({
      chatbotId: chatbot.id,
      status: target,
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={updateStatus} disabled={pending}>
      {pending ? "Updating..." : target === "active" ? "Activate" : "Disable"}
    </Button>
  );
}
