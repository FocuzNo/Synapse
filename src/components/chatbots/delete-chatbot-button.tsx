"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteChatbotAction } from "@/features/chatbots/actions";

type DeleteChatbotButtonProps = {
  chatbotId: string;
  redirectAfterDelete?: boolean;
};

export function DeleteChatbotButton({
  chatbotId,
  redirectAfterDelete = true,
}: DeleteChatbotButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function deleteChatbot() {
    setPending(true);
    const result = await deleteChatbotAction({ chatbotId });
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();

    if (redirectAfterDelete) {
      router.push("/app/chatbots");
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="destructive" onClick={deleteChatbot} disabled={pending}>
          {pending ? "Deleting..." : "Confirm delete"}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button variant="destructive" onClick={() => setConfirming(true)}>
      Delete
    </Button>
  );
}
