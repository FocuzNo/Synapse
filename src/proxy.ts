import { NextResponse, type NextRequest } from "next/server";
import { hasClientEnv } from "@/lib/env/client";
import { PROTECTED_ROUTE_PREFIX } from "@/lib/constants";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { getSafeNextPath } from "@/lib/utils";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute =
    pathname === PROTECTED_ROUTE_PREFIX ||
    pathname.startsWith(`${PROTECTED_ROUTE_PREFIX}/`);

  if (!isProtectedRoute) {
    if (!hasClientEnv()) {
      return NextResponse.next();
    }

    const { response } = await updateSupabaseSession(request);
    return response;
  }

  if (!hasClientEnv()) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set(
      "next",
      getSafeNextPath(`${pathname}${request.nextUrl.search}`) ?? "/app"
    );
    return NextResponse.redirect(redirectUrl);
  }

  const { response, user } = await updateSupabaseSession(request);

  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set(
      "next",
      getSafeNextPath(`${pathname}${request.nextUrl.search}`) ?? "/app"
    );
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|embed).*)",
  ],
};
