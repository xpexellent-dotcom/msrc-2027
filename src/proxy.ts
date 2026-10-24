import { NextResponse, type NextRequest } from "next/server";
import { decodedPagePath, isCheckInPage, isMediaPage, isPrivatePage, mediaUploadOrigin, privateContentSecurityPolicy } from "@/lib/content-security-policy";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  // Never let incoming headers choose Next's script nonce or the global 404's locale.
  requestHeaders.delete("x-nonce");
  requestHeaders.delete("content-security-policy");
  requestHeaders.set("x-msrc-locale", decodedPagePath(request.nextUrl.pathname).split("/")[1] === "ar" ? "ar" : "en");

  if (!isPrivatePage(request.nextUrl.pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = privateContentSecurityPolicy(nonce, process.env.NODE_ENV === "development", isMediaPage(request.nextUrl.pathname) ? mediaUploadOrigin(process.env) : undefined);
  // Next reads the request CSP to nonce its framework, bootstrap and RSC scripts.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (isCheckInPage(request.nextUrl.pathname)) {
    response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), screen-wake-lock=(self)");
  }
  return response;
}

export const config = {
  // Include document and RSC/prefetch requests; skip APIs and Next-internal assets.
  matcher: ["/((?!api(?:/|$)|_next(?:/|$)|favicon.ico$).*)"],
};
