"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateChatbotAction } from "@/features/chatbots/actions";
import { updateChatbotSchema, type UpdateChatbotInput } from "@/features/chatbots/schemas";
import type { Chatbot } from "@/features/chatbots/types";

type ChatbotGeneralFormProps = {
  chatbot: Chatbot;
};

export function ChatbotGeneralForm({ chatbot }: ChatbotGeneralFormProps) {
  const form = useForm<UpdateChatbotInput>({
    resolver: zodResolver(updateChatbotSchema),
    defaultValues: {
      chatbotId: chatbot.id,
      name: chatbot.name,
      description: chatbot.description ?? "",
      welcomeMessage: chatbot.welcome_message,
      systemPrompt: chatbot.system_prompt,
    },
  });

  async function onSubmit(values: UpdateChatbotInput) {
    const result = await updateChatbotAction(values);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>General settings</CardTitle>
        <CardDescription>These settings will shape the chatbot before knowledge is connected.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...form.register("chatbotId")} />
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Welcome message</Label>
            <Textarea id="welcomeMessage" rows={3} {...form.register("welcomeMessage")} />
            {form.formState.errors.welcomeMessage ? <p className="text-sm text-destructive">{form.formState.errors.welcomeMessage.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System prompt</Label>
            <Textarea id="systemPrompt" rows={8} {...form.register("systemPrompt")} />
            {form.formState.errors.systemPrompt ? <p className="text-sm text-destructive">{form.formState.errors.systemPrompt.message}</p> : null}
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
