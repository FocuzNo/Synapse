import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignupPage() {
  return (
    <Suspense fallback={<Skeleton className="m-auto mt-24 h-96 w-full max-w-md" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
