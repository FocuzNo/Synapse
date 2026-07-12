import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AskFlow Widget Demo",
  robots: {
    index: false,
    follow: false,
  },
};

type DemoWidgetPageProps = {
  searchParams: Promise<{ chatbot?: string }>;
};

export default async function DemoWidgetPage({
  searchParams,
}: DemoWidgetPageProps) {
  const { chatbot } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <section className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
            Demo host page
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            CloudDesk marketing site mock
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            This page intentionally uses its own layout and typography so we can
            verify that the AskFlow widget stays visually isolated inside the
            iframe.
          </p>
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <p className="mt-1 font-medium">{chatbot ? "Widget ready" : "Missing chatbot id"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Theme</p>
            <p className="mt-1 font-medium">Neutral host styles</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Embed source</p>
            <p className="mt-1 break-all font-mono text-sm">{chatbot ?? "Add ?chatbot=PUBLIC_ID"}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6">
          <p className="text-sm text-slate-600">
            Scroll, resize, and open the launcher to verify that the widget does
            not inherit host styles and that the floating position behaves
            correctly.
          </p>
        </section>
      </div>

      {chatbot ? (
        <script
          src="/widget.js"
          data-chatbot-id={chatbot}
          async
        />
      ) : null}
    </main>
  );
}
