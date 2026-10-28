import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE } from "./lib/i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, service worker, manifests, and API endpoints
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/offline" ||
    pathname.includes(".") || // e.g. icon.svg, sw.js, manifest.json
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check if pathname already begins with a supported locale
  const pathnameHasLocale = LOCALES.some(
    (loc) => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`,
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Detect preferred locale from cookie or accept-language header
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const locale = cookieLocale && LOCALES.includes(cookieLocale as any) ? cookieLocale : DEFAULT_LOCALE;

  // Root path redirects to /locale/dashboard
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Other paths without locale prefix get redirected to /locale/...
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Match all request paths except for files with extensions and _next
    "/((?!_next/static|_next/image|favicon.ico|sw.js|icon.svg|manifest.json).*)",
  ],
};
