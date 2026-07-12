import { SettingsForm } from "@/components/settings/settings-form";
import { getCurrentWorkspace } from "@/features/workspaces/server";

export default async function SettingsPage() {
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your profile and workspace details.
        </p>
      </div>
      <SettingsForm
        profile={currentWorkspace.profile}
        workspace={currentWorkspace.workspace}
      />
    </section>
  );
}
