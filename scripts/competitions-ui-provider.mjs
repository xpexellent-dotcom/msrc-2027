/** Loopback synthetic UI provider. This is never database, permission or production evidence. */
import http from "node:http";
import { randomUUID } from "node:crypto";
if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Synthetic provider is loopback-only");
const fixtures = new Map(), operations = new Map();
const settings = { stageStates: { entry: "open", selection: "not_ready", judging: "not_ready", final_material: "not_ready", membership: "not_ready" }, pitchPrompt: "Synthetic test prompt", finalistCapPerTrack: null, filesReady: false };
const actorPattern = /^da000000-0000-4000-8000-[0-9a-f]{12}$/;
const reply = (r, value, status = 200) => r.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(value));
const server = http.createServer(async (req, res) => {
  if (!["127.0.0.1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)) return reply(res, {}, 403);
  const path = new URL(req.url ?? "/", "http://127.0.0.1:3218").pathname;
  if (path === "/health") return reply(res, { synthetic: true });
  if (path === "/auth/v1/user" && req.method === "GET" && req.headers.apikey === "sb_publishable_participant_mock_only") {
    try { const claims = JSON.parse(Buffer.from((req.headers.authorization ?? "").replace(/^Bearer /, "").split(".")[1], "base64url").toString("utf8"));
      if (!actorPattern.test(claims.sub) || claims.exp * 1000 <= Date.now()) return reply(res, {}, 401);
      return reply(res, { id: claims.sub, aud: "authenticated", role: "authenticated", email: "synthetic@example.invalid", email_confirmed_at: "2026-10-16T00:00:00Z", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-10-16T00:00:00Z" });
    } catch { return reply(res, {}, 401); }
  }
  if (req.method !== "POST" || req.headers.apikey !== "sb_secret_participant_mock_only") return reply(res, {}, 404);
  let body = ""; for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 270_000) return reply(res, {}, 413); }
  let args; try { args = JSON.parse(body); } catch { return reply(res, {}, 400); }
  if (path === "/__synthetic/competitions" && actorPattern.test(args.actorId ?? "")) { fixtures.set(args.actorId, { mode: args.mode ?? "ready", entries: args.entries ?? [], hackathonProfile: args.hackathonProfile ?? null, settings: args.settings ?? { hackathon: settings, three_minute_thesis: settings } }); return reply(res, { synthetic: true }); }
  if (path === "/rest/v1/rpc/msrc_participant_status") return reply(res, { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true, cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 });
  if (path === "/rest/v1/rpc/msrc_competitions_status") return reply(res, { enabled: true });
  const actor = args.session_claims?.sub;
  if (args.edition_key !== "synthetic-participants-2027" || !actorPattern.test(actor ?? "")) return reply(res, { state: "denied" });
  const fixture = fixtures.get(actor) ?? { mode: "ready", entries: [], settings: { hackathon: settings, three_minute_thesis: settings } }; fixtures.set(actor, fixture);
  if (fixture.mode === "missing") return reply(res, { code: "PGRST202" }, 404);
  if (path === "/rest/v1/rpc/msrc_participant_profile_complete") return reply(res, { state: "ready", complete: fixture.mode !== "profile_incomplete" });
  if (path === "/rest/v1/rpc/msrc_competitions_me") return reply(res, { state: "ready", settings: fixture.settings, entries: fixture.entries, hackathonProfile: fixture.hackathonProfile ?? null });
  const key = actor + ":" + args.operation_id; if (operations.has(key)) return reply(res, operations.get(key));
  const entry = fixture.entries.find((e) => e.id === args.entry_id);
  if (entry && (entry.version !== args.expected_version || args.competition_type && entry.kind !== args.competition_type)) return reply(res, { state: "conflict" });
  let outcome;
  if (path === "/rest/v1/rpc/msrc_competitions_save_draft") {
    if (entry && entry.status !== "draft") return reply(res, { state: "locked" });
    const saved = entry ?? { id: randomUUID(), kind: args.competition_type, version: 0, status: "draft", isLead: true, invitationAccepted: false, roster: [{ id: actor, email: "synthetic@example.invalid", isLead: true, confirmed: false }], files: [], outcome: null };
    saved.document = args.document; saved.version++; if (!entry) fixture.entries.push(saved); outcome = { state: "saved", entry: saved };
  } else if (path === "/rest/v1/rpc/msrc_competitions_submit") {
    if (!entry || entry.status !== "draft") return reply(res, { state: "conflict" });
    if (fixture.settings[entry.kind].stageStates.entry !== "open") return reply(res, { state: "settings_incomplete" });
    if (entry.kind === "hackathon" && (!fixture.hackathonProfile || !fixture.hackathonProfile.enrolledInSaudiUniversity || !entry.roster.every((member) => member.isLead || member.confirmed))) return reply(res, { state: "roster_incomplete" });
    entry.status = "submitted"; entry.version++; outcome = { state: "submitted", entry };
  } else if (path === "/rest/v1/rpc/msrc_competitions_member_action") {
    if (!entry) return reply(res, { state: "invalid" });
    if (args.action === "invite") {
      if (entry.kind !== "hackathon" || entry.document.participationMode !== "team" || entry.roster.length >= 5) return reply(res, { state: "roster_limit" });
      if (args.email === "unverified@example.invalid") return reply(res, { state: "verified_account_required" });
      if (entry.roster.some((member) => member.email === args.email)) return reply(res, { state: "already_member" });
      entry.roster.push({ id: randomUUID(), email: args.email, isLead: false, confirmed: false }); entry.version++; outcome = { state: "invited", entry };
    } else { const member = entry.roster.find((row) => row.id === actor); if (!member) return reply(res, { state: "denied" }); member.confirmed = true; entry.invitationAccepted = true; entry.version++; outcome = { state: "confirmed", entry }; }
  } else if (path === "/rest/v1/rpc/msrc_competitions_hackathon_action") {
    if (args.action === "profile") { fixture.hackathonProfile = args.payload; outcome = { state: "profile_saved" }; }
    else if (args.action === "finalist_confirm" && entry?.finalistWorkspace && entry.status === "accepted") { entry.finalistWorkspace.confirmed = true; entry.version++; outcome = { state: "finalist_confirmed", entry }; }
    else return reply(res, { state: "evidence_gate" });
  } else return reply(res, {}, 404);
  operations.set(key, structuredClone(outcome)); return reply(res, outcome);
});
server.listen(3218, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close());
