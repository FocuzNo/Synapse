"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/server";
import { recoverCurrentUserWorkspace } from "@/features/workspaces/server";

export async function recoverWorkspaceAction() {
  const user = await requireUser();
  await recoverCurrentUserWorkspace(user);
  revalidatePath("/app", "layout");
  redirect("/app");
}
