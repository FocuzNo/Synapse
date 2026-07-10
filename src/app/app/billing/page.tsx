import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function BillingPage() {
  return (
    <EmptyState
      icon={<CreditCard className="size-6" />}
      title="Billing is not wired yet"
      description="Mock billing and server-side plan limits are intentionally deferred until after the first RAG flow foundation."
    />
  );
}
