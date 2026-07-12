"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettingsAction } from "@/features/settings/actions";
import type { Profile, Workspace } from "@/types/database";

const settingsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  workspaceName: z.string().trim().min(2, "Enter a workspace name."),
  website: z.union([z.url("Enter a valid URL."), z.literal("")]),
  industry: z.string().trim().max(80, "Industry is too long.").optional(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

type SettingsFormProps = {
  profile: Profile;
  workspace: Workspace;
};

export function SettingsForm({ profile, workspace }: SettingsFormProps) {
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      fullName: profile.full_name ?? "",
      workspaceName: workspace.name,
      website: workspace.website ?? "",
      industry: workspace.industry ?? "",
    },
  });

  async function onSubmit(values: SettingsValues) {
    const result = await updateSettingsAction(values);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    form.reset({
      fullName: values.fullName.trim(),
      workspaceName: values.workspaceName.trim(),
      website: values.website.trim(),
      industry: values.industry?.trim() ?? "",
    });
    toast.success(result.message);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your email is managed by Supabase Auth.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              autoComplete="name"
              aria-invalid={Boolean(form.formState.errors.fullName)}
              {...form.register("fullName")}
            />
            {form.formState.errors.fullName ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.fullName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled readOnly />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>These values belong to your current workspace.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="workspaceName">Workspace name</Label>
            <Input
              id="workspaceName"
              aria-invalid={Boolean(form.formState.errors.workspaceName)}
              {...form.register("workspaceName")}
            />
            {form.formState.errors.workspaceName ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.workspaceName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              placeholder="https://example.com"
              aria-invalid={Boolean(form.formState.errors.website)}
              {...form.register("website")}
            />
            {form.formState.errors.website ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.website.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" placeholder="SaaS" {...form.register("industry")} />
          </div>
          <Button className="w-fit" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save settings"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
