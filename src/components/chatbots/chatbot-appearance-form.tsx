"use client";

import { useWatch, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateChatbotAppearanceAction } from "@/features/chatbots/actions";
import { chatbotAppearanceSchema, type ChatbotAppearanceInput } from "@/features/chatbots/schemas";
import type { Chatbot } from "@/features/chatbots/types";
import { cn } from "@/lib/utils";

type ChatbotAppearanceFormProps = {
  chatbot: Chatbot;
};

export function ChatbotAppearanceForm({ chatbot }: ChatbotAppearanceFormProps) {
  const form = useForm<ChatbotAppearanceInput>({
    resolver: zodResolver(chatbotAppearanceSchema),
    defaultValues: {
      chatbotId: chatbot.id,
      primaryColor: chatbot.primary_color,
      theme: chatbot.theme,
      position: chatbot.position,
    },
  });
  const values = useWatch({ control: form.control });
  const color = values.primaryColor || chatbot.primary_color;
  const theme = values.theme || chatbot.theme;
  const position = values.position || chatbot.position;

  async function onSubmit(input: ChatbotAppearanceInput) {
    const result = await updateChatbotAppearanceAction(input);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Preview dashboard styling. Public widget code comes later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register("chatbotId")} />
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary color</Label>
              <div className="flex gap-2">
                <Input id="primaryColor" className="max-w-36" {...form.register("primaryColor")} />
                <input
                  type="color"
                  className="h-8 w-10 rounded-md border bg-transparent"
                  value={color}
                  onChange={(event) => form.setValue("primaryColor", event.target.value, { shouldDirty: true })}
                  aria-label="Primary color picker"
                />
              </div>
              {form.formState.errors.primaryColor ? <p className="text-sm text-destructive">{form.formState.errors.primaryColor.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <select id="theme" className="h-8 rounded-lg border bg-background px-2 text-sm" {...form.register("theme")}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <select id="position" className="h-8 rounded-lg border bg-background px-2 text-sm" {...form.register("position")}>
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </div>
            <p className="text-sm text-muted-foreground">
              AskFlow branding remains enabled on Free.
            </p>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save appearance"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("relative h-80 rounded-lg border p-4", theme === "dark" ? "bg-zinc-950 text-white" : "bg-white")}>
            <div
              className={cn(
                "absolute bottom-4 w-64 rounded-lg border p-3 shadow-lg",
                position === "bottom-left" ? "left-4" : "right-4",
                theme === "dark" ? "border-white/10 bg-zinc-900" : "bg-white"
              )}
            >
              <p className="text-sm font-medium">{chatbot.name}</p>
              <p className={cn("mt-2 text-sm", theme === "dark" ? "text-zinc-300" : "text-muted-foreground")}>
                {chatbot.welcome_message}
              </p>
              <div className="mt-3 text-xs opacity-70">Powered by AskFlow</div>
            </div>
            <div
              className={cn("absolute bottom-4 flex size-11 items-center justify-center rounded-full text-white shadow", position === "bottom-left" ? "left-4" : "right-4")}
              style={{ backgroundColor: color }}
            >
              A
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
