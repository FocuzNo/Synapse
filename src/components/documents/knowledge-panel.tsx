"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { uploadTxtDocumentAction } from "@/features/documents/actions";

export function KnowledgeUploadForm({ chatbotId }: { chatbotId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await uploadTxtDocumentAction(formData);
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    formRef.current?.reset();
    router.refresh();
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Upload TXT knowledge</CardTitle>
        <CardDescription>
          TXT only, up to 2 MB on Free. Processing runs during this request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="chatbotId" value={chatbotId} />
          <Input name="file" type="file" accept=".txt,text/plain" disabled={pending} />
          <Button type="submit" disabled={pending}>
            <Upload className="size-4" />
            {pending ? "Uploading and processing..." : "Upload"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
