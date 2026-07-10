import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    name: "Free",
    price: "$0",
    features: ["1 chatbot", "5 documents", "2 MB files", "100 AI messages/month"],
  },
  {
    name: "Starter",
    price: "$19",
    features: ["3 chatbots", "50 documents", "10 MB files", "2,000 AI messages/month"],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          AskFlow
        </Link>
        <div className="mt-10 max-w-2xl">
          <h1 className="text-3xl font-semibold sm:text-4xl">Simple MVP pricing</h1>
          <p className="mt-3 text-muted-foreground">
            Billing is intentionally deferred. These plans define the limits the
            server will enforce in later milestones.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.name}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <p className="text-3xl font-semibold">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="size-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <Link href="/signup" className={`${buttonVariants()} mt-8`}>
          Continue to signup
        </Link>
      </div>
    </main>
  );
}
