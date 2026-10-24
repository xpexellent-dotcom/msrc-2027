/** BL-AUTH-01 readiness stub and ENG-079 loopback UI fixtures.
 * This is deliberately not proof of database, Auth or email enforcement. */
import http from "node:http";
import { SESSION_POLICY } from "../src/config/session-policy.ts";

// ENG-079 fixtures are loopback-only and synthetic. They exercise the real app
// handlers; they do not simulate PostgreSQL authorization or real Auth assurance.
const fixtures = new Map();
const consumedNonces = new Set();
const send = (response, body, status = 200) => response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(body));

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:3220");
  if (request.socket.remoteAddress !== "127.0.0.1" && request.socket.remoteAddress !== "::ffff:127.0.0.1") {
    response.writeHead(403).end(); return;
  }
  if (url.pathname === "/health") { response.writeHead(200, { "Content-Type": "application/json" }).end('{"synthetic":true}'); return; }
  let claims; try { claims = JSON.parse(Buffer.from((request.headers.authorization ?? "").replace(/^Bearer /, "").split(".")[1], "base64url").toString()); } catch { claims = {}; }
  const current = fixtures.get(claims.sub);
  if (url.pathname === "/auth/v1/user" && request.headers.apikey === "sb_publishable_staff_mock_only" && current) return send(response, { id: claims.sub, email: "synthetic-staff@example.invalid", email_confirmed_at: new Date(current.now).toISOString(), app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: new Date(current.now).toISOString() });
  if (request.method !== "POST") return send(response, {}, 404);
  let size = 0, raw = ""; for await (const chunk of request) { size += chunk.length; if (size > 65536) return send(response, {}, 413); raw += chunk; }
  let input; try { input = JSON.parse(raw); } catch { return send(response, {}, 400); }
  if (url.pathname === "/__synthetic/organizer-fixture" && request.headers.apikey === "sb_secret_staff_mock_only" && input.actorId) { fixtures.set(input.actorId, { ...input, actions: [] }); return send(response, { synthetic: true }); }
  if (url.pathname === "/__synthetic/organizer-actions" && request.headers.apikey === "sb_secret_staff_mock_only") return send(response, { actions: fixtures.get(input.actorId)?.actions ?? [] });
  if (url.pathname === "/rest/v1/rpc/msrc_staff_status" && request.headers.apikey === "sb_secret_staff_mock_only") return send(response, { enabled: true, emailDailyLimit: 40, passwordChangeEnabled: process.env.STAFF_PASSWORD_UI_PROVIDER_ENABLED === "true" });
  if (url.pathname === "/rest/v1/rpc/msrc_staff_form_claim" && request.headers.apikey === "sb_secret_staff_mock_only") {
    if (typeof input.nonce_hash !== "string" || consumedNonces.has(input.nonce_hash)) return send(response, { state: "limited" });
    consumedNonces.add(input.nonce_hash); return send(response, { state: "claimed" });
  }
  if (!current || request.headers.apikey !== "sb_publishable_staff_mock_only") return send(response, {}, 403);
  const activityAt = Date.now(), superAdmin = current.roles.includes("superAdmin");
  const context = { schemaVersion: 1, editionId: "synthetic-staff-2027", principal: { userId: claims.sub, sessionId: claims.session_id }, privileged: true, authenticationTier: superAdmin ? "super_admin" : "staff", sessionPolicySatisfied: true, reason: null, mfaValid: superAdmin, passwordValid: true, staffEmailValid: !superAdmin, emailVerified: true,
    timing: { startedAt: new Date(current.now).toISOString(), lastActivityAt: new Date(activityAt).toISOString(), absoluteExpiresAt: new Date(current.deadline).toISOString(), idleExpiresAt: new Date(activityAt + SESSION_POLICY.privilegedIdleSeconds * 1000).toISOString(), authenticatedAt: new Date(current.now).toISOString() }, policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
  if (["/rest/v1/rpc/msrc_session_context", "/rest/v1/rpc/msrc_session_activity"].includes(url.pathname)) return send(response, context);
  if (url.pathname === "/rest/v1/rpc/msrc_staff_profile") return send(response, { schemaVersion: 1, actorId: claims.sub, name: "Synthetic Staff", roles: current.roles, session: context });
  if (url.pathname === "/rest/v1/rpc/msrc_staff_summary") return send(response, { state: "ready", summary: {} });
  if (url.pathname === "/rest/v1/rpc/msrc_staff_audit") return send(response, { state: "ready", rows: [] });
  if (!url.pathname.startsWith("/rest/v1/rpc/msrc_staff_dashboard")) return send(response, {}, 404);
  if (current.missing) return send(response, { code: "PGRST202" }, 404);
  const name = url.pathname.slice("/rest/v1/rpc/".length);
  current.actions.push({ name, ...input });
  if (name === "msrc_staff_dashboard") return send(response, { state: "ready", dashboard: current.dashboard });
  if (name === "msrc_staff_dashboard_find") return send(response, superAdmin ? { state: "ready", matches: current.matches ?? [] } : { state: "denied" });
  if (name === "msrc_staff_dashboard_audit") return send(response, superAdmin ? { state: "ready", events: current.events ?? [], hasMore: false } : { state: "denied" });
  if (name === "msrc_staff_dashboard_export") {
    if (current.exportFailures > 0) { current.exportFailures -= 1; return send(response, { state: "unavailable" }, 503); }
    if (input.export_kind === "personal" && !superAdmin) return send(response, { state: "denied" });
    if (input.export_kind === "aggregate") return send(response, { state: "ready", columns: ["module", "dimension", "value", "count"], rows: current.dashboard.cells.map((cell) => [cell.module, cell.dimension, cell.value, cell.count]) });
    if (input.export_kind === "personal") return send(response, { state: "ready", columns: ["module", "reference", "status", "actorId", "name", "email"], rows: [["registrations", "SYNTHETIC-REF", "approved", claims.sub, "=Synthetic مشارك", "synthetic@example.invalid"]] });
    return send(response, { state: "ready", columns: ["module", "reference", "status"], rows: [["registrations", "=Synthetic", "approved"], ["registrations", "+formula", "approved"], ["registrations", "@formula", "approved"]] });
  }
  return send(response, {}, 404);
});
server.listen(3220, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close());
