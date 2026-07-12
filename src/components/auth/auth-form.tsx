"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSafeNextPath } from "@/lib/utils";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Enter your full name."),
  companyName: z.string().trim().min(2, "Enter your company name."),
  confirmPassword: z.string().min(8, "Confirm your password."),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(
    searchParams.get("error") === "callback"
      ? "We could not finish signing you in. Please try again."
      : null
  );
  const [confirmationSent, setConfirmationSent] = useState(false);
  const isLogin = mode === "login";
  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get("next")) ?? "/app",
    [searchParams]
  );

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      companyName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function getFriendlyAuthError(message: string) {
    const normalized = message.toLowerCase();

    if (normalized.includes("invalid login credentials")) {
      return "Email or password is incorrect.";
    }

    if (normalized.includes("email not confirmed")) {
      return "Please confirm your email before signing in.";
    }

    if (normalized.includes("already registered") || normalized.includes("already exists")) {
      return "An account with this email may already exist. Try signing in instead.";
    }

    if (normalized.includes("rate limit")) {
      return "Signup email sending is temporarily rate-limited. Wait a moment or disable email confirmation for the development project.";
    }

    return "Authentication failed. Please check your details and try again.";
  }

  async function handleLogin(values: LoginValues) {
    setAuthError(null);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setAuthError(getFriendlyAuthError(error.message));
      return;
    }

    toast.success("Signed in.");
    loginForm.reset({ email: values.email, password: "" });
    router.refresh();
    router.push(nextPath);
  }

  async function handleSignup(values: SignupValues) {
    setAuthError(null);
    const supabase = createBrowserSupabaseClient();
    const origin = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName.trim(),
          company_name: values.companyName.trim(),
        },
        emailRedirectTo: `${origin}/auth/callback?next=/app`,
      },
    });

    if (error) {
      setAuthError(getFriendlyAuthError(error.message));
      signupForm.reset({
        ...values,
        password: "",
        confirmPassword: "",
      });
      return;
    }

    signupForm.reset({
      fullName: "",
      companyName: "",
      email: values.email,
      password: "",
      confirmPassword: "",
    });

    if (data.session) {
      toast.success("Account created.");
      router.refresh();
      router.push("/app");
      return;
    }

    setConfirmationSent(true);
  }

  if (!isLogin && confirmationSent) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              Your account was created. Confirm your email, then sign in to
              continue to AskFlow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="font-medium text-primary hover:underline" href="/login">
              Return to sign in
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <Link href="/" className="mb-6 flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              A
            </span>
            AskFlow
          </Link>
          <CardTitle>{isLogin ? "Sign in" : "Create your account"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your email and password to open your workspace."
              : "Create your owner account and first workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError ? (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {authError}
            </div>
          ) : null}
          <form
            className="space-y-4"
            onSubmit={
              isLogin
                ? loginForm.handleSubmit(handleLogin)
                : signupForm.handleSubmit(handleSignup)
            }
          >
            {!isLogin ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    autoComplete="name"
                    placeholder="Ari Askflow"
                    aria-invalid={Boolean(signupForm.formState.errors.fullName)}
                    {...signupForm.register("fullName")}
                  />
                  {signupForm.formState.errors.fullName ? (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.fullName.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input
                    id="companyName"
                    autoComplete="organization"
                    placeholder="Acme Support"
                    aria-invalid={Boolean(signupForm.formState.errors.companyName)}
                    {...signupForm.register("companyName")}
                  />
                  {signupForm.formState.errors.companyName ? (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.companyName.message}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                aria-invalid={Boolean(
                  isLogin
                    ? loginForm.formState.errors.email
                    : signupForm.formState.errors.email
                )}
                {...(isLogin ? loginForm.register("email") : signupForm.register("email"))}
              />
              {(isLogin ? loginForm.formState.errors.email : signupForm.formState.errors.email) ? (
                <p className="text-sm text-destructive">
                  {(isLogin ? loginForm.formState.errors.email : signupForm.formState.errors.email)?.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="Minimum 8 characters"
                aria-invalid={Boolean(
                  isLogin
                    ? loginForm.formState.errors.password
                    : signupForm.formState.errors.password
                )}
                {...(isLogin ? loginForm.register("password") : signupForm.register("password"))}
              />
              {(isLogin ? loginForm.formState.errors.password : signupForm.formState.errors.password) ? (
                <p className="text-sm text-destructive">
                  {(isLogin ? loginForm.formState.errors.password : signupForm.formState.errors.password)?.message}
                </p>
              ) : null}
            </div>
            {!isLogin ? (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  aria-invalid={Boolean(signupForm.formState.errors.confirmPassword)}
                  {...signupForm.register("confirmPassword")}
                />
                {signupForm.formState.errors.confirmPassword ? (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>
            ) : null}
            <Button
              className="w-full"
              disabled={
                isLogin
                  ? loginForm.formState.isSubmitting
                  : signupForm.formState.isSubmitting
              }
              type="submit"
            >
              {(isLogin ? loginForm.formState.isSubmitting : signupForm.formState.isSubmitting)
                ? "Please wait..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "No account yet?" : "Already have an account?"}{" "}
            <Link
              href={isLogin ? "/signup" : "/login"}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? "Create one" : "Sign in"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
