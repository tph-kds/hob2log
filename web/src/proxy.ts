import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function safeDecodePath(pathname: string) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function normalizePath(pathname: string) {
  return pathname
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isDocumentNavigation(request: NextRequest) {
  const mode = request.headers.get("sec-fetch-mode");
  const dest = request.headers.get("sec-fetch-dest");
  const purpose = request.headers.get("purpose") ?? request.headers.get("x-moz");
  const nextPrefetch = request.headers.get("next-router-prefetch");
  const accept = request.headers.get("accept") ?? "";

  if (nextPrefetch === "1" || purpose?.toLowerCase() === "prefetch") {
    return false;
  }

  return request.method === "GET"
    && mode === "navigate"
    && dest === "document"
    && accept.includes("text/html");
}

export function proxy(request: NextRequest) {
  const decodedPathname = safeDecodePath(request.nextUrl.pathname);
  const normalizedPath = normalizePath(decodedPathname);

  if (normalizedPath === "/ad") {
    if (!isDocumentNavigation(request)) {
      return new NextResponse(null, { status: 204 });
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
