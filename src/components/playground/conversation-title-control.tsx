"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renameConversationAction } from "@/features/conversations/actions";

export function ConversationTitleControl({ chatbotId, conversationId, title }: {
  chatbotId: string;
  conversationId: string;
  title: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [pending, setPending] = useState(false);

  async function save() {
    if (pending) return;
    setPending(true);
    const result = await renameConversationAction({ chatbotId, conversationId, title: value });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setValue(result.data.title);
    setEditing(false);
    toast.success("Conversation renamed");
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="truncate">{value}</span>
        <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setEditing(true)} aria-label="Rename conversation">
          <Pencil className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void save()} maxLength={120} className="h-8" autoFocus />
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => void save()} disabled={pending} aria-label="Save conversation name"><Check className="size-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => { setValue(title); setEditing(false); }} disabled={pending} aria-label="Cancel rename"><X className="size-3.5" /></Button>
    </div>
  );
}
