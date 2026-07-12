import { NextResponse, type NextRequest } from "next/server";
import { hasClientEnv } from "@/lib/env/client";
import { PROTECTED_ROUTE_PREFIX } from "@/lib/constants";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { getSafeNextPath } from "@/lib/utils";

function applySecurityHeaders(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl;
  const isEmbedRoute = pathname.startsWith("/embed/");

  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");

  if (isEmbedRoute) {
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
    response.headers.delete("X-Frame-Options");
    return response;
  }

  response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute =
    pathname === PROTECTED_ROUTE_PREFIX ||
    pathname.startsWith(`${PROTECTED_ROUTE_PREFIX}/`);

  if (!isProtectedRoute) {
    if (pathname.startsWith("/embed/")) {
      return applySecurityHeaders(request, NextResponse.next());
    }

    if (!hasClientEnv()) {
      return applySecurityHeaders(request, NextResponse.next());
    }

    const { response } = await updateSupabaseSession(request);
    return applySecurityHeaders(request, response);
  }

  if (!hasClientEnv()) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set(
      "next",
      getSafeNextPath(`${pathname}${request.nextUrl.search}`) ?? "/app"
    );
    return applySecurityHeaders(request, NextResponse.redirect(redirectUrl));
  }

  const { response, user } = await updateSupabaseSession(request);

  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set(
      "next",
      getSafeNextPath(`${pathname}${request.nextUrl.search}`) ?? "/app"
    );
    return applySecurityHeaders(request, NextResponse.redirect(redirectUrl));
  }

  return applySecurityHeaders(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|widget\\.js|api/public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
