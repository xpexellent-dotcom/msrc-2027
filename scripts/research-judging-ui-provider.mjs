/** ENG-078: loopback synthetic UI transport. Never database, Auth or permission proof. */
import http from "node:http";
import { randomUUID } from "node:crypto";
import { SESSION_POLICY } from "../src/config/session-policy.ts";
if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Synthetic provider is loopback-only");
const fixtures = new Map();
const send = (response, body, status = 200) => response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(body));
const server = http.createServer(async (request, response) => {
  if (!["127.0.0.1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress)) return send(response, {}, 403);
  const path = new URL(request.url ?? "/", "http://127.0.0.1:3220").pathname;
  if (path === "/health") return send(response, { synthetic: true });
  let claims; try { claims = JSON.parse(Buffer.from((request.headers.authorization ?? "").replace(/^Bearer /, "").split(".")[1], "base64url").toString()); } catch { claims = {}; }
  const current = fixtures.get(claims.sub);
  if (path === "/auth/v1/user" && current && ["sb_publishable_staff_mock_only", "sb_publishable_participant_mock_only"].includes(request.headers.apikey)) return send(response, { id: claims.sub, email: "synthetic@example.invalid", email_confirmed_at: new Date(current.now).toISOString(), app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: new Date(current.now).toISOString() });
  if (request.method !== "POST") return send(response, {}, 404);
  let size = 0, raw = ""; for await (const chunk of request) { size += chunk.length; if (size > 300000) return send(response, {}, 413); raw += chunk; }
  let input; try { input = JSON.parse(raw); } catch { return send(response, {}, 400); }
  const service = ["sb_secret_staff_mock_only", "sb_secret_participant_mock_only"].includes(request.headers.apikey);
  if (path === "/__synthetic/fixture" && service && input.actorId) { fixtures.set(input.actorId, { ...input, actions: [] }); return send(response, { synthetic: true }); }
  if (path === "/__synthetic/actions" && service) return send(response, { actions: fixtures.get(input.actorId)?.actions ?? [] });
  if (path === "/rest/v1/rpc/msrc_staff_status" && service) return send(response, { enabled: true, emailDailyLimit: 40 });
  if (path === "/rest/v1/rpc/msrc_staff_form_claim" && service) return send(response, { state: "claimed" });
  if (path === "/rest/v1/rpc/msrc_participant_status" && service) return send(response, { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true, cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 });
  if (path === "/rest/v1/rpc/msrc_research_event_status" && service) return send(response, { enabled: true });
  const participant = service && fixtures.get(input.session_claims?.sub);
  if (participant) {
    if (participant.missing) return send(response, { code: "PGRST202" }, 404);
    if (path === "/rest/v1/rpc/msrc_research_event_me") return send(response, { state: "ready", entries: participant.entries ?? [] });
    if (path === "/rest/v1/rpc/msrc_research_event_supervisor") {
      participant.actions.push(input);
      for (const entry of participant.entries ?? []) if (entry.supervisorRequest?.awardId === input.award_id) entry.supervisorRequest.details = input.details;
      return send(response, { state: "saved" });
    }
    if (path === "/rest/v1/rpc/msrc_participant_form_claim") return send(response, { state: "claimed" });
  }
  if (current && request.headers.apikey === "sb_publishable_participant_mock_only") {
    const participantContext = { schemaVersion: 1, editionId: "synthetic-participants-2027", principal: { userId: claims.sub, sessionId: claims.session_id }, privileged: false, authenticationTier: "participant", sessionPolicySatisfied: true, reason: null, mfaValid: false, passwordValid: true, staffEmailValid: false, emailVerified: true, timing: { startedAt: new Date(current.now).toISOString(), lastActivityAt: new Date(current.now).toISOString(), absoluteExpiresAt: new Date(current.deadline).toISOString(), idleExpiresAt: null, authenticatedAt: new Date(current.now).toISOString() }, policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
    if (path === "/rest/v1/rpc/msrc_session_context") return send(response, participantContext);
    if (path === "/rest/v1/rpc/msrc_participant_profile") return send(response, { schemaVersion: 1, name: "Synthetic Participant", accountState: "verified", operationalAccessReady: false, session: participantContext });
  }
  if (!current || request.headers.apikey !== "sb_publishable_staff_mock_only") return send(response, {}, 403);
  const activityAt = Date.now(), superAdmin = current.roles.includes("superAdmin");
  const context = { schemaVersion: 1, editionId: "synthetic-staff-2027", principal: { userId: claims.sub, sessionId: claims.session_id }, privileged: true, authenticationTier: superAdmin ? "super_admin" : "staff", sessionPolicySatisfied: true, reason: null, mfaValid: superAdmin, passwordValid: true, staffEmailValid: !superAdmin, emailVerified: true, timing: { startedAt: new Date(current.now).toISOString(), lastActivityAt: new Date(activityAt).toISOString(), absoluteExpiresAt: new Date(current.deadline).toISOString(), idleExpiresAt: new Date(activityAt + SESSION_POLICY.privilegedIdleSeconds * 1000).toISOString(), authenticatedAt: new Date(current.now).toISOString() }, policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
  if (path === "/rest/v1/rpc/msrc_session_context") return send(response, context);
  if (path === "/rest/v1/rpc/msrc_staff_profile") return send(response, { schemaVersion: 1, actorId: claims.sub, name: "Synthetic Staff", roles: current.roles, session: context });
  if (path === "/rest/v1/rpc/msrc_staff_research_event_read") {
    if (current.missing) return send(response, { code: "PGRST202" }, 404);
    if (input.view === "settings") return send(response, { state: "ready", settings: current.settings, version: current.settingsVersion ?? 0, enabled: false, ready: false });
    if (input.view === "list") return send(response, { state: "ready", entries: current.entries ?? [] });
    // Deliberate poison fields verify the server projection does not serialize reviewer data.
    return send(response, { state: "ready", assignments: current.assignments ?? [], reviewerScores: "SYNTHETIC PRIVATE PRE-EVENT SCORE", reviewerComments: "SYNTHETIC PRIVATE REVIEWER NOTE" });
  }
  if (path === "/rest/v1/rpc/msrc_staff_research_event_write") {
    current.actions.push(input);
    const p = input.payload, entry = current.entries?.find((row) => row.id === p.submissionId);
    if (input.action === "settings") { current.settings = p.settings; current.settingsVersion = (current.settingsVersion ?? 0) + 1; }
    if (input.action === "allocate" && entry) { entry.allocation = { id: randomUUID(), format: p.format, published: false }; entry.version++; }
    if (input.action === "publish_allocation" && entry) { entry.allocation.published = true; entry.version++; }
    if (input.action === "assign" && entry) { entry.categoryId = p.categoryId; entry.assignments.push({ id: randomUUID(), judgeId: p.judgeId, version: 1, status: "assigned" }); entry.version++; }
    if (input.action === "withdraw_award" && entry) { entry.award = null; entry.version++; }
    if (input.action === "reassign" && entry) { const old = entry.assignments.find((row) => row.id === p.assignmentId); if (old) old.status = "withdrawn"; entry.assignments.push({ id: randomUUID(), judgeId: p.judgeId, version: 1, status: "assigned" }); entry.version++; }
    if (input.action === "judge") current.assignments = current.assignments.map((row) => row.id === p.assignmentId ? { ...row, scorecard: p.scorecard, version: row.version + 1, status: p.submit ? "completed" : "assigned" } : row);
    if (input.action === "conflict") current.assignments = current.assignments.filter((row) => row.id !== p.assignmentId);
    if (input.action === "prepare_award" && entry) { entry.award = { id: randomUUID(), categoryId: p.categoryId, label: current.settings.categories.find((row) => row.id === p.categoryId)?.label, status: "winner_pending_supervisor", reason: p.reason, tieResolution: p.tieResolution, supervisorReady: false }; entry.version++; }
    if (input.action === "confirm_award" && entry) { if (!entry.award.supervisorReady) return send(response, { state: "supervisor_required" }); entry.award.status = "confirmed"; entry.version++; }
    if (input.action === "publish_award" && entry) { entry.award.status = "published"; entry.version++; }
    return send(response, { state: "updated" });
  }
  return send(response, {}, 404);
});
server.listen(3220, "127.0.0.1");
const participantServer = http.createServer(server.listeners("request")[0]); participantServer.listen(3218, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { server.close(); participantServer.close(); });
