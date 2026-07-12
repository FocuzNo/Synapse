"use client";

import { useState } from "react";
import { MoreHorizontal, Check, X } from "lucide-react";
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
      <details className="relative shrink-0">
        <summary className="flex size-7 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Conversation actions">
          <MoreHorizontal className="size-4" />
        </summary>
        <div className="absolute right-0 z-20 mt-1 min-w-28 rounded-md border bg-card p-1 shadow-md">
          <button type="button" className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setEditing(true); }}>
            Rename
          </button>
        </div>
      </details>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input aria-label="Conversation name" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void save(); if (event.key === "Escape") { setValue(title); setEditing(false); } }} maxLength={80} className="h-8" autoFocus />
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => void save()} disabled={pending} aria-label="Save conversation name"><Check className="size-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => { setValue(title); setEditing(false); }} disabled={pending} aria-label="Cancel rename"><X className="size-3.5" /></Button>
    </div>
  );
}
