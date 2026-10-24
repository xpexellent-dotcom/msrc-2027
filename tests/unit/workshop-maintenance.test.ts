import { afterEach, describe, expect, it, vi } from "vitest";
import { maintainWorkshops } from "@/lib/jobs/workshops.server";
import { createOutboxDrainHandler } from "@/lib/jobs/outbox-route.server";

const config = { databaseUrl: "http://127.0.0.1:54321", databaseKey: "sb_secret_synthetic" };
const secret = "synthetic_cron_" + "a".repeat(40);
const env = { OUTBOX_ENABLED: "true", OUTBOX_SUPABASE_URL: config.databaseUrl, OUTBOX_SUPABASE_SECRET_KEY: config.databaseKey,
  OUTBOX_DAILY_CAP: "0", CRON_SECRET: secret, PARTICIPANT_ACCOUNTS_ENABLED: "true", WORKSHOP_BOOKING_ENABLED: "true", PARTICIPANT_EDITION_KEY: "synthetic-2027" };
const summary = { claimed: 0, sent: 0, retryable: 0, permanent: 0, stale: 0 };
const request = () => new Request("http://localhost/api/jobs/outbox/drain", { headers: { authorization: "Bearer " + secret } });
afterEach(() => vi.unstubAllGlobals());

describe("workshop expiry through the existing authenticated maintenance path", () => {
  it.each([{ state: "closed" }, { state: "updated", expired: 2, offered: 1, released: 1 }])("decodes counts only %j", async (result) => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(result)); vi.stubGlobal("fetch", fetcher);
    expect(await maintainWorkshops(config, "synthetic-2027")).toEqual(result);
    expect(fetcher).toHaveBeenCalledWith(config.databaseUrl + "/rest/v1/rpc/msrc_workshop_maintenance", expect.objectContaining({
      method: "POST", cache: "no-store", redirect: "error", body: JSON.stringify({ edition_key: "synthetic-2027" }),
    }));
  });
  it.each(["PGRST202", "42883"])("degrades missing migration %s", async (code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code, message: "private" }, { status: 404 })));
    expect(await maintainWorkshops(config, "synthetic-2027")).toEqual({ state: "area-not-ready" });
  });
  it.each([{}, [], { state: "closed", email: "private" }, { state: "updated", expired: -1, offered: 1, released: 0 },
    { state: "updated", expired: 1, offered: 0.5, released: 0 }, { state: "updated", expired: 1, offered: 0, released: 0, bookings: [] }])("rejects malformed metadata %#", async (value) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(value)));
    await expect(maintainWorkshops(config, "synthetic-2027")).rejects.toThrow("Workshop maintenance unavailable.");
  });
  it("rejects invalid editions and sanitizes transport errors", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("private")); vi.stubGlobal("fetch", fetcher);
    await expect(maintainWorkshops(config, "invalid edition")).rejects.toThrow("Workshop maintenance unavailable.");
    expect(fetcher).not.toHaveBeenCalled();
    await expect(maintainWorkshops(config, "synthetic-2027")).rejects.toThrow("Workshop maintenance unavailable.");
  });
  it.each([{ WORKSHOP_BOOKING_ENABLED: "false" }, { PARTICIPANT_ACCOUNTS_ENABLED: "false" }, { OUTBOX_ENABLED: "false" }])("respects runtime gates %j", async (change) => {
    const maintain = vi.fn();
    await createOutboxDrainHandler({ env: { ...env, ...change }, run: vi.fn().mockResolvedValue(summary), maintainWorkshops: maintain })(request());
    expect(maintain).not.toHaveBeenCalled();
  });
  it("authenticates before expiry and expires even while email's daily cap is zero", async () => {
    const maintain = vi.fn().mockResolvedValue({ state: "updated", expired: 1, offered: 1, released: 1 });
    const run = vi.fn().mockResolvedValue(summary);
    const handler = createOutboxDrainHandler({ env, run, maintainWorkshops: maintain });
    expect((await handler(new Request(request().url))).status).toBe(401); expect(maintain).not.toHaveBeenCalled();
    expect(await (await handler(request())).json()).toEqual({ ...summary, workshops: { state: "updated", expired: 1, offered: 1, released: 1 } });
    expect(maintain).toHaveBeenCalledWith(expect.objectContaining(config), "synthetic-2027");
    expect(maintain.mock.invocationCallOrder[0]).toBeLessThan(run.mock.invocationCallOrder[0]);
  });
  it("missing workshop migration keeps the outbox drain available", async () => {
    const run = vi.fn().mockResolvedValue(summary);
    const response = await createOutboxDrainHandler({ env, run, maintainWorkshops: vi.fn().mockResolvedValue({ state: "area-not-ready" }) })(request());
    expect(response.status).toBe(200); expect(run).toHaveBeenCalledOnce();
  });
});
