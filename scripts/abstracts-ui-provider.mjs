/** Loopback synthetic presentation provider only. It provides no database/security evidence. */
import http from "node:http";
import { randomUUID } from "node:crypto";
if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Synthetic provider is loopback-only");
const fixtures = new Map(), operations = new Map();
const reply = (response, value, status = 200) => response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(value));
const settings = { specialties: [{ id: "synthetic-specialty", label: "Synthetic specialty" }], studyTypes: [{ id: "synthetic-study", label: "Synthetic study", template: "research" }],
  keywordCount: 1, windowState: "open", opensAt: "2026-01-01T00:00:00Z", closesAt: "2028-01-01T00:00:00Z", correspondingAuthorPolicy: "Synthetic policy for local tests only" };
const count = (document) => ["background", "aim", "methods", "results", "conclusion"].flatMap((key) => document.body[key].split(/\s+/u)).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
const actorPattern = /^da000000-0000-4000-8000-[0-9a-f]{12}$/;
const server = http.createServer(async (request, response) => {
  if (!["127.0.0.1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress)) return reply(response, { synthetic: true }, 403);
  const path = new URL(request.url ?? "/", "http://127.0.0.1:3218").pathname;
  if (path === "/health") return reply(response, { synthetic: true });
  if (path === "/auth/v1/user" && request.method === "GET" && request.headers.apikey === "sb_publishable_participant_mock_only") {
    try {
      const claims = JSON.parse(Buffer.from((request.headers.authorization ?? "").replace(/^Bearer /, "").split(".")[1], "base64url").toString("utf8"));
      if (!actorPattern.test(claims.sub) || claims.exp * 1000 <= Date.now()) return reply(response, { synthetic: true }, 401);
      return reply(response, { id: claims.sub, aud: "authenticated", role: "authenticated", email: "synthetic@example.invalid", email_confirmed_at: "2026-10-16T00:00:00Z",
        app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-10-16T00:00:00Z" });
    } catch { return reply(response, { synthetic: true }, 401); }
  }
  if (request.method !== "POST" || request.headers.apikey !== "sb_secret_participant_mock_only") return reply(response, { synthetic: true }, 404);
  let body = ""; for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 270_000) return reply(response, { synthetic: true }, 413); }
  let args; try { args = JSON.parse(body); } catch { return reply(response, { synthetic: true }, 400); }
  if (path === "/__synthetic/abstracts" && actorPattern.test(args.actorId ?? "")) {
    fixtures.set(args.actorId, { mode: args.mode ?? "ready", submissions: args.submissions ?? [], settings: args.settings ?? settings }); return reply(response, { synthetic: true });
  }
  if (path === "/rest/v1/rpc/msrc_participant_status") return reply(response, { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true, cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 });
  if (path === "/rest/v1/rpc/msrc_abstracts_status") return reply(response, { enabled: true, settingsComplete: true });
  const actor = args.session_claims?.sub;
  if (args.edition_key !== "synthetic-participants-2027" || !actorPattern.test(actor ?? "")) return reply(response, { state: "denied" });
  const fixture = fixtures.get(actor) ?? { mode: "ready", submissions: [], settings };
  fixtures.set(actor, fixture);
  if (fixture.mode === "missing") return reply(response, { code: "PGRST202", message: "Synthetic missing capability" }, 404);
  if (path === "/rest/v1/rpc/msrc_participant_profile_complete") return reply(response, { state: "ready", complete: fixture.mode !== "profile_incomplete" });
  if (path === "/rest/v1/rpc/msrc_abstracts_me") return reply(response, { state: "ready", settings: fixture.settings, submissions: fixture.submissions });
  const key = actor + ":" + args.operation_id;
  if (operations.has(key)) return reply(response, operations.get(key));
  const submission = fixture.submissions.find((entry) => entry.id === args.submission_id);
  if (path === "/rest/v1/rpc/msrc_abstracts_save_draft") {
    if (fixture.mode === "conflict" || submission && (submission.version !== args.expected_version || !["draft", "revision_requested"].includes(submission.status))) return reply(response, { state: "conflict" });
    const saved = submission ?? { id: randomUUID(), reference: null, status: "draft", version: 0, finalizedAt: null, decision: null };
    saved.document = args.document; saved.wordCount = count(args.document); saved.version++;
    if (!submission) fixture.submissions.push(saved);
    const result = { state: "saved", submission: saved }; operations.set(key, result); return reply(response, result);
  }
  if (path === "/rest/v1/rpc/msrc_abstracts_finalize") {
    if (["evidence_gate", "pi_limit"].includes(fixture.mode)) return reply(response, { state: fixture.mode });
    if (!submission || submission.version !== args.expected_version || !["draft", "revision_requested"].includes(submission.status)) return reply(response, { state: "conflict" });
    submission.status = "submitted"; submission.finalizedAt = new Date().toISOString(); submission.reference ??= "SYNTHETIC-ABSTRACT-" + submission.id.slice(0, 8);
    const result = { state: "finalized", submission }; operations.set(key, result); return reply(response, result);
  }
  return reply(response, { synthetic: true }, 404);
});
server.listen(3218, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close());
