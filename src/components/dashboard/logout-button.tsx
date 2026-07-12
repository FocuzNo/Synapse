"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    let supabase: ReturnType<typeof createBrowserSupabaseClient>;
    try {
      supabase = createBrowserSupabaseClient();
    } catch {
      setIsLoggingOut(false);
      toast.error("AskFlow is not configured. Add the Supabase client variables to .env.local and restart the dev server.");
      return;
    }
    const { error } = await supabase.auth.signOut();

    if (error) {
      setIsLoggingOut(false);
      toast.error("Could not sign out. Please try again.");
      return;
    }

    router.refresh();
    router.push("/login");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
      <LogOut className="size-4" />
      {isLoggingOut ? "Signing out..." : "Logout"}
    </Button>
  );
}
