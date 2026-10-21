import { afterEach, describe, expect, it, vi } from "vitest";
import { createHealthHandler, createOutboxHealthHandler } from "@/lib/monitoring/health.server";
import { GET as healthGET } from "@/app/api/health/route";
import { GET as outboxGET } from "@/app/api/jobs/outbox/health/route";

const url = "https://abcdefghijklmnopqrst.supabase.co";
const key = "sb_secret_synthetic_monitor";
const secret = "synthetic-monitor-secret-" + "a".repeat(32);
const env = { HEALTH_SUPABASE_URL: url, HEALTH_SUPABASE_SECRET_KEY: key,
  OUTBOX_SUPABASE_URL: url, OUTBOX_SUPABASE_SECRET_KEY: key, OUTBOX_MONITOR_SECRET: secret };
const snapshot = { counts: { queued: 3, sending: 2, sent: 6, failed_retryable: 1, failed_permanent: 0, cancelled: 1 }, oldestPendingAgeSeconds: 80 };
function request(authorization: string | null = "Bearer " + secret) {
  return new Request("https://staging.example.invalid/api/jobs/outbox/health", {
    headers: authorization === null ? {} : { authorization },
  });
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("database reachability health", () => {
  it.each([{}, { HEALTH_SUPABASE_URL: "", HEALTH_SUPABASE_SECRET_KEY: "" },
    { ...env, HEALTH_SUPABASE_URL: undefined, HEALTH_SUPABASE_SECRET_KEY: undefined },
  ])("reports runtime uptime without making a database claim when both settings are absent %j", async (environment) => {
    const fetcher = vi.fn();
    const response = await createHealthHandler({ env: environment, fetcher })();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", scope: "runtime-health", database: "not-configured" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("executes a fixed no-data database ping with a bounded timeout and server-only key", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(true));
    const result = await createHealthHandler({ env, fetcher })();
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ status: "ok", scope: "runtime-health", database: "reachable" });
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetcher.mock.calls[0];
    expect(endpoint).toBe(url + "/rest/v1/rpc/msrc_health_check");
    expect(init).toMatchObject({ method: "POST", cache: "no-store", redirect: "error", body: "{}" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init?.headers).get("apikey")).toBe(key);
    expect(new Headers(init?.headers).has("authorization")).toBe(false);
  });

  it.each([
    { ...env, HEALTH_SUPABASE_URL: undefined }, { ...env, HEALTH_SUPABASE_SECRET_KEY: undefined },
    { ...env, HEALTH_SUPABASE_URL: "" }, { ...env, HEALTH_SUPABASE_SECRET_KEY: "" },
    { HEALTH_SUPABASE_URL: " ", HEALTH_SUPABASE_SECRET_KEY: " " },
    { ...env, HEALTH_SUPABASE_SECRET_KEY: "sb_publishable_not_a_server_key" },
    ...["https://example.invalid", url + "/path", url + "?secret=x", url + "#x", url + "/", "https://user:pass@abcdefghijklmnopqrst.supabase.co",
      "https://abcdefghijklmnopqrst.supabase.co.evil.invalid", "http://127.0.0.1:54321"].map((endpoint) => ({ ...env, VERCEL: "1", HEALTH_SUPABASE_URL: endpoint })),
  ])("refuses partial or invalid connection configuration before network access %j", async (environment) => {
    const fetcher = vi.fn();
    const response = await createHealthHandler({ env: environment, fetcher })();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable", scope: "runtime-health", database: "unavailable" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("permits an explicit local synthetic database outside Vercel", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(true));
    const response = await createHealthHandler({ env: { ...env, HEALTH_SUPABASE_URL: "http://127.0.0.1:54321" }, fetcher })();
    expect(response.status).toBe(200);
  });

  it.each([false, null, {}, [], "true", { reachable: true, secret: "private" }])("never treats an unexpected RPC response as reachable %j", async (value) => {
    const response = await createHealthHandler({ env, fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(value)) })();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable", scope: "runtime-health", database: "unavailable" });
  });

  it("reports a missing health RPC as not-ready with no database diagnostic or session changes", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "PGRST202", details: "private database detail" }, { status: 404 }));
    const response = await createHealthHandler({ env, fetcher })();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable", scope: "runtime-health", database: "not-ready" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 429, 500, 503])("sanitizes HTTP %s without treating other statuses as a missing RPC", async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "PGRST202", details: "private database detail" }, { status }));
    const response = await createHealthHandler({ env, fetcher })();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable", scope: "runtime-health", database: "unavailable" });
  });

  it.each([{ code: "PGRST205" }, { message: "PGRST202" }, null])("does not classify other 404 payloads as a missing health RPC %j", async (value) => {
    const response = await createHealthHandler({ env, fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(value, { status: 404 })) })();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable", scope: "runtime-health", database: "unavailable" });
  });

  it.each([new DOMException("private timeout", "TimeoutError"), new TypeError("private transport")])("contains transport and timeout failures", async (failure) => {
    const response = await createHealthHandler({ env, fetcher: vi.fn<typeof fetch>().mockRejectedValue(failure) })();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable", scope: "runtime-health", database: "unavailable" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns unavailable for malformed JSON", async () => {
    const response = await createHealthHandler({ env, fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response("private malformed")) })();
    expect(response.status).toBe(503);
  });

  it("wires the real route without exposing or claiming workflow flags", async () => {
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
    vi.stubEnv("REGISTRATION_ENABLED", "true");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json(true)));
    expect(await (await healthGET()).json()).toEqual({ status: "ok", scope: "runtime-health", database: "reachable" });
  });

  it.each(["not-configured", "not-ready", "unavailable"] as const)("wires the real route's %s state", async (database) => {
    vi.stubEnv("HEALTH_SUPABASE_URL", database === "not-configured" ? "" : url);
    vi.stubEnv("HEALTH_SUPABASE_SECRET_KEY", database === "not-configured" ? "" : key);
    const fetcher = vi.fn<typeof fetch>();
    if (database === "not-ready") fetcher.mockResolvedValue(Response.json({ code: "PGRST202" }, { status: 404 }));
    else fetcher.mockRejectedValue(new TypeError("private database unreachable"));
    vi.stubGlobal("fetch", fetcher);
    const response = await healthGET();
    expect(response.status).toBe(database === "not-configured" ? 200 : 503);
    expect(await response.json()).toEqual({ status: database === "not-configured" ? "ok" : "unavailable", scope: "runtime-health", database });
    expect(fetcher).toHaveBeenCalledTimes(database === "not-configured" ? 0 : 1);
  });
});

describe("private read-only outbox monitoring", () => {
  it("is unavailable without a separate monitor secret, before database access", async () => {
    const fetcher = vi.fn();
    const response = await createOutboxHealthHandler({ env: { ...env, OUTBOX_MONITOR_SECRET: undefined }, fetcher })(request());
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([null, "", "Bearer wrong", "bearer " + secret, "Bearer " + secret + "x", secret])("denies missing or incorrect authorization %s", async (authorization) => {
    const fetcher = vi.fn();
    const response = await createOutboxHealthHandler({ env, fetcher })(request(authorization));
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["short", "a".repeat(257), "!".repeat(40)])("denies malformed configured monitor secrets even if the header matches", async (invalid) => {
    const fetcher = vi.fn();
    const response = await createOutboxHealthHandler({ env: { ...env, OUTBOX_MONITOR_SECRET: invalid }, fetcher })(request("Bearer " + invalid));
    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not accept a secret in the query string or the cron drain credential", async () => {
    const fetcher = vi.fn();
    const handler = createOutboxHealthHandler({ env: { ...env, CRON_SECRET: "other-secret-" + "b".repeat(32) }, fetcher });
    expect((await handler(new Request("https://staging.example.invalid/api/jobs/outbox/health?secret=" + secret))).status).toBe(401);
    expect((await handler(request("Bearer other-secret-" + "b".repeat(32)))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports only counts and pending age while every delivery switch is off", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ...snapshot, recipient: "private@example.invalid",
      counts: { ...snapshot.counts, recipient: "private@example.invalid" } }));
    const response = await createOutboxHealthHandler({ env: { ...env, OUTBOX_ENABLED: "false", OUTBOX_RESEND_ENABLED: "false" }, fetcher })(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", ...snapshot });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(url + "/rest/v1/rpc/msrc_outbox_monitor");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ body: "{}", redirect: "error", cache: "no-store" });
  });

  it.each([{}, { OUTBOX_SUPABASE_URL: url }, { OUTBOX_SUPABASE_SECRET_KEY: key },
    { OUTBOX_SUPABASE_URL: "http://example.invalid", OUTBOX_SUPABASE_SECRET_KEY: key }])("rejects invalid outbox database config without fetching %j", async (settings) => {
    const fetcher = vi.fn();
    const response = await createOutboxHealthHandler({ env: { ...settings, OUTBOX_MONITOR_SECRET: secret }, fetcher })(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([null, [], {}, { ...snapshot, counts: {} }, { ...snapshot, counts: { ...snapshot.counts, sent: -1 } },
    { ...snapshot, counts: { ...snapshot.counts, queued: "3" } }, { ...snapshot, counts: { ...snapshot.counts, queued: Number.MAX_SAFE_INTEGER + 1 } },
    { ...snapshot, oldestPendingAgeSeconds: -1 }, { ...snapshot, oldestPendingAgeSeconds: 1.5 },
  ])("rejects malformed aggregates without leaking their contents %j", async (value) => {
    const response = await createOutboxHealthHandler({ env, fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(value)) })(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("reports a missing RPC as area-not-ready, never signing anyone out", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "PGRST202", details: "private schema cache diagnostic" }, { status: 404 }));
    const response = await createOutboxHealthHandler({ env, fetcher })(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "area-not-ready" });
    expect(response.headers.has("set-cookie")).toBe(false);
  });

  it.each([401, 403, 404, 429, 500])("sanitizes database HTTP %s rather than misreporting an empty queue", async (status) => {
    const response = await createOutboxHealthHandler({ env, fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response("private diagnostic", { status })) })(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("contains network timeouts", async () => {
    const response = await createOutboxHealthHandler({ env, fetcher: vi.fn<typeof fetch>().mockRejectedValue(new DOMException("private", "TimeoutError")) })(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("allows concurrent snapshot reads without selecting drain or other mutable RPCs", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(snapshot));
    const handler = createOutboxHealthHandler({ env, fetcher });
    const results = await Promise.all(Array.from({ length: 8 }, () => handler(request())));
    expect(results.every((result) => result.status === 200)).toBe(true);
    expect(fetcher.mock.calls.every(([endpoint]) => endpoint === url + "/rest/v1/rpc/msrc_outbox_monitor")).toBe(true);
  });

  it("wires the protected actual route to counts-only monitoring", async () => {
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json(snapshot)));
    expect(await (await outboxGET(request())).json()).toEqual({ status: "ok", ...snapshot });
  });
});
