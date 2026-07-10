"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createChatbotAction } from "@/features/chatbots/actions";
import { createChatbotSchema, type CreateChatbotInput } from "@/features/chatbots/schemas";

type CreateChatbotFormProps = {
  defaultName: string;
  defaultWelcomeMessage?: string;
  afterCreate?: "detail" | "onboarding";
};

export function CreateChatbotForm({
  defaultName,
  defaultWelcomeMessage = "Hi! How can I help you today?",
  afterCreate = "detail",
}: CreateChatbotFormProps) {
  const router = useRouter();
  const [domainError, setDomainError] = useState<string | null>(null);
  const form = useForm<CreateChatbotInput>({
    resolver: zodResolver(createChatbotSchema),
    defaultValues: {
      name: defaultName,
      description: "",
      welcomeMessage: defaultWelcomeMessage,
    },
  });

  async function onSubmit(values: CreateChatbotInput) {
    setDomainError(null);
    const result = await createChatbotAction(values);

    if (!result.ok) {
      setDomainError(result.message);
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Chatbot created.");
    router.refresh();
    router.push(
      afterCreate === "onboarding"
        ? `/app/onboarding?created=${result.data.id}`
        : `/app/chatbots/${result.data.id}`
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Create chatbot</CardTitle>
        <CardDescription>
          Start with basic assistant settings. Knowledge upload comes next.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {domainError ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {domainError}
          </div>
        ) : null}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Short description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Answers product questions from your help docs."
              {...form.register("description")}
            />
            {form.formState.errors.description ? (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Welcome message</Label>
            <Textarea
              id="welcomeMessage"
              rows={3}
              aria-invalid={Boolean(form.formState.errors.welcomeMessage)}
              {...form.register("welcomeMessage")}
            />
            {form.formState.errors.welcomeMessage ? (
              <p className="text-sm text-destructive">{form.formState.errors.welcomeMessage.message}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating..." : "Create chatbot"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
