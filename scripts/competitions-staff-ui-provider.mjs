/** ENG-077 loopback synthetic presentation provider. Not database, Auth or email proof. */
import http from "node:http";
import { SESSION_POLICY } from "../src/config/session-policy.ts";
const fixtures = new Map();
const send = (response, body, status = 200) => response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(body));
const server = http.createServer(async (request, response) => {
  if (!["127.0.0.1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress)) return response.writeHead(403).end();
  const url = new URL(request.url ?? "/", "http://127.0.0.1:3220");
  if (url.pathname === "/health") return send(response, { synthetic: true });
  let claims; try { claims = JSON.parse(Buffer.from((request.headers.authorization ?? "").replace(/^Bearer /, "").split(".")[1], "base64url").toString()); } catch { claims = {}; }
  const current = fixtures.get(claims.sub);
  if (url.pathname === "/auth/v1/user" && request.headers.apikey === "sb_publishable_staff_mock_only" && current) return send(response, { id: claims.sub, email: "synthetic-staff@example.invalid", email_confirmed_at: new Date(current.now).toISOString(), app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: new Date(current.now).toISOString() });
  if (request.method !== "POST") return send(response, {}, 404);
  let size = 0, raw = ""; for await (const chunk of request) { size += chunk.length; if (size > 300000) return send(response, {}, 413); raw += chunk; }
  let input; try { input = JSON.parse(raw); } catch { return send(response, {}, 400); }
  if (url.pathname === "/__synthetic/fixture" && request.headers.apikey === "sb_secret_staff_mock_only" && input.actorId) { fixtures.set(input.actorId, { ...input, actions: [] }); return send(response, { synthetic: true }); }
  if (url.pathname === "/__synthetic/actions" && request.headers.apikey === "sb_secret_staff_mock_only") return send(response, { actions: fixtures.get(input.actorId)?.actions ?? [] });
  if (url.pathname === "/rest/v1/rpc/msrc_staff_status" && request.headers.apikey === "sb_secret_staff_mock_only") return send(response, { enabled: true, emailDailyLimit: 40 });
  if (url.pathname === "/rest/v1/rpc/msrc_staff_form_claim" && request.headers.apikey === "sb_secret_staff_mock_only") return send(response, { state: "claimed" });
  if (url.pathname.startsWith("/storage/v1/object/sign/msrc-competition-files/") && request.headers.apikey === "sb_secret_staff_mock_only") return send(response, { signedURL: url.pathname.replace("/storage/v1", "") + "?token=synthetic-short-lived" });
  if (!current || request.headers.apikey !== "sb_publishable_staff_mock_only") return send(response, {}, 403);
  // Session parsing requires exact idle-expiry arithmetic, even across a clock tick.
  const activityAt = Date.now();
  const superAdmin = current.roles.includes("superAdmin"), context = { schemaVersion: 1, editionId: "synthetic-staff-2027", principal: { userId: claims.sub, sessionId: claims.session_id }, privileged: true, authenticationTier: superAdmin ? "super_admin" : "staff", sessionPolicySatisfied: true, reason: null, mfaValid: superAdmin, passwordValid: true, staffEmailValid: !superAdmin, emailVerified: true, timing: { startedAt: new Date(current.now).toISOString(), lastActivityAt: new Date(activityAt).toISOString(), absoluteExpiresAt: new Date(current.deadline).toISOString(), idleExpiresAt: new Date(activityAt + SESSION_POLICY.privilegedIdleSeconds * 1000).toISOString(), authenticatedAt: new Date(current.now).toISOString() }, policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
  if (url.pathname === "/rest/v1/rpc/msrc_session_context") return send(response, context);
  if (url.pathname === "/rest/v1/rpc/msrc_staff_profile") return send(response, { schemaVersion: 1, actorId: claims.sub, name: "Synthetic Staff", roles: current.roles, session: context });
  if (url.pathname === "/rest/v1/rpc/msrc_staff_competitions_data") {
    if (current.missing) return send(response, { code: "PGRST202" }, 404);
    if (input.view === "settings") return send(response, { state: "ready", settings: current.settings, version: current.settingsVersion ?? 0, enabled: false, evidenceReady: false, stageStates: { entry: "not_ready", selection: "not_ready", judging: "not_ready", final_material: "not_ready", membership: "not_ready" } });
    if (["list", "export", "eligibility"].includes(input.view)) return send(response, { state: "ready", entries: (current.entries ?? []).map((entry) => ({ ...entry, roster: entry.roster.map((member) => { if (input.view === "eligibility") return member; const safeMember = { ...member }; delete safeMember.profile; return safeMember; }) })) });
    return send(response, { state: "ready", assignments: current.assignments ?? [], reviewBasis: "SYNTHETIC PRIVATE PRE-EVENT CARD" });
  }
  if (url.pathname === "/rest/v1/rpc/msrc_staff_competitions_mutate") {
    current.actions.push(input);
    if (input.action === "file_read") return send(response, { state: "ready", bucket: "msrc-competition-files", path: `synthetic-staff-2027/${input.payload.entryId}/${input.payload.fileId}`, fileId: input.payload.fileId });
    if (input.action === "settings") { current.settings = input.payload.settings; current.settingsVersion = (current.settingsVersion ?? 0) + 1; }
    if (["review", "judge"].includes(input.action)) current.assignments = current.assignments.map((row) => row.id === input.payload.assignmentId ? { ...row, scorecard: input.payload.scorecard, version: row.version + 1, status: input.payload.submit ? "completed" : "assigned" } : row);
    if (["conflict", "judge_conflict"].includes(input.action)) current.assignments = current.assignments.filter((row) => row.id !== input.payload.assignmentId);
    return send(response, { state: "updated" });
  }
  return send(response, {}, 404);
});
server.listen(3220, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close());
