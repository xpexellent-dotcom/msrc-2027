/** Loopback synthetic provider for real SSR/API/UI composition only. This is not database/Auth evidence. */
import http from "node:http";
import { createHmac, randomUUID } from "node:crypto";

if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Synthetic registration UI provider is loopback-only");
const requests = new Map();
const tickets = new Map();
const registrationViews = new Map();
const operations = new Map();
const reply = (response, value, status = 200) => response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(value));
const evidence = { enabled: true, participantAccountsReady: true, settingsComplete: true, windowOpen: true, eligible: true, termsVersion: "v1.0" };
function issueTicket(actor) {
  const ticketId = randomUUID(), proof = createHmac("sha256", Buffer.from("d".repeat(64), "hex")).update("msrc-ticket-v1:" + ticketId).digest("hex");
  const ticket = { status: "issued", referenceCode: ticketId.replaceAll("-", "").slice(0, 12).toUpperCase(), token: `msrc1.${ticketId}.${proof}` };
  tickets.set(actor, ticket);
  return ticket;
}
const server = http.createServer(async (request, response) => {
  if (!["127.0.0.1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress)) return reply(response, { synthetic: true }, 403);
  const path = new URL(request.url ?? "/", "http://127.0.0.1:3218").pathname;
  if (path === "/health") return reply(response, { synthetic: true });
  if (path === "/auth/v1/user" && request.method === "GET" && request.headers.apikey === "sb_publishable_participant_mock_only") {
    try {
      const token = (request.headers.authorization ?? "").replace(/^Bearer /, "");
      const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      if (!/^da000000-0000-4000-8000-[0-9a-f]{12}$/.test(claims.sub) || claims.exp * 1000 <= Date.now()) return reply(response, { synthetic: true }, 401);
      return reply(response, { id: claims.sub, aud: "authenticated", role: "authenticated", email: "synthetic@example.invalid",
        email_confirmed_at: "2026-10-16T00:00:00Z", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-10-16T00:00:00Z" });
    } catch { return reply(response, { synthetic: true }, 401); }
  }
  const refreshing = path === "/auth/v1/token" && request.headers.apikey === "sb_publishable_participant_mock_only";
  if (request.method !== "POST" || !refreshing && request.headers.apikey !== "sb_secret_participant_mock_only") return reply(response, { synthetic: true }, 404);
  let body = "";
  for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 8192) return reply(response, { synthetic: true }, 413); }
  let args;
  try { args = JSON.parse(body); } catch { return reply(response, { synthetic: true }, 400); }
  // Explicit loopback fixture control, separate from production source and participant requests.
  if (path === "/__synthetic/registration" && /^da000000-0000-4000-8000-[0-9a-f]{12}$/.test(args.actorId ?? "")) {
    if (!["not-requested", "pending_approval", "waitlisted", "offered", "approved", "confirmed", "cancelled", "expired", "missing-rpc"].includes(args.state)) return reply(response, { synthetic: true }, 400);
    registrationViews.set(args.actorId, { window: args.window ?? { state: "open", eligible: true, opensAt: null }, fewPlaces: args.fewPlaces === true,
      missing: args.state === "missing-rpc", missingCollection: args.missingCollection ?? null, actionState: args.actionState ?? null });
    if (["not-requested", "missing-rpc"].includes(args.state)) requests.delete(args.actorId);
    else requests.set(args.actorId, { id: randomUUID(), status: args.state, createdAt: new Date().toISOString(),
      offerExpiresAt: args.state === "offered" ? args.offerExpiresAt ?? new Date(Date.now() + 24 * 3600_000).toISOString() : null });
    tickets.delete(args.actorId);
    if (["approved", "confirmed"].includes(args.state)) issueTicket(args.actorId);
    return reply(response, { synthetic: true });
  }
  if (path === "/__synthetic/ticket" && /^da000000-0000-4000-8000-[0-9a-f]{12}$/.test(args.actorId ?? "")) {
    if (args.state === "missing-rpc") tickets.set(args.actorId, "missing-rpc");
    else if (args.state === "none") tickets.delete(args.actorId);
    else if (["issued", "revoked"].includes(args.state)) {
      const ticket = issueTicket(args.actorId);
      if (args.state === "revoked") tickets.set(args.actorId, { ...ticket, status: "revoked", token: null });
    }
    else return reply(response, { synthetic: true }, 400);
    return reply(response, { synthetic: true });
  }
  if (refreshing) {
    const [, actorId, sessionId] = String(args.refresh_token).split(":");
    if (!/^da000000-0000-4000-8000-[0-9a-f]{12}$/.test(actorId ?? "") || !/^db000000-0000-4000-8000-[0-9a-f]{12}$/.test(sessionId ?? "")) return reply(response, { synthetic: true }, 401);
    const now = Math.floor(Date.now() / 1000);
    const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal1", exp: now + 3600, iat: now, amr: [{ method: "password", timestamp: now }] };
    const access = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
    return reply(response, { access_token: access, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: args.refresh_token,
      user: { id: actorId, aud: "authenticated", role: "authenticated", email: "synthetic@example.invalid", email_confirmed_at: "2026-10-16T00:00:00Z",
        app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-10-16T00:00:00Z" } });
  }
  if (path === "/rest/v1/rpc/msrc_participant_status") return reply(response, { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true,
    cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 });
  if (path === "/rest/v1/rpc/msrc_participant_form_claim") return reply(response, { state: "claimed" });
  if (path === "/rest/v1/rpc/msrc_registration_status") return reply(response, evidence);
  const actor = args.session_claims?.sub;
  if (args.edition_key !== "synthetic-participants-2027" || !/^da000000-0000-4000-8000-[0-9a-f]{12}$/.test(actor ?? "")) return reply(response, { state: "denied" });
  if (path === "/rest/v1/rpc/msrc_registration_context") {
    if (registrationViews.get(actor)?.missingCollection === "context") return reply(response, { code: "PGRST202", message: "Synthetic missing RPC" }, 404);
    const registration = requests.get(actor);
    return reply(response, { ...evidence, state: "open", request: registration ? { id: registration.id, status: registration.status, createdAt: registration.createdAt } : null });
  }
  if (path === "/rest/v1/rpc/msrc_registration_me") {
    const fixture = registrationViews.get(actor);
    if (fixture?.missing) return reply(response, { code: "PGRST202", message: "Synthetic missing RPC" }, 404);
    const registration = requests.get(actor);
    return reply(response, { state: "ready", request: registration ? { ...registration, offerExpiresAt: registration.offerExpiresAt ?? null } : null,
      window: fixture?.window ?? { state: "open", eligible: true, opensAt: null }, fewPlaces: fixture?.fewPlaces ?? false, serverNow: new Date().toISOString() });
  }
  if (["msrc_registration_accept_offer", "msrc_registration_decline_offer", "msrc_registration_cancel"].some((name) => path === "/rest/v1/rpc/" + name)) {
    const registration = requests.get(actor), fixture = registrationViews.get(actor);
    if (!registration || registration.id !== args.request_id || typeof args.operation_id !== "string") return reply(response, { state: "denied" });
    if (fixture?.actionState) return reply(response, { state: fixture.actionState });
    const action = path.endsWith("_accept_offer") ? "accept" : path.endsWith("_decline_offer") ? "decline" : "cancel";
    const key = actor + ":" + args.operation_id;
    const operation = operations.get(key);
    if (operation) return reply(response, { state: operation === action ? "updated" : "conflict" });
    if (action === "accept" && registration.status !== "offered" || action === "decline" && registration.status !== "offered"
      || action === "cancel" && !["pending_approval", "waitlisted", "offered", "approved", "confirmed"].includes(registration.status)) return reply(response, { state: "conflict" });
    if (action === "accept" && Date.parse(registration.offerExpiresAt) <= Date.now()) {
      registration.status = "expired";
      registration.offerExpiresAt = null;
      return reply(response, { state: "expired" });
    }
    if (action === "accept" && args.ticket_secret !== "d".repeat(64)) return reply(response, { state: "denied" });
    registration.status = action === "accept" ? "approved" : "cancelled";
    registration.offerExpiresAt = null;
    if (action === "accept") issueTicket(actor);
    else if (tickets.has(actor)) tickets.set(actor, { ...tickets.get(actor), status: "revoked", token: null });
    operations.set(key, action);
    return reply(response, { state: "updated" });
  }
  if (path === "/rest/v1/rpc/msrc_registration_ticket") {
    const ticket = tickets.get(actor);
    if (ticket === "missing-rpc") return reply(response, { code: "PGRST202", message: "Synthetic missing RPC" }, 404);
    return reply(response, { state: "ready", ticket: ticket ?? null });
  }
  if (path === "/rest/v1/rpc/msrc_registration_submit") {
    if (registrationViews.get(actor)?.missingCollection === "submit") return reply(response, { code: "PGRST202", message: "Synthetic missing RPC" }, 404);
    // The actual application must have encrypted before crossing this provider boundary.
    if (body.includes("FAKE") || !/^[a-f0-9]+$/.test(args.identity_envelope?.ciphertext ?? "") || !/^[a-f0-9]{64}$/.test(args.identity_hash ?? "")
      || args.terms_version !== "v1.0" || args.key_version !== "synthetic_v1" || !/^••••••[A-Z0-9]{4}$/.test(args.identity_masked ?? "")) return reply(response, { state: "denied" });
    if (!requests.has(actor)) requests.set(actor, { id: randomUUID(), status: "pending_approval", createdAt: new Date().toISOString() });
    return reply(response, { state: "submitted", request: requests.get(actor) });
  }
  return reply(response, { synthetic: true }, 404);
});
server.listen(3218, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close());
