import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig, loadManifest, runOpeningLoad, summarizeSamples } from "../../scripts/load/opening-rush.ts";

const origin = "https://msrc-staging.example.invalid";
const supabaseUrl = "https://abcdefghijklmnopqrst.supabase.co";
const start = Date.parse("2026-10-20T17:00:00.000Z");
const participantId = "11111111-1111-4111-8111-111111111111";
const staffId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const cookie = "x".repeat(50);
const env = () => ({ MSRC_LOAD_URL: origin, MSRC_STAGING_CONFIRM: "yes",
  MSRC_STAGING_APP_ALLOW_PATTERN: "^https://msrc-staging\\.example\\.invalid$",
  MSRC_STAGING_SUPABASE_URL: supabaseUrl, MSRC_STAGING_SUPABASE_ALLOW_PATTERN: "^https://abcdefghijklmnopqrst\\.supabase\\.co$",
  MSRC_LOAD_MANIFEST: ".tools/staging/synthetic-manifest.json", MSRC_LOAD_OPEN_AT: new Date(start + 10000).toISOString(),
  MSRC_LOAD_PARTICIPANTS: "1", MSRC_LOAD_DURATION_SECONDS: "10", MSRC_LOAD_PUBLIC_VIEWS: "2", MSRC_LOAD_POLL_SECONDS: "5",
  MSRC_LOAD_STAFF_POLL_SECONDS: "5", MSRC_STAGING_PARTICIPANT_PASSWORD: "synthetic-password",
  MSRC_LOAD_STAFF_COOKIE: `__Host-msrc-staff=${cookie}` });
const manifest = () => ({ version: 1, state: "complete", runId: "synthetic-test", editionKey: "staging-synthetic-test", appOrigin: origin, supabaseUrl,
  participants: [{ actorId: participantId, email: "synthetic-test-1@example.invalid", documentType: "passport", documentNumber: "SYN0001" }],
  staff: [{ actorId: staffId, email: "synthetic-staff@example.invalid" }] });
function json(value: unknown, status = 200, cookie?: string) {
  return Response.json(value, { status, ...(cookie ? { headers: { "Set-Cookie": cookie } } : {}) });
}
afterEach(() => { vi.useRealTimers(); });

describe("load safety guards before local reads or HTTP", () => {
  it.each([undefined, "", "true", "YES", "no"])("refuses confirmation %s", async (confirm) => {
    const read = vi.fn(), fetch = vi.fn();
    await expect(runOpeningLoad({ env: { ...env(), MSRC_STAGING_CONFIRM: confirm }, read, fetch, now: () => start })).rejects.toThrow();
    expect(read).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["https://msrc2027.com", "https://www.msrc2027.com", "https://staging.msrc2027.com",
    "https://ecemjggwlzqpjcwmchrl.supabase.co", "https://msrc2027.com."])("refuses production %s even with a matching allow pattern", async (target) => {
    const read = vi.fn(), fetch = vi.fn();
    await expect(runOpeningLoad({ env: { ...env(), MSRC_LOAD_URL: target,
      MSRC_STAGING_APP_ALLOW_PATTERN: "^" + target.replaceAll(".", "\\.") + "$" }, read, fetch, now: () => start })).rejects.toThrow();
    expect(read).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["", "https://.*", "^https://.*$", "^https://other-staging\\.example\\.invalid$"])("refuses missing or broad allow pattern %s", async (pattern) => {
    const read = vi.fn(), fetch = vi.fn();
    await expect(runOpeningLoad({ env: { ...env(), MSRC_STAGING_APP_ALLOW_PATTERN: pattern }, read, fetch, now: () => start })).rejects.toThrow();
    expect(read).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it("refuses unexpected target paths, credentials, insecure transport and staff-cookie header injection", () => {
    for (const url of [origin + "/api", origin + "?q=yes", origin.replace("https:", "http:"), origin.replace("https://", "https://user:password@")]) {
      expect(() => loadConfig({ ...env(), MSRC_LOAD_URL: url }, start)).toThrow();
    }
    expect(() => loadConfig({ ...env(), MSRC_LOAD_STAFF_COOKIE: `__Host-msrc-staff=${cookie}; Other=value` }, start)).toThrow();
    expect(() => loadConfig({ ...env(), MSRC_LOAD_STAFF_COOKIE: `__Host-msrc-staff=${cookie}\r\nX-Forwarded-For: 1.2.3.4` }, start)).toThrow();
  });
  it("rejects malformed numeric, shard, time and required settings before HTTP", async () => {
    for (const change of [{ MSRC_LOAD_PARTICIPANTS: "0" }, { MSRC_LOAD_SHARD: "1" }, { MSRC_LOAD_BATCH_SIZE: "101" },
      { MSRC_LOAD_OPEN_AT: "now" }, { MSRC_LOAD_OPEN_AT: "2026-10-20T17:00:10" }, { MSRC_LOAD_OPEN_AT: new Date(start).toISOString() }, { MSRC_LOAD_ROLE: "admin" },
      { MSRC_LOAD_MANIFEST: "" }, { MSRC_STAGING_PARTICIPANT_PASSWORD: "short" }]) {
      const fetch = vi.fn();
      await expect(runOpeningLoad({ env: { ...env(), ...change }, fetch, now: () => start })).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    }
  });
  it("rejects Vercel credential injection or ambiguous credentials before I/O", async () => {
    for (const change of [{ MSRC_LOAD_VERCEL_BYPASS_SECRET: "secret\r\nX-header: injected" },
      { MSRC_LOAD_VERCEL_OIDC_TOKEN: "a".repeat(9000) },
      { MSRC_LOAD_VERCEL_OIDC_TOKEN: "oidc-value", MSRC_LOAD_VERCEL_BYPASS_SECRET: "bypass-value" }]) {
      const read = vi.fn(), fetch = vi.fn();
      await expect(runOpeningLoad({ env: { ...env(), ...change }, read, fetch, now: () => start })).rejects.toThrow();
      expect(read).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
    }
  });
  it("accepts exact target but refuses mixed target, real addresses and duplicate or non-synthetic identities", () => {
    const config = loadConfig(env(), start);
    expect(loadManifest(JSON.stringify(manifest()), config).runId).toBe("synthetic-test");
    expect(() => loadManifest("broken", config)).toThrow();
    for (const change of [{ appOrigin: "https://another-staging.example.invalid" }, { participants: [] }, { state: "prepared" }, { version: 2 },
      { editionKey: "msrc-2027" }, { supabaseUrl: "https://ecemjggwlzqpjcwmchrl.supabase.co" },
      { participants: [{ ...manifest().participants[0], email: "real@example.com" }] },
      { participants: [{ ...manifest().participants[0], documentNumber: "REAL1234" }] },
      { staff: [{ actorId: participantId, email: "synthetic-other@example.invalid" }] }]) {
      expect(() => loadManifest(JSON.stringify({ ...manifest(), ...change }), config)).toThrow();
    }
  });
});

function fixture(options: { redirect?: boolean; staffActor?: string; roles?: string[]; closed?: boolean; submitStatus?: number; badDecision?: boolean; drift?: boolean;
  staffOnlySeeded?: boolean; backlogAtFinish?: boolean; finalQueueUnavailable?: boolean } = {}) {
  let submitted = Boolean(options.staffOnlySeeded), approved = false, lastLoginToken = 0, lastRegistrationToken = 0, staffReads = 0;
  const calls: { path: string; body: Record<string, unknown> | null; headers: Headers; at: number }[] = [];
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname, body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null;
    const headers = new Headers(init?.headers);
    expect(init?.redirect).toBe("manual"); expect(headers.get("origin")).toBe(origin);
    expect(headers.has("x-vercel-forwarded-for")).toBe(false); expect(headers.has("authorization")).toBe(false);
    calls.push({ path, body, headers, at: Date.now() });
    if (path === "/en" || path === "/ar" || path.endsWith("/registration") && !path.startsWith("/api/")) {
      return options.redirect ? new Response(null, { status: 307, headers: { Location: "https://msrc2027.com/en" } }) : new Response("<html>Staging</html>");
    }
    if (path === "/api/staff-portal") {
      if (body) {
        expect(body).toEqual({ action: "registration-approve", requestIds: [requestId], website: "", formToken: "staff-form" });
        approved = true;
        return json({ state: "updated", decided: { approved: options.badDecision ? 2 : 1, waitlisted: 0, skipped: 0 } });
      }
      staffReads++;
      if (options.finalQueueUnavailable && staffReads >= 6) return json({ state: "unavailable" }, 503);
      return json({ state: "authenticated", profile: { actorId: options.staffActor ?? staffId,
        roles: options.roles ?? ["registrationWorkshopAdministrator"] }, formToken: "staff-form",
      registration: { requests: [...(submitted && !approved ? [{ id: requestId, email: manifest().participants[0].email, status: "pending_approval" }] : []),
        ...(options.backlogAtFinish && staffReads >= 6 ? [{ id: "55555555-5555-4555-8555-555555555555", email: "synthetic-late@example.invalid", status: "pending_approval" }] : []),
        { id: "44444444-4444-4444-8444-444444444444", email: "someone-else@example.invalid", status: "pending_approval" }] } });
    }
    if (path === "/api/participant-accounts") {
      if (options.closed) return json({ state: "closed" }, 503);
      if (!body) { lastLoginToken = Date.now(); return json({ state: "ready", formToken: "login-form" }); }
      expect(Date.now() - lastLoginToken).toBeGreaterThanOrEqual(2000);
      expect(body).toEqual({ action: "signin", email: manifest().participants[0].email, password: "synthetic-password", website: "", formToken: "login-form" });
      return json({ state: "authenticated" }, 200, `__Host-msrc-participant=${cookie}; HttpOnly; Secure; Path=/`);
    }
    expect(headers.get("cookie")).toBe(`__Host-msrc-participant=${cookie}`);
    if (path === "/api/registration/me") return json({ state: "ready", registration: submitted ? { status: approved ? "approved" : "pending_approval" } : null });
    if (path === "/api/workflows/registration") {
      if (!body) { lastRegistrationToken = Date.now(); return json({ state: "ready", formToken: "registration-form", termsVersion: "1.0" }); }
      expect(Date.now() - lastRegistrationToken).toBeGreaterThanOrEqual(2000);
      expect(body).toEqual({ documentType: "passport", documentNumber: "SYN0001", termsAccepted: true,
        termsVersion: "1.0", formToken: "registration-form", website: "" });
      if (options.submitStatus) return json({ state: "limited" }, options.submitStatus);
      submitted = true;
      return json({ state: "submitted", request: { id: requestId, status: options.drift ? "approved" : "pending_approval" } });
    }
    throw new Error("Unexpected path");
  });
  return { fetcher, calls };
}
async function exercise(options: Parameters<typeof fixture>[0] = {}, environment: Record<string, string> = {}, input = manifest()) {
  vi.useFakeTimers(); vi.setSystemTime(start);
  const { fetcher, calls } = fixture(options);
  const work = runOpeningLoad({ env: { ...env(), ...environment }, fetch: fetcher as typeof fetch,
    read: async () => JSON.stringify(input), wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) });
  await vi.runAllTimersAsync();
  return { report: await work, calls, fetcher };
}

describe("real-contract synthetic load orchestration", () => {
  it("signs in, ages tokens, polls both sides, submits once and approves only manifest requests", async () => {
    const { report, calls } = await exercise();
    expect(report.outcome).toBe("PASS");
    expect(report.counters).toMatchObject({ loggedIn: 1, submitted: 1, approved: 1, journeyFailures: 0 });
    expect(calls.filter((call) => call.path === "/api/registration/me").length).toBeGreaterThan(1);
    expect(report.metrics.registration_submit.count).toBe(1);
    expect(report.metrics.public_page.count).toBe(2);
    const serialized = JSON.stringify(report);
    for (const secret of [cookie, "synthetic-password", "SYN0001", "registration-form", "login-form", "staff-form", "@example.invalid", participantId, staffId, requestId]) expect(serialized).not.toContain(secret);
  });
  it("refuses a production redirect without following or posting credentials", async () => {
    const { report, fetcher } = await exercise({ redirect: true });
    expect(report.outcome).toBe("BLOCKED"); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(report.failures).toEqual(["preflight_public: redirect-refused"]);
  });
  it.each([
    ["MSRC_LOAD_VERCEL_BYPASS_SECRET", "x-vercel-protection-bypass"],
    ["VERCEL_AUTOMATION_BYPASS_SECRET", "x-vercel-protection-bypass"],
    ["MSRC_LOAD_VERCEL_OIDC_TOKEN", "x-vercel-trusted-oidc-idp-token"],
  ])("scopes %s to the allowlisted origin and omits it from receipts", async (key, header) => {
    const secret = "private-staging-automation-value";
    const { report, fetcher } = await exercise({}, { [key]: secret });
    expect(report.outcome).toBe("PASS");
    for (const [url, init] of fetcher.mock.calls) {
      expect(new URL(String(url)).origin).toBe(origin);
      expect(new Headers(init?.headers).get(header)).toBe(secret);
      expect(String(url)).not.toContain(secret);
    }
    expect(JSON.stringify(report)).not.toContain(secret);
    const redirected = await exercise({ redirect: true }, { [key]: secret });
    expect(redirected.fetcher).toHaveBeenCalledTimes(1);
    expect(redirected.report.outcome).toBe("BLOCKED");
  });
  it("assigns global arrival indices and public views to disjoint shards", async () => {
    const input = manifest(), person = input.participants[0];
    input.participants = [
      { ...person, actorId: "55555555-5555-4555-8555-555555555555", email: "synthetic-zero@example.invalid", documentNumber: "SYN0000" },
      person,
      { ...person, actorId: "66666666-6666-4666-8666-666666666666", email: "synthetic-two@example.invalid", documentNumber: "SYN0002" },
    ];
    const { report, calls } = await exercise({}, { MSRC_LOAD_PARTICIPANTS: "3", MSRC_LOAD_SHARDS: "2", MSRC_LOAD_SHARD: "1",
      MSRC_LOAD_PUBLIC_VIEWS: "4", MSRC_LOAD_ROLE: "participants" }, input);
    expect(report.outcome).toBe("PASS");
    expect(report.shard).toEqual({ index: 1, total: 2, expectedSubmissions: 1 });
    expect(report.metrics.public_page.count).toBe(2);
    expect(report.counters.loggedIn).toBe(1); expect(report.counters.submitted).toBe(1);
    expect(calls.find((call) => call.path === "/api/workflows/registration")?.at).toBeGreaterThanOrEqual(start + 10000 + 10000 / 3 - 1);
  });
  it.each([{ staffActor: participantId }, { roles: ["superAdmin", "registrationWorkshopAdministrator"] }, { roles: ["finance"] }])("refuses an unseeded or inappropriate staff session %j", async (options) => {
    const { report, calls } = await exercise(options);
    expect(report.outcome).toBe("BLOCKED"); expect(calls.some((call) => call.body)).toBe(false);
  });
  it("stops on closed runtime gates during preflight", async () => {
    const { report, calls } = await exercise({ closed: true });
    expect(report.outcome).toBe("BLOCKED"); expect(calls.some((call) => call.body)).toBe(false);
  });
  it("reports rate limiting as a failed run and never retries submissions", async () => {
    const { report, calls } = await exercise({ submitStatus: 429 });
    expect(report.outcome).toBe("FAIL"); expect(report.counters.submitted).toBe(0);
    expect(report.metrics.registration_submit.http).toEqual({ "429": 1 });
    expect(calls.filter((call) => call.path === "/api/workflows/registration" && call.body)).toHaveLength(1);
  });
  it.each([{ badDecision: true }, { drift: true }])("fails response contract drift %j", async (options) => {
    const { report } = await exercise(options); expect(report.outcome).toBe("FAIL");
    expect(report.failures.join(",")).toContain("invalid-contract");
  });
  it("participant mode never sends staff credentials or approves", async () => {
    const { report, calls } = await exercise({}, { MSRC_LOAD_ROLE: "participants", MSRC_LOAD_STAFF_COOKIE: "" });
    expect(report.outcome).toBe("PASS"); expect(calls.some((call) => call.path === "/api/staff-portal")).toBe(false);
    expect(report.remainingPending).toBeNull();
  });
  it("fails staff-only success when a manifest request remains in the final bounded queue", async () => {
    const input = manifest();
    input.participants.push({ ...input.participants[0], actorId: "66666666-6666-4666-8666-666666666666",
      email: "synthetic-late@example.invalid", documentNumber: "SYN0002" });
    const { report, calls } = await exercise({ staffOnlySeeded: true, backlogAtFinish: true },
      { MSRC_LOAD_ROLE: "staff", MSRC_LOAD_PARTICIPANTS: "2" }, input);
    expect(report.counters.approved).toBe(1);
    expect(report.remainingPending).toBe(1);
    expect(report.outcome).toBe("FAIL");
    expect(report.failures).toContain("staff_queue_final: pending-manifest-requests-remain");
    expect(report.metrics.staff_queue_final.count).toBe(1);
    expect(calls.at(-1)).toMatchObject({ path: "/api/staff-portal", body: null });
  });
  it("fails a final queue read error instead of reporting an unverified zero backlog", async () => {
    const { report } = await exercise({ staffOnlySeeded: true, finalQueueUnavailable: true }, { MSRC_LOAD_ROLE: "staff" });
    expect(report.counters.approved).toBe(1);
    expect(report.remainingPending).toBeNull();
    expect(report.outcome).toBe("FAIL");
    expect(report.metrics.staff_queue_final).toMatchObject({ count: 1, failures: 1, http: { "503": 1 } });
  });
  it("ignores unrelated pending rows in the final queue after staff-only work succeeds", async () => {
    const { report } = await exercise({ staffOnlySeeded: true }, { MSRC_LOAD_ROLE: "staff" });
    expect(report.outcome).toBe("PASS"); expect(report.counters.approved).toBe(1);
    expect(report.remainingPending).toBe(0); expect(report.metrics.staff_queue_final.count).toBe(1);
  });
  it("summarizes percentiles and separates 429 from transport failure", () => {
    expect(summarizeSamples([{ label: "submit", milliseconds: 100, status: 200, state: "submitted", ok: true },
      { label: "submit", milliseconds: 500, status: 429, state: "limited", ok: false },
      { label: "submit", milliseconds: 1000, status: 0, state: "network-error", ok: false }])).toEqual({
      submit: { count: 3, failures: 2, p50Ms: 500, p95Ms: 1000, maxMs: 1000,
        http: { "200": 1, "429": 1, "0": 1 }, states: { limited: 1, "network-error": 1, submitted: 1 } },
    });
  });
});
