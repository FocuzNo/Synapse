"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/server";
import { recoverCurrentUserWorkspace } from "@/features/workspaces/server";

export type RecoverWorkspaceState = {
  ok: boolean;
  message: string;
};

export async function recoverWorkspaceAction(
  previousState: RecoverWorkspaceState
): Promise<RecoverWorkspaceState> {
  void previousState;

  try {
    const user = await requireUser();
    await recoverCurrentUserWorkspace(user);
    revalidatePath("/app", "layout");
  } catch (error) {
    console.error("Workspace recovery failed", {
      message: error instanceof Error ? error.message : "unknown",
    });

    return {
      ok: false,
      message: "Workspace recovery failed. Check schema and PostgREST readiness, then try again.",
    };
  }

  redirect("/app");
}
