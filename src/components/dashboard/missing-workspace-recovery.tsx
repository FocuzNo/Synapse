"use client";

import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  recoverWorkspaceAction,
  type RecoverWorkspaceState,
} from "@/features/workspaces/actions";

const initialState: RecoverWorkspaceState = {
  ok: true,
  message: "",
};

export function MissingWorkspaceRecovery() {
  const [state, formAction, pending] = useActionState(recoverWorkspaceAction, initialState);

  return (
    <Card className="max-w-2xl shadow-sm">
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <AlertTriangle className="size-5" />
        </div>
        <CardTitle>Workspace setup needs repair</CardTitle>
        <CardDescription>
          Your account is signed in, but the workspace records are missing. This
          can happen for legacy users or if the signup trigger did not finish.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!state.ok && state.message ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.message}
          </div>
        ) : null}
        <form action={formAction}>
          <Button type="submit" disabled={pending}>
            {pending ? "Repairing..." : "Repair workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
