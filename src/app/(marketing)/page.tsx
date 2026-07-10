import Link from "next/link";
import { ArrowRight, Bot, FileText, LockKeyhole } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const proofPoints = [
  {
    icon: FileText,
    title: "Document-first",
    copy: "The first milestone focuses on TXT knowledge ingestion before broader file support.",
  },
  {
    icon: Bot,
    title: "Grounded answers",
    copy: "Responses are designed around retrieved sources, not invented product claims.",
  },
  {
    icon: LockKeyhole,
    title: "Tenant-aware",
    copy: "The architecture scopes data by workspace and chatbot from the start.",
  },
];

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              A
            </span>
            AskFlow
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Pricing
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Sign in
            </Link>
            <Link href="/signup" className={buttonVariants()}>
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl content-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="flex flex-col justify-center">
          <Badge className="mb-5 w-fit" variant="secondary">
            Technical foundation in progress
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-balance sm:text-5xl">
            Build AI support chatbots from trusted company documents.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            AskFlow is being built as a focused SaaS MVP: authenticated
            workspace, chatbot setup, TXT knowledge ingestion, RAG answers, and
            source-backed conversations.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
              Start setup <ArrowRight />
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="grid gap-3 self-center">
          {proofPoints.map((item) => (
            <Card key={item.title} className="shadow-sm">
              <CardContent className="flex gap-4 p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <h2 className="font-medium">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.copy}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
