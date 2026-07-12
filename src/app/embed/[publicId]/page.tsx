import type { Metadata } from "next";
import { EmbedWidget } from "@/components/widget/embed-widget";

export const metadata: Metadata = {
  title: "AskFlow Widget",
  robots: {
    index: false,
    follow: false,
  },
};

type EmbedPageProps = {
  params: Promise<{ publicId: string }>;
};

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { publicId } = await params;

  return (
    <main className="h-screen bg-transparent p-0">
      <EmbedWidget publicId={publicId} />
    </main>
  );
}
