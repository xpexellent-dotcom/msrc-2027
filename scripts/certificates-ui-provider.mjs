/** CRT-01..06 loopback presentation fixture. This is not database, S2, Auth or email evidence. */
import http from "node:http";

if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Synthetic certificate provider is loopback-only");
const fixtures = new Map();
const verificationFixtures = new Map();
const actorPattern = /^da000000-0000-4000-8000-[0-9a-f]{12}$/;
const reply = (response, value, status = 200) => response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(value));
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
  let body = "";
  for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 65_536) return reply(response, { synthetic: true }, 413); }
  let args; try { args = JSON.parse(body); } catch { return reply(response, { synthetic: true }, 400); }
  if (path === "/__synthetic/certificates" && actorPattern.test(args.actorId ?? "")) {
    fixtures.set(args.actorId, { mode: args.mode ?? "ready", view: args.view, submittedView: args.submittedView, completions: 0 });
    return reply(response, { synthetic: true });
  }
  if (path === "/__synthetic/verification" && /^[a-f0-9]{64}$/.test(args.code ?? "")) {
    verificationFixtures.set(args.code, args.result);
    return reply(response, { synthetic: true });
  }
  if (path === "/rest/v1/rpc/msrc_participant_status") return reply(response, { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true,
    cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 });
  if (path === "/rest/v1/rpc/msrc_participant_form_claim") return reply(response, { state: "claimed" });
  const rpc = path.split("/").pop();
  if (rpc === "msrc_certificates_verify") {
    const result = verificationFixtures.get(args.verification_code ?? args.code);
    if (result === "missing") return reply(response, { code: "PGRST202", message: "Synthetic missing capability" }, 404);
    return reply(response, result ?? { state: "not_found" });
  }
  if (rpc === "msrc_certificates_status") return reply(response, { enabled: true });
  const actor = args.session_claims?.sub;
  if (args.edition_key !== "synthetic-participants-2027" || !actorPattern.test(actor ?? "")) return reply(response, { state: "denied" });
  const fixture = fixtures.get(actor);
  if (!fixture) return reply(response, { state: "denied" });
  if (fixture.mode === "missing") return reply(response, { code: "PGRST202", message: "Synthetic missing capability" }, 404);
  if (rpc === "msrc_certificates_participant_read") return reply(response, fixture.view);
  if (rpc === "msrc_certificates_participant_manage" && args.input?.action === "submitSurvey") {
    // No request body, answer values, shared response key or precise submission time is retained.
    fixture.completions = 1;
    fixture.view = fixture.submittedView ?? fixture.view;
    return reply(response, { state: "completed" });
  }
  if (rpc === "msrc_certificates_participant_manage" && args.input?.action === "requestCorrection") return reply(response, { state: "requested" });
  return reply(response, { synthetic: true }, 404);
});
server.listen(3218, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close());
