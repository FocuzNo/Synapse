import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/types/database";

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge variant={status === "ready" ? "default" : "secondary"}>{status}</Badge>;
}
