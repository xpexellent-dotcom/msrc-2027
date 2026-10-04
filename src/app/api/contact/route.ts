import { getContactDeliveryConfig, type ContactDeliveryConfig } from "@/features/contact/delivery-config.server";
import { reserveContactAttempt, sendContactEmail } from "@/features/contact/delivery.server";
import { contactHash, contactRequestOrigin, createContactToken, readContactJson, trustedContactIp, verifyContactToken } from "@/features/contact/security.server";
import { validateContactSubmission } from "@/features/contact/validation.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
function reply(state: string, code: string, status: number, extra: Record<string, unknown> = {}) {
  return Response.json({ state, code, ...extra }, { status, headers });
}
function contactClosed() { return reply("closed", "CONTACT_CLOSED", 503); }
function unavailable() { return reply("unavailable", "CONTACT_UNAVAILABLE", 503); }

export function GET(request: Request) {
  const readiness = getContactDeliveryConfig();
  if (readiness.state === "closed") return contactClosed();
  if (readiness.state !== "ready") return unavailable();
  const url = new URL(request.url);
  const origin = contactRequestOrigin(readiness.config, request);
  const site = request.headers.get("sec-fetch-site");
  if (!origin || (site && !["same-origin", "none"].includes(site))
    || (request.headers.get("origin") && request.headers.get("origin") !== origin)) return reply("invalid", "INVALID_CONTACT", 400);
  const locale = url.searchParams.get("locale");
  if (locale !== "en" && locale !== "ar") return reply("invalid", "INVALID_CONTACT", 400);
  return Response.json({ state: "ready", token: createContactToken(readiness.config, locale, origin) }, { headers });
}

export function POST(request: Request): Response | Promise<Response> {
  // Flag/config check happens before even accessing visitor headers or streams.
  const readiness = getContactDeliveryConfig();
  if (readiness.state === "closed") return contactClosed();
  if (readiness.state !== "ready") return unavailable();
  return submit(request, readiness.config);
}

async function submit(request: Request, config: ContactDeliveryConfig): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || !config.origins.includes(origin) || contactRequestOrigin(config, request) !== origin
    || (request.headers.get("sec-fetch-site") && request.headers.get("sec-fetch-site") !== "same-origin")) {
    return reply("invalid", "INVALID_CONTACT", 400);
  }
  const ip = trustedContactIp(config, request);
  if (!ip) return unavailable();
  let input: unknown;
  try { input = await readContactJson(request); }
  catch { return reply("invalid", "INVALID_CONTACT", 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)
    || Object.keys(input).sort().join(",") !== "locale,submission,token") return reply("invalid", "INVALID_CONTACT", 400);
  const body = input as Record<string, unknown>;
  if (body.locale !== "en" && body.locale !== "ar") return reply("invalid", "INVALID_CONTACT", 400);
  const contact = validateContactSubmission(body.submission);
  if (!contact.ok) return reply("invalid", contact.code, 400, { fieldErrors: contact.fieldErrors });
  const token = verifyContactToken(config, body.token, body.locale, origin);
  if (!token.ok) return reply("invalid", token.code, 400,
    token.code === "CONTACT_TOO_FAST" ? { retryAfter: config.minimumFillSeconds } : {});
  const hashes = { ip: contactHash(config, "ip", ip), email: contactHash(config, "email", contact.value.email.toLowerCase()),
    nonce: contactHash(config, "nonce", token.nonce) };
  const admission = await reserveContactAttempt(config, hashes, token.expires);
  if (!admission) return unavailable();
  if (!admission.allowed) {
    console.info({ outcome: "limited", topic: contact.value.topic });
    return Response.json({ state: "limited", code: admission.reason === "replayed" ? "CONTACT_ATTEMPT_USED" : "CONTACT_LIMITED",
      retryAfter: admission.retryAfter }, { status: 429, headers: { ...headers, "Retry-After": String(Math.max(1, admission.retryAfter)) } });
  }
  // Recheck immediately before dispatch; an off switch never starts a new send.
  const current = getContactDeliveryConfig();
  if (current.state === "closed") return contactClosed();
  if (current.state !== "ready" || current.config.securitySecret !== config.securitySecret
    || current.config.resendKey !== config.resendKey || current.config.counterKey !== config.counterKey) return unavailable();
  const accepted = await sendContactEmail(config, contact, body.locale, hashes.nonce);
  console.info({ outcome: accepted ? "sent" : "rejected", topic: contact.value.topic });
  // Unknown provider/network outcomes keep the reservation. Never retry or refund.
  return accepted ? reply("sent", "CONTACT_SENT", 200)
    : reply("unavailable", "CONTACT_DELIVERY_UNCONFIRMED", 503);
}

function unsupported() {
  return getContactDeliveryConfig().state === "closed" ? contactClosed()
    : Response.json({ state: "invalid", code: "CONTACT_METHOD_NOT_ALLOWED" }, { status: 405, headers: { ...headers, Allow: "GET, POST, HEAD" } });
}
export const PUT = unsupported;
export const PATCH = unsupported;
export const DELETE = unsupported;
export const OPTIONS = unsupported;
export function HEAD() { return new Response(null, { status: getContactDeliveryConfig().state === "ready" ? 200 : 503, headers }); }
