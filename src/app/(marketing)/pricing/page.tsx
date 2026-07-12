import Link from "next/link";
import { PricingCards } from "@/components/billing/pricing-cards";
import { buttonVariants } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
            Pricing built for the first real support assistant.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Start free, then unlock more chatbots, larger knowledge bases, longer history, and branding controls when your workspace is ready.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={buttonVariants()}>
              Get started
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-12">
          <PricingCards />
        </div>
      </section>
    </main>
  );
}
