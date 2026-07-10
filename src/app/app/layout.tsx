import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MissingWorkspaceRecovery } from "@/components/dashboard/missing-workspace-recovery";
import { requireUser } from "@/features/auth/server";
import { getCurrentWorkspace } from "@/features/workspaces/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const currentWorkspace = await getCurrentWorkspace();
  const userName =
    currentWorkspace?.profile.full_name ??
    user.user_metadata.full_name ??
    user.email ??
    "AskFlow user";
  const userEmail = user.email ?? "No email";

  if (!currentWorkspace) {
    return (
      <DashboardShell
        userName={String(userName)}
        userEmail={userEmail}
        workspaceName="Workspace unavailable"
      >
        <MissingWorkspaceRecovery />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      userName={String(userName)}
      userEmail={userEmail}
      workspaceName={currentWorkspace.workspace.name}
    >
      {children}
    </DashboardShell>
  );
}
