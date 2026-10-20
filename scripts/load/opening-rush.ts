/** Owner-run synthetic staging exercise; no cloud provisioning, bypasses or retries. */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { assertStagingTarget } from "../staging/guard.mjs";

type Env = Record<string, string | undefined>;
type Json = Record<string, unknown>;
type Participant = { actorId: string; email: string; documentType: "passport"; documentNumber: string };
type Manifest = { version: 1; state: "complete"; runId: string; editionKey: string; appOrigin: string; supabaseUrl: string;
  participants: Participant[]; staff: { actorId: string; email: string }[] };
type Client = { cookie: string };
type Sample = { label: string; milliseconds: number; status: number; state: string; ok: boolean };
type Dependencies = { env?: Env; read?: (path: string) => Promise<string>; fetch?: typeof fetch;
  now?: () => number; wait?: (ms: number) => Promise<void>; progress?: (message: string) => void };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const syntheticEmail = /^[a-z0-9][a-z0-9._+-]*@example\.invalid$/;
const record = (value: unknown): Json | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Json : null;
class LoadFailure extends Error {}
function fail(message: string): never { throw new LoadFailure(message); }
function integer(env: Env, key: string, fallback: number, min: number, max: number) {
  const value = env[key] ?? String(fallback);
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) fail(`Invalid ${key}`);
  return Number(value);
}

export function loadConfig(env: Env, now: number) {
  // This is deliberately first, before manifest reads, credentials or network I/O.
  const origin = assertStagingTarget({ url: env.MSRC_LOAD_URL, confirm: env.MSRC_STAGING_CONFIRM,
    allowPattern: env.MSRC_STAGING_APP_ALLOW_PATTERN });
  const supabaseUrl = assertStagingTarget({ url: env.MSRC_STAGING_SUPABASE_URL, confirm: env.MSRC_STAGING_CONFIRM,
    allowPattern: env.MSRC_STAGING_SUPABASE_ALLOW_PATTERN });
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(supabaseUrl)) fail("Use the staging Supabase project URL that produced the manifest");
  const role = env.MSRC_LOAD_ROLE ?? "combined";
  if (!["combined", "participants", "staff"].includes(role)) fail("Invalid MSRC_LOAD_ROLE");
  const opening = env.MSRC_LOAD_OPEN_AT ?? "", openAt = Date.parse(opening);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(opening)
    || !Number.isFinite(openAt) || openAt < now + 5_000 || openAt > now + 1_800_000) fail("MSRC_LOAD_OPEN_AT must include its offset and be 5 seconds to 30 minutes in the future");
  const total = integer(env, "MSRC_LOAD_PARTICIPANTS", 500, 1, 2000);
  const shards = integer(env, "MSRC_LOAD_SHARDS", 1, 1, total);
  const shard = integer(env, "MSRC_LOAD_SHARD", 0, 0, shards - 1);
  const manifestPath = env.MSRC_LOAD_MANIFEST;
  if (!manifestPath) fail("MSRC_LOAD_MANIFEST is required");
  const password = env.MSRC_STAGING_PARTICIPANT_PASSWORD ?? "";
  if (role !== "staff" && (password.length < 10 || Buffer.byteLength(password) > 72)) fail("A staging participant password of 10 to 72 bytes is required");
  const staffCookie = env.MSRC_LOAD_STAFF_COOKIE ?? "";
  if (role !== "participants" && !/^__Host-msrc-staff=[A-Za-z0-9_-]{40,3800}$/.test(staffCookie)) fail("Supply exactly the authenticated synthetic __Host-msrc-staff cookie pair");
  const vercelOidc = env.MSRC_LOAD_VERCEL_OIDC_TOKEN ?? "";
  const vercelBypass = env.MSRC_LOAD_VERCEL_BYPASS_SECRET ?? env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
  if (vercelOidc && vercelBypass || [vercelOidc, vercelBypass].some((token) => token && !/^[A-Za-z0-9._-]{8,8192}$/.test(token))) fail("Supply one valid origin-scoped Vercel automation credential");
  return { origin, supabaseUrl, role, openAt, total, shards, shard, manifestPath, password, staffCookie,
    vercelOidc, vercelBypass,
    durationMs: integer(env, "MSRC_LOAD_DURATION_SECONDS", 600, 10, 1800) * 1000,
    publicViews: integer(env, "MSRC_LOAD_PUBLIC_VIEWS", 1000, 1, 10000),
    pollMs: integer(env, "MSRC_LOAD_POLL_SECONDS", 30, 5, 300) * 1000,
    staffPollMs: integer(env, "MSRC_LOAD_STAFF_POLL_SECONDS", 10, 5, 60) * 1000,
    batchSize: integer(env, "MSRC_LOAD_BATCH_SIZE", 25, 1, 100),
    p95Ms: integer(env, "MSRC_LOAD_P95_MS", 1000, 1, 30000),
    timeoutMs: integer(env, "MSRC_LOAD_TIMEOUT_MS", 15000, 1000, 60000) };
}

export function loadManifest(raw: string, config: ReturnType<typeof loadConfig>): Manifest {
  let value: Json | null;
  try { value = record(JSON.parse(raw)); } catch { return fail("Invalid staging manifest JSON"); }
  if (!value || value.version !== 1 || value.state !== "complete" || typeof value.runId !== "string"
    || !/^[a-z0-9-]{1,40}$/.test(value.runId) || value.editionKey !== `staging-${value.runId}`
    || value.appOrigin !== config.origin || value.supabaseUrl !== config.supabaseUrl
    || !Array.isArray(value.participants) || value.participants.length < config.total || !Array.isArray(value.staff)) fail("Manifest does not match this staging origin or participant count");
  const manifest = value as unknown as Manifest;
  const actors = new Set<string>(), emails = new Set<string>(), documents = new Set<string>();
  for (const person of [...manifest.participants, ...manifest.staff]) {
    if (!person || !uuid.test(person.actorId) || !syntheticEmail.test(person.email)
      || actors.has(person.actorId) || emails.has(person.email)) fail("Manifest must contain distinct synthetic actors and example.invalid emails only");
    actors.add(person.actorId); emails.add(person.email);
  }
  for (const person of manifest.participants) {
    if (person.documentType !== "passport" || !/^SYN[A-Z0-9]{1,17}$/.test(person.documentNumber)
      || documents.has(person.documentNumber)) fail("Manifest needs distinct SYN-prefixed synthetic passport values");
    documents.add(person.documentNumber);
  }
  return manifest;
}

export function summarizeSamples(samples: Sample[]) {
  return Object.fromEntries([...new Set(samples.map((sample) => sample.label))].sort().map((label) => {
    const rows = samples.filter((sample) => sample.label === label), times = rows.map((sample) => sample.milliseconds).sort((a, b) => a - b);
    const counts = (field: "state" | "status") => Object.fromEntries([...new Set(rows.map((sample) => String(sample[field])))].sort()
      .map((key) => [key, rows.filter((sample) => String(sample[field]) === key).length]));
    return [label, { count: rows.length, failures: rows.filter((sample) => !sample.ok).length,
      p50Ms: times[Math.ceil(times.length * .5) - 1], p95Ms: times[Math.ceil(times.length * .95) - 1], maxMs: times.at(-1),
      http: counts("status"), states: counts("state") }];
  }));
}

export async function runOpeningLoad(dependencies: Dependencies = {}) {
  const env = dependencies.env ?? process.env, now = dependencies.now ?? Date.now;
  const wait = dependencies.wait ?? ((ms) => sleep(Math.max(0, ms)));
  const config = loadConfig(env, now());
  const manifest = loadManifest(await (dependencies.read ?? ((path) => readFile(path, "utf8")))(config.manifestPath), config);
  const fetcher = dependencies.fetch ?? fetch, samples: Sample[] = [];
  const progress = dependencies.progress ?? (() => {});
  const participants = manifest.participants.slice(0, config.total).map((person, index) => ({ person, index }))
    .filter(({ index }) => index % config.shards === config.shard);
  const staffActors = new Set(manifest.staff.map((person) => person.actorId));
  const participantEmails = new Set(manifest.participants.slice(0, config.total).map((person) => person.email));
  const staff: Client = { cookie: config.staffCookie }, publicClient: Client = { cookie: "" };
  const until = async (deadline: number) => { if (now() < deadline) await wait(deadline - now()); };
  const counters = { loggedIn: 0, submitted: 0, approved: 0, waitlisted: 0, skipped: 0, journeyFailures: 0 };
  let remainingPending: number | null = null;
  const failures: string[] = [];
  async function request(label: string, client: Client, path: string, expected: string[], body?: Json): Promise<Json> {
    const started = now();
    let status = 0, state = "network-error", ok = false;
    try {
      const response = await fetcher(config.origin + path, { method: body ? "POST" : "GET", redirect: "manual",
        signal: AbortSignal.timeout(config.timeoutMs), headers: { Accept: expected.length ? "application/json" : "text/html",
          Origin: config.origin, "Sec-Fetch-Site": "same-origin", ...(client.cookie ? { Cookie: client.cookie } : {}),
          ...(config.vercelOidc ? { "x-vercel-trusted-oidc-idp-token": config.vercelOidc } : {}),
          ...(config.vercelBypass ? { "x-vercel-protection-bypass": config.vercelBypass } : {}),
          ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      status = response.status;
      if (status >= 300 && status < 400) { state = "redirect-refused"; fail(`${label}: redirect-refused`); }
      // Cookie values never leave memory or enter receipts. Only same-origin host cookies are retained.
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(";")[0];
        if (/^__Host-msrc-(participant|staff)=[A-Za-z0-9_-]*$/.test(pair)) client.cookie = pair;
      }
      if (!expected.length) {
        await response.arrayBuffer(); state = response.ok ? "ok" : "http-error"; ok = response.ok;
        if (!ok) fail(`${label}: http-${status}`);
        return {} as Json;
      }
      let data: Json | null = null;
      try { data = record(await response.json()); } catch { state = "invalid-json"; }
      if (data) state = typeof data.state === "string" && /^[a-z_-]{1,40}$/.test(data.state) ? data.state : "invalid-response";
      ok = response.ok && expected.includes(state) && data !== null;
      if (!ok) fail(`${label}: http-${status}/${state}`);
      return data!;
    } catch (error) {
      if (error instanceof LoadFailure) throw error;
      fail(`${label}: network-or-timeout`);
    } finally { samples.push({ label, milliseconds: Math.max(0, now() - started), status, state, ok }); }
  }
  async function staffRead(label = "staff_queue") {
    const data = await request(label, staff, "/api/staff-portal?area=registration&status=pending_approval", ["authenticated"]);
    const profile = record(data.profile);
    if (!profile || !staffActors.has(String(profile.actorId)) || !Array.isArray(profile.roles)
      || !profile.roles.includes("registrationWorkshopAdministrator") || profile.roles.includes("superAdmin")) fail("Use a seeded synthetic regular registration administrator, after its exact-session email check");
    if (typeof data.formToken !== "string" || !Array.isArray(record(data.registration)?.requests)) fail("staff_queue: invalid-contract");
    return data;
  }
  // Preflight fails closed before scheduling the rush: no retries of denied/closed/limited states.
  const sessions: { person: Participant; index: number; client: Client }[] = [];
  try {
    await request("preflight_public", publicClient, "/en", []);
    if (config.role !== "participants") await staffRead();
    if (config.role !== "staff") {
      // Five concurrent logins; each uses a fresh nonce and the real 2-second minimum reading time.
      for (let offset = 0; offset < participants.length; offset += 5) {
        const batch = await Promise.allSettled(participants.slice(offset, offset + 5).map(async ({ person, index }) => {
          const client = { cookie: "" };
          const form = await request("login_form", client, "/api/participant-accounts", ["ready"]);
          if (typeof form.formToken !== "string") fail("login_form: missing-token");
          await wait(2100);
          await request("login", client, "/api/participant-accounts", ["authenticated"], {
            action: "signin", email: person.email, password: config.password, website: "", formToken: form.formToken,
          });
          if (!/^__Host-msrc-participant=[A-Za-z0-9_-]{40,32768}$/.test(client.cookie)) fail("login: missing-session-cookie");
          const status = await request("preflight_status", client, "/api/registration/me", ["ready"]);
          if (status.registration !== null) fail("preflight_status: use fresh synthetic actors without previous requests");
          counters.loggedIn++; sessions.push({ person, index, client });
        }));
        const failed = batch.find((entry) => entry.status === "rejected");
        if (failed?.status === "rejected") throw failed.reason;
      }
    }
    if (now() >= config.openAt) fail("Preflight missed MSRC_LOAD_OPEN_AT; choose a later staging opening");
  } catch (error) {
    failures.push(error instanceof LoadFailure ? error.message : "preflight-unavailable");
    return result("BLOCKED");
  }
  progress("Preflight complete; waiting for the configured staging opening. No delivery or feature settings are changed.");
  const endAt = config.openAt + config.durationMs;
  let lastProgress = now();
  const recordFailure = (error: unknown) => {
    counters.journeyFailures++;
    const message = error instanceof LoadFailure ? error.message : "journey-unavailable";
    if (!failures.includes(message) && failures.length < 20) failures.push(message);
  };
  const participantWork = sessions.map(async ({ person, index, client }) => {
    try {
      // Open-loop arrivals use global indices, so shards sum to the requested burst.
      const due = config.openAt + index * config.durationMs / config.total;
      let nextPoll = config.openAt;
      while (nextPoll < due) {
        await until(nextPoll);
        await request("participant_status", client, "/api/registration/me", ["ready"]);
        nextPoll += config.pollMs;
      }
      await until(due);
      const form = await request("registration_form", client, "/api/workflows/registration", ["ready"]);
      if (typeof form.formToken !== "string" || typeof form.termsVersion !== "string") fail("registration_form: invalid-contract");
      await wait(2100);
      const submitted = await request("registration_submit", client, "/api/workflows/registration", ["submitted"], {
        documentType: person.documentType, documentNumber: person.documentNumber,
        termsAccepted: true, termsVersion: form.termsVersion, formToken: form.formToken, website: "",
      });
      if (!uuid.test(String(record(submitted.request)?.id)) || record(submitted.request)?.status !== "pending_approval") fail("registration_submit: invalid-contract");
      counters.submitted++;
      while (now() < endAt) {
        await request("participant_status", client, "/api/registration/me", ["ready"]);
        await wait(Math.min(config.pollMs, Math.max(0, endAt - now())));
      }
    } catch (error) { recordFailure(error); }
  });
  const publicWork = async () => {
    const paths = ["/en", "/ar", "/en/registration", "/ar/registration"];
    for (let index = config.shard; index < config.publicViews; index += config.shards) {
      await until(config.openAt + index * config.durationMs / config.publicViews);
      try { await request("public_page", publicClient, paths[index % paths.length], []); } catch (error) { recordFailure(error); }
    }
  };
  const staffWork = async () => {
    if (config.role === "participants") return;
    await until(config.openAt);
    // A final bounded sweep catches the last arrivals; it does not extend participant arrivals.
    do {
      try {
        const data = await staffRead(), rows = record(data.registration)!.requests as unknown[];
        const ids = rows.map(record).filter((row) => row?.status === "pending_approval" && participantEmails.has(String(row.email)) && uuid.test(String(row.id)))
          .slice(0, config.batchSize).map((row) => row!.id as string);
        if (ids.length) {
          const decision = await request("staff_approve", staff, "/api/staff-portal", ["updated"], {
            action: "registration-approve", requestIds: ids, website: "", formToken: data.formToken,
          });
          const counts = record(decision.decided);
          if (!counts || [counts.approved, counts.waitlisted, counts.skipped].some((count) => !Number.isSafeInteger(count) || Number(count) < 0)
            || Number(counts.approved) + Number(counts.waitlisted) + Number(counts.skipped) !== ids.length) fail("staff_approve: invalid-contract");
          counters.approved += Number(counts.approved); counters.waitlisted += Number(counts.waitlisted); counters.skipped += Number(counts.skipped);
        }
      } catch (error) { recordFailure(error); break; }
      if (now() >= endAt + 5000) break;
      await wait(config.staffPollMs);
    } while (now() <= endAt + config.staffPollMs + 5000);
  };
  const heartbeat = async () => {
    while (now() < endAt) {
      await wait(Math.min(30000, Math.max(0, endAt - now())));
      if (now() - lastProgress >= 30000) { progress(`Progress: ${counters.submitted} submissions, ${counters.approved} approvals, ${counters.journeyFailures} journey failures.`); lastProgress = now(); }
    }
  };
  await Promise.all([...participantWork, ...(config.role === "staff" ? [] : [publicWork()]), staffWork(), heartbeat()]);
  if (config.role !== "participants") {
    try {
      const finalQueue = await staffRead("staff_queue_final");
      const rows = record(finalQueue.registration)!.requests as unknown[];
      remainingPending = rows.map(record).filter((row) => row?.status === "pending_approval"
        && participantEmails.has(String(row.email))).length;
      if (remainingPending > 0) fail("staff_queue_final: pending-manifest-requests-remain");
    } catch (error) { recordFailure(error); }
  }
  const report = result("PASS");
  if (failures.length || Object.values(report.metrics).some((metric) => metric.failures || metric.p95Ms > config.p95Ms)
    || config.role !== "staff" && counters.submitted !== participants.length
    || config.role === "combined" && counters.approved + counters.waitlisted < counters.submitted
    || config.role === "staff" && counters.approved + counters.waitlisted === 0) report.outcome = "FAIL";
  return report;

  function result(outcome: string) {
    return { schemaVersion: 1, runId: manifest.runId, outcome, target: config.origin, role: config.role,
      startedAt: new Date(config.openAt).toISOString(), durationSeconds: config.durationMs / 1000,
      assumptions: { globalSubmissions: config.total, globalPublicViews: config.publicViews, p95LimitMs: config.p95Ms,
        capacity: "Owner-entered staging setting; approximately 2000 is a scenario to confirm" },
      shard: { index: config.shard, total: config.shards, expectedSubmissions: config.role === "staff" ? 0 : participants.length },
      counters, remainingPending, failures, metrics: summarizeSamples(samples),
      limitations: ["HTTP driver does not execute browser JavaScript or load page assets.",
        "PASS applies only to this shard; aggregate all shards and verify database seat, ticket, outbox and deduplication invariants.",
        "20 participant POSTs/IP/hour includes login and submission; distinct real egress is required for the full scenario."] };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const report = await runOpeningLoad({ progress: (message) => process.stderr.write(message + "\n") });
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    process.exitCode = report.outcome === "PASS" ? 0 : 1;
  } catch (error) {
    // Never echo arbitrary transport errors, bodies, credentials or manifest content.
    process.stderr.write((error instanceof LoadFailure ? error.message : "Load refused: check the staging guard and local configuration") + "\n");
    process.exitCode = 1;
  }
}
