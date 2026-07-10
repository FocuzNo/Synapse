import "server-only";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile, Workspace, WorkspaceMember } from "@/types/database";

type CurrentWorkspaceResult = {
  profile: Profile;
  workspace: Workspace;
  membership: WorkspaceMember;
};

function getWorkspaceNameFromUser(user: User) {
  const fullName = typeof user.user_metadata.full_name === "string"
    ? user.user_metadata.full_name.trim()
    : "";
  const companyName = typeof user.user_metadata.company_name === "string"
    ? user.user_metadata.company_name.trim()
    : "";

  if (companyName) {
    return companyName;
  }

  if (fullName) {
    return `${fullName}'s Workspace`;
  }

  return "My Workspace";
}

export async function getCurrentWorkspace(): Promise<CurrentWorkspaceResult | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,created_at,updated_at")
    .eq("id", user.id)
    .single()
    .returns<Profile>();

  if (profileError || !profile) {
    return null;
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id,owner_id,name,website,industry,created_at,updated_at")
    .eq("owner_id", user.id)
    .single()
    .returns<Workspace>();

  if (workspaceError || !workspace) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id,user_id,role,created_at")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .single()
    .returns<WorkspaceMember>();

  if (membershipError || !membership) {
    return null;
  }

  return { profile, workspace, membership };
}

export async function recoverCurrentUserWorkspace(user: User): Promise<void> {
  const admin = createSupabaseAdminClient();
  const fullName = typeof user.user_metadata.full_name === "string"
    ? user.user_metadata.full_name.trim()
    : "";

  await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      full_name: fullName || null,
    },
    { onConflict: "id" }
  );

  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .upsert(
      {
        owner_id: user.id,
        name: getWorkspaceNameFromUser(user),
      },
      { onConflict: "owner_id" }
    )
    .select("id")
    .single()
    .returns<{ id: string }>();

  if (workspaceError || !workspace) {
    throw new Error("Unable to recover workspace.");
  }

  await admin.from("workspace_members").upsert(
    {
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    },
    { onConflict: "workspace_id,user_id" }
  );
}
