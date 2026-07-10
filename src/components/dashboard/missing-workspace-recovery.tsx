import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { recoverWorkspaceAction } from "@/features/workspaces/actions";

export function MissingWorkspaceRecovery() {
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
      <CardContent>
        <form action={recoverWorkspaceAction}>
          <Button type="submit">Repair workspace</Button>
        </form>
      </CardContent>
    </Card>
  );
}
