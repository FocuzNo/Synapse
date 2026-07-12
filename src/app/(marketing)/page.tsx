import Link from "next/link";
import {
  ArrowRight,
  Check,
  Code2,
  FileText,
  LockKeyhole,
  MessageSquareText,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PricingCards } from "@/components/billing/pricing-cards";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const values = [
  [FileText, "Grounded in your documentation", "Answers stay close to the knowledge you choose to publish."],
  [MessageSquareText, "Sources with every answer", "Your team can see which document context shaped a response."],
  [Code2, "Embeddable in minutes", "Copy one script tag and give visitors a focused support assistant."],
  [LockKeyhole, "Secure workspace isolation", "RLS and server-side tenant checks keep customer data separated."],
] as const;

const faqs = [
  ["What file types are supported?", "This demo currently supports UTF-8 TXT knowledge files. PDF and DOCX ingestion are intentionally next-stage work."],
  ["Can the assistant answer outside my documents?", "It uses a grounded fallback when relevant context is not found, so it does not pretend to know what your workspace has not provided."],
  ["How does the widget work?", "AskFlow gives each chatbot a public-safe ID and mounts an isolated iframe through the generated widget script."],
  ["Is billing real in this demo?", "No. Plans and limits are real in the product code, but checkout is a mock flow and never charges a card."],
  ["Can I remove AskFlow branding?", "Branding stays on for Free and can be disabled server-side on Starter or Pro."],
  ["What happens when I reach my limit?", "The server blocks the next operation with a clear upgrade message. Existing data is not deleted."],
];

const steps = [
  ["01", "Upload your knowledge", "Add a TXT file and let AskFlow normalize, chunk, and index it."],
  ["02", "Test your assistant", "Ask questions in the playground and inspect the source references."],
  ["03", "Embed it on your site", "Copy the script tag, open the widget, and let visitors ask."],
] as const;

export default function MarketingHomePage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">A</span>
            AskFlow
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#product" className="hover:text-foreground">Product</a>
            <a href="#how-it-works" className="hover:text-foreground">How it works</a>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/demo" className="hover:text-foreground">Live demo</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>Sign in</Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>Get started</Link>
          </div>
        </div>
      </header>

      <section className="border-b bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_36%),linear-gradient(to_bottom,hsl(var(--muted)/0.35),transparent)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="mb-5 w-fit gap-2"><Sparkles className="size-3.5" /> Grounded support, ready to embed</Badge>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-6xl">Turn your company knowledge into an AI support assistant</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Upload your documentation, create a grounded AI chatbot, and embed it on your website in minutes.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>Build your chatbot <ArrowRight className="size-4" /></Link>
              <Link href="/demo" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}><Play className="size-4" /> Try live demo</Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">TXT knowledge ingestion is available in this MVP. No card required for the Free plan.</p>
          </div>
          <div className="relative rounded-2xl border bg-card p-3 shadow-2xl shadow-primary/10">
            <div className="rounded-xl border bg-muted/30 p-4 sm:p-6">
              <div className="flex items-center justify-between border-b pb-4"><div><p className="text-xs text-muted-foreground">Workspace / CloudDesk</p><p className="font-semibold">Support assistant</p></div><Badge>Active</Badge></div>
              <div className="grid gap-4 pt-5 sm:grid-cols-[1fr_0.9fr]">
                <div className="space-y-3">
                  <div className="rounded-lg border bg-background p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium">Knowledge</span><Badge variant="secondary">Ready</Badge></div><p className="mt-2 text-xs text-muted-foreground">clouddesk-knowledge.txt</p><div className="mt-3 h-1.5 rounded-full bg-primary/20"><div className="h-full w-full rounded-full bg-primary" /></div></div>
                  <div className="rounded-lg border bg-background p-4"><p className="text-xs text-muted-foreground">Visitor question</p><p className="mt-1 text-sm font-medium">How do I invite a team member?</p><div className="mt-4 rounded-lg bg-primary/5 p-3 text-sm leading-6">Open Settings, choose Team, then select Invite member. <span className="font-medium text-primary">[1]</span></div><p className="mt-2 text-[11px] text-muted-foreground">Source: clouddesk-knowledge.txt</p></div>
                </div>
                <div className="hidden rounded-xl border bg-background p-4 shadow-sm sm:block"><div className="flex items-center gap-2 border-b pb-3"><span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">C</span><span className="text-sm font-semibold">CloudDesk Assistant</span></div><div className="mt-8 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Hi! How can I help you today?</div><div className="mt-3 ml-8 rounded-lg border p-3 text-xs text-muted-foreground">Ask about your product documentation...</div><div className="mt-12 flex justify-end"><span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"><MessageSquareText className="size-5" /></span></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{values.map(([Icon, title, copy]) => <div key={title} className="space-y-3 p-2"><Icon className="size-5 text-primary" /><h2 className="font-medium">{title}</h2><p className="text-sm leading-6 text-muted-foreground">{copy}</p></div>)}</div></section>

      <section id="how-it-works" className="border-y bg-muted/30"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="max-w-2xl"><p className="text-sm font-medium text-primary">A smaller path to useful support</p><h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">From documentation to a live assistant</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{steps.map(([number, title, copy]) => (<Card key={number} className="bg-background shadow-sm"><CardHeader><p className="text-sm font-semibold text-primary">{number}</p><CardTitle>{title}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{copy}</p></CardContent></Card>))}</div></div></section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"><div><p className="text-sm font-medium text-primary">Built for the first honest MVP</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">The important pieces are already connected.</h2><p className="mt-4 leading-7 text-muted-foreground">AskFlow keeps the product surface focused: useful answers, visible sources, and limits you can explain to a customer.</p></div><div className="grid gap-3 sm:grid-cols-2">{["TXT knowledge ingestion", "Grounded answers", "Source references", "Internal playground", "Embeddable widget", "Appearance customization", "Conversation history", "Real usage limits"].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg border bg-card p-4 text-sm"><Check className="size-4 text-primary" />{item}</div>)}</div></div></section>

      <section className="border-y bg-muted/30"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8"><div><p className="text-sm font-medium text-primary">Embed flow</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">A familiar widget, with your knowledge behind it.</h2><p className="mt-4 leading-7 text-muted-foreground">Copy the generated snippet into a customer site. The widget runs in an isolated iframe and preserves sources without exposing internal configuration.</p><Link href="/demo" className={cn(buttonVariants({ variant: "outline" }), "mt-6 gap-2")}>Open live demo <ArrowRight className="size-4" /></Link></div><div className="rounded-xl border bg-background p-5 font-mono text-xs leading-7 shadow-sm"><span className="text-muted-foreground">{"<script"}</span><br /><span className="pl-4 text-primary">src</span>=<span className="text-emerald-700">&quot;{appUrl}/widget.js&quot;</span><br /><span className="pl-4 text-primary">data-chatbot-id</span>=<span className="text-emerald-700">&quot;PUBLIC_ID&quot;</span><br /><span className="text-muted-foreground">{"async></script>"}</span><div className="mt-5 rounded-lg border bg-muted/40 p-3 font-sans text-xs text-muted-foreground">Your real install snippet uses the configured application URL and public chatbot ID.</div></div></div></section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-6"><div><p className="text-sm font-medium text-primary">Plans that explain themselves</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Start free, grow when the work is real.</h2></div><Link href="/pricing" className="hidden text-sm font-medium text-primary hover:underline sm:block">See full pricing <ArrowRight className="ml-1 inline size-4" /></Link></div><div className="mt-10"><PricingCards /></div><p className="mt-5 text-center text-xs text-muted-foreground">Demo billing is mock-only. No card is charged.</p></section>

      <section className="border-t bg-muted/30"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="max-w-2xl"><p className="text-sm font-medium text-primary">Security by default</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Trust is part of the product surface.</h2></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[[ShieldCheck, "Private storage", "Knowledge files stay in a private Supabase bucket."], [LockKeyhole, "Row Level Security", "Workspace records are protected by tenant-aware policies."], [Sparkles, "Server-side limits", "Plans are enforced before writes and AI usage."], [Code2, "No browser secrets", "Provider keys and system prompts remain server-only."]].map(([Icon, title, copy]) => <div key={title as string} className="rounded-lg border bg-background p-5"><Icon className="size-5 text-primary" /><h3 className="mt-4 font-medium">{title as string}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy as string}</p></div>)}</div></div></section>

      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6"><h2 className="text-3xl font-semibold tracking-tight">Questions, answered.</h2><div className="mt-8 grid gap-6 sm:grid-cols-2">{faqs.map(([question, answer]) => <div key={question}><h3 className="font-medium">{question}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p></div>)}</div></section>

      <section className="border-y bg-primary text-primary-foreground"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"><div><h2 className="text-3xl font-semibold tracking-tight">Create your first AI assistant</h2><p className="mt-2 text-primary-foreground/75">Start with one document, one chatbot, and a clear answer.</p></div><Link href="/signup" className={buttonVariants({ variant: "secondary", size: "lg" })}>Get started <ArrowRight /></Link></div></section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><div className="flex items-center gap-2 font-medium text-foreground"><span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">A</span>AskFlow</div><div className="flex flex-wrap gap-4"><Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/terms" className="hover:text-foreground">Terms</Link><a href="mailto:hello@askflow.dev" className="hover:text-foreground">Contact</a></div><p>Demo product. No production SLA.</p></footer>
    </main>
  );
}
