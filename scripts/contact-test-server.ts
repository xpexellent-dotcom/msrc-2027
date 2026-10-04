/** Synthetic Contact browser harness. Loopback only, fixed dummy credentials,
 * fake provider/counter endpoints; never reads a real secret or hosted database. */
import { createServer, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";

if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Contact mocks refuse deployed environments");
type Mode = "success" | "provider-failure" | "provider-timeout" | "database-failure";
let mode: Mode = "success";
let sendCount = 0;
let reservationCount = 0;
let lastEnvelopeContainsHtml = false;
const buckets = new Map<string, { count: number; expires: number }>();
function respond(response: ServerResponse, value: unknown, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}
const backend = createServer(async (request, response) => {
  try {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > 30_000) { respond(response, {}, 413); return; }
      chunks.push(chunk);
    }
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
    if (request.url === "/__control" && request.method === "POST") {
      if (body.reset) { buckets.clear(); sendCount = 0; reservationCount = 0; lastEnvelopeContainsHtml = false; }
      mode = ["success", "provider-failure", "provider-timeout", "database-failure"].includes(body.mode) ? body.mode : "success";
      if (Number.isInteger(body.globalCount) && body.globalCount >= 0 && body.globalCount <= 60) {
        buckets.set("global_day", { count: body.globalCount, expires: Date.now() + 86_400_000 });
      }
      respond(response, { ready: true }); return;
    }
    if (request.url === "/__state" && request.method === "GET") {
      respond(response, { sendCount, reservationCount, lastEnvelopeContainsHtml }); return;
    }
    if (request.url === "/rest/v1/rpc/msrc_contact_reserve_attempt" && request.method === "POST") {
      if (request.headers.apikey !== "sb_secret_contact_mock_only") { respond(response, {}, 401); return; }
      if (mode === "database-failure") { respond(response, {}, 503); return; }
      if (![body.p_ip_hash, body.p_email_hash, body.p_nonce_hash].every((hash) => typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash))) {
        respond(response, {}, 400); return;
      }
      const now = Date.now();
      const nonce = "nonce:" + body.p_nonce_hash;
      if ((buckets.get(nonce)?.expires ?? 0) > now) {
        respond(response, { allowed: false, reason: "replayed", retry_after_seconds: 0 }); return;
      }
      const hour = Math.floor(now / 3_600_000);
      const day = Math.floor(now / 86_400_000);
      const wanted = [
        { key: "ip_hour:" + body.p_ip_hash + ":" + hour, max: body.p_ip_hour_limit, expires: (hour + 1) * 3_600_000 },
        { key: "email_hour:" + body.p_email_hash + ":" + hour, max: body.p_email_hour_limit, expires: (hour + 1) * 3_600_000 },
        { key: "ip_day:" + body.p_ip_hash + ":" + day, max: body.p_ip_day_limit, expires: (day + 1) * 86_400_000 },
        { key: "email_day:" + body.p_email_hash + ":" + day, max: body.p_email_day_limit, expires: (day + 1) * 86_400_000 },
        { key: "global_day", max: 60, expires: (day + 1) * 86_400_000 },
      ];
      const exceeded = wanted.filter((bucket) => (buckets.get(bucket.key)?.count ?? 0) >= bucket.max);
      if (exceeded.length) {
        respond(response, { allowed: false, reason: "limited",
          retry_after_seconds: Math.max(1, ...exceeded.map((bucket) => Math.ceil((bucket.expires - now) / 1_000))) }); return;
      }
      for (const bucket of wanted) buckets.set(bucket.key, { count: (buckets.get(bucket.key)?.count ?? 0) + 1, expires: bucket.expires });
      buckets.set(nonce, { count: 1, expires: Date.parse(body.p_nonce_expires_at) });
      reservationCount += 1;
      respond(response, { allowed: true, reason: "allowed", retry_after_seconds: 0 }); return;
    }
    if (request.url === "/emails" && request.method === "POST") {
      if (request.headers.authorization !== "Bearer re_contact_mock_only") { respond(response, {}, 401); return; }
      sendCount += 1;
      lastEnvelopeContainsHtml = Boolean(body.html || body.react || body.attachments);
      // Discard visitor content; retain only counters and an envelope-format boolean.
      if (mode === "provider-timeout") return;
      respond(response, mode === "provider-failure" ? {} : { id: "synthetic-contact-accepted" }, mode === "provider-failure" ? 503 : 200);
      return;
    }
    respond(response, {}, 404);
  } catch { respond(response, {}, 400); }
});
backend.listen(3214, "127.0.0.1");

const baseEnv: NodeJS.ProcessEnv = { ...process.env, NEXT_TELEMETRY_DISABLED: "1", CONTACT_TEST_MODE: "true",
  CONTACT_SECURITY_SECRET: "ab".repeat(32), RESEND_API_KEY: "re_contact_mock_only",
  CONTACT_SUPABASE_SECRET_KEY: "sb_secret_contact_mock_only", CONTACT_SUPABASE_URL: "http://127.0.0.1:3214",
  CONTACT_MINIMUM_FILL_SECONDS: "3", CONTACT_IP_HOUR_LIMIT: "3", CONTACT_IP_DAY_LIMIT: "10",
  CONTACT_EMAIL_HOUR_LIMIT: "3", CONTACT_EMAIL_DAY_LIMIT: "10" };
delete baseEnv.VERCEL;
delete baseEnv.VERCEL_ENV;
const children = [3212, 3213].map((port) => spawn(process.execPath,
  ["./node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
  { env: { ...baseEnv, CONTACT_DELIVERY_ENABLED: port === 3212 ? "true" : "false" }, stdio: "inherit", windowsHide: true }));
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  backend.closeAllConnections();
  backend.close();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
for (const child of children) child.on("exit", (code) => { if (!stopping) { process.exitCode = code ?? 1; stop(); } });
