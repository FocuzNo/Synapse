"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type InstallSnippetCardProps = {
  chatbotPublicId: string;
  chatbotStatus: "draft" | "active" | "disabled";
  hasReadyDocuments: boolean;
  appUrl: string;
  embedCode: string;
};

export function InstallSnippetCard({
  chatbotPublicId,
  chatbotStatus,
  hasReadyDocuments,
  appUrl,
  embedCode,
}: InstallSnippetCardProps) {
  const [copied, setCopied] = useState(false);
  const widgetAvailable = chatbotStatus === "active" && hasReadyDocuments;
  const previewUrl = `/demo/widget?chatbot=${encodeURIComponent(chatbotPublicId)}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Embed code copied.");
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Install</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Copy this snippet into any external website. The widget becomes publicly
          available only when this chatbot is active and has at least one ready TXT
          document.
        </p>

        {!widgetAvailable ? (
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">This assistant is not publicly available yet.</p>
              <p>
                Status: <span className="font-medium">{chatbotStatus}</span>. Ready
                documents: <span className="font-medium">{hasReadyDocuments ? "yes" : "no"}</span>.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleCopy()}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy code"}
          </Button>
          <Link
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <ExternalLink className="size-4" />
            Preview widget
          </Link>
        </div>

        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 text-xs">
          <code>{embedCode}</code>
        </pre>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            Public embed URL:{" "}
            <span className="font-mono text-foreground">{`${appUrl}/embed/${chatbotPublicId}`}</span>
          </p>
          <p>
            Loader script:{" "}
            <span className="font-mono text-foreground">{`${appUrl}/widget.js`}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
