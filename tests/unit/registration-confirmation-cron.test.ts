import { afterEach, describe, expect, it, vi } from "vitest";
import { createOutboxDrainHandler } from "@/lib/jobs/outbox-route.server";
import { maintainRegistrationConfirmations } from "@/lib/jobs/registration-confirmation.server";

const config = { databaseUrl: "http://127.0.0.1:54321", databaseKey: "sb_secret_synthetic" };
const summary = { claimed: 0, sent: 0, retryable: 0, permanent: 0, stale: 0 };
const result = { state: "updated" as const, opened: 2, released: 1, kept: 0, offered: 1 };
const env = { OUTBOX_ENABLED: "true", CRON_SECRET: "x".repeat(64), OUTBOX_SENDER: "console",
  OUTBOX_SUPABASE_URL: config.databaseUrl, OUTBOX_SUPABASE_SECRET_KEY: config.databaseKey,
  OUTBOX_DAILY_CAP: "10", REGISTRATION_ENABLED: "true", PARTICIPANT_ACCOUNTS_ENABLED: "true",
  PARTICIPANT_EDITION_KEY: "synthetic-confirmation" };
const request = () => new Request("http://localhost/api/jobs/outbox/drain", { headers: { authorization: "Bearer " + env.CRON_SECRET } });
afterEach(() => vi.unstubAllGlobals());

describe("confirmation maintenance through the existing authenticated drain", () => {
  it("runs maintenance before claiming mail and returns aggregate evidence only", async () => {
    const calls: string[] = [];
    const handler = createOutboxDrainHandler({ env,
      maintainConfirmations: async (_config, edition) => { expect(edition).toBe(env.PARTICIPANT_EDITION_KEY); calls.push("maintain"); return result; },
      run: async () => { calls.push("drain"); return summary; } });
    const response = await handler(request());
    expect(response.status).toBe(200); expect(calls).toEqual(["maintain", "drain"]);
    expect(await response.json()).toEqual({ ...summary, confirmation: result });
  });
  it.each([{ OUTBOX_ENABLED: "false" }, { CRON_SECRET: "different" }, { OUTBOX_DAILY_CAP: "0" },
    { REGISTRATION_ENABLED: "false" }, { PARTICIPANT_ACCOUNTS_ENABLED: "false" },
  ])("does no confirmation work through a closed gate %j", async (change) => {
    const maintainConfirmations = vi.fn();
    await createOutboxDrainHandler({ env: { ...env, ...change }, maintainConfirmations, run: async () => summary })(request());
    expect(maintainConfirmations).not.toHaveBeenCalled();
  });
  it("retains existing delivery with explicit not-ready when the new RPC is missing", async () => {
    const run = vi.fn().mockResolvedValue(summary);
    const response = await createOutboxDrainHandler({ env, run,
      maintainConfirmations: async () => ({ state: "area-not-ready" }) })(request());
    expect(response.status).toBe(200); expect(run).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ ...summary, confirmation: { state: "area-not-ready" } });
  });
  it("does not claim email after a maintenance transport failure", async () => {
    const run = vi.fn();
    const response = await createOutboxDrainHandler({ env, run,
      maintainConfirmations: async () => { throw new Error("private diagnostic"); } })(request());
    expect(response.status).toBe(503); expect(await response.text()).toBe(""); expect(run).not.toHaveBeenCalled();
  });
});

describe("server-only maintenance RPC", () => {
  it("sends only server edition context and accepts exact aggregate results", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(result)); vi.stubGlobal("fetch", fetcher);
    expect(await maintainRegistrationConfirmations(config, "synthetic-confirmation")).toEqual(result);
    expect(fetcher.mock.calls[0][0]).toBe(config.databaseUrl + "/rest/v1/rpc/msrc_registration_confirmation_maintenance");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ edition_key: "synthetic-confirmation" });
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: "error", cache: "no-store" });
  });
  it.each(["PGRST202", "42883"])("handles absent migration %s", async (code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code, message: "private" }, { status: 404 })));
    expect(await maintainRegistrationConfirmations(config, "synthetic-confirmation")).toEqual({ state: "area-not-ready" });
  });
  it.each([null, {}, { state: "closed", secret: "private" }, { ...result, released: -1 }, { ...result, opened: 1.5 },
    { ...result, participant: "private" }])("rejects malformed or overbroad projections %j", async (value) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(value)));
    await expect(maintainRegistrationConfirmations(config, "synthetic-confirmation")).rejects.toThrow("Confirmation maintenance unavailable.");
  });
  it("never substitutes an edition when configuration is unset", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(maintainRegistrationConfirmations(config, "")).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
  });
});
