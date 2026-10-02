import { NextRequest, NextResponse } from "next/server";
import { isAuthPreviewAllowed } from "@/lib/auth-preview.server";
import { authPreview } from "@/features/auth/preview.server";
import type { PreviewAction, PreviewResult } from "@/features/auth/mfa-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "msrc-synthetic-session";
const safeHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive" };
const simpleActions = new Set(["enroll", "challenge", "challenge-email", "status", "refresh", "protected", "logout", "suspend", "simulate-factor-reset", "request-reset", "reauthenticate"]);

function response(result: PreviewResult, status = result.state === "ok" ? 200 : result.state === "unavailable" ? 503 : 403) {
  const { token, ...safe } = result;
  const output = NextResponse.json(safe, { status, headers: safeHeaders });
  if (token) output.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: false, path: "/api/auth-preview", maxAge: 72 * 3600 });
  if (result.code === "logged_out") output.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/api/auth-preview", maxAge: 0 });
  return output;
}

function parseAction(value: unknown): PreviewAction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const keys = Object.keys(input).sort().join(",");
  if (input.action === "start" && keys === "action,kind" && typeof input.kind === "string" && ["staff", "participant"].includes(input.kind)) {
    return { type: "start", kind: input.kind as "staff" | "participant" };
  }
  if ((input.action === "verify" || input.action === "verify-email") && keys === "action,code" && typeof input.code === "string" && /^\d{6}$/.test(input.code)) return { type: input.action, code: input.code };
  if (keys === "action" && typeof input.action === "string" && simpleActions.has(input.action)) return { type: input.action } as PreviewAction;
  return null;
}

async function readAction(request: NextRequest): Promise<PreviewAction | null> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json" || !request.body) return null;
  if (Number(request.headers.get("content-length")) > 512) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 512) { await reader.cancel(); return null; }
      chunks.push(chunk.value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    return parseAction(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)));
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  if (!isAuthPreviewAllowed(request.headers)) return response({ state: "denied", code: "invalid_action" }, 404);
  try { return response(await authPreview.execute(request.cookies.get(COOKIE)?.value ?? null, { type: "status" })); }
  catch { return response({ state: "unavailable", code: "unavailable" }); }
}

export async function POST(request: NextRequest) {
  if (!isAuthPreviewAllowed(request.headers)) return response({ state: "denied", code: "invalid_action" }, 404);
  // Strict Origin plus SameSite prevents another local or remote page from driving the lab.
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== request.headers.get("host") || new URL(origin).protocol !== new URL(request.url).protocol ||
      ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site"))) return response({ state: "denied", code: "invalid_action" });
  } catch { return response({ state: "denied", code: "invalid_action" }); }
  const action = await readAction(request);
  if (!action) return response({ state: "denied", code: "invalid_action" }, 400);
  try { return response(await authPreview.execute(request.cookies.get(COOKIE)?.value ?? null, action)); }
  catch { return response({ state: "unavailable", code: "unavailable" }); }
}
