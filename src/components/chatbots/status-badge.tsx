import { Badge } from "@/components/ui/badge";
import type { ChatbotStatus } from "@/features/chatbots/types";

type StatusBadgeProps = {
  status: ChatbotStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status[0].toUpperCase() + status.slice(1);
  const variant = status === "active" ? "default" : "secondary";

  return <Badge variant={variant}>{label}</Badge>;
}
