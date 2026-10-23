import { afterEach, describe, expect, it, vi } from "vitest";
import { maintainAnnouncements } from "@/lib/jobs/announcements.server";
import { createOutboxDrainHandler } from "@/lib/jobs/outbox-route.server";

const config = { databaseUrl: "http://127.0.0.1:54321", databaseKey: "sb_secret_synthetic" };
const secret = "synthetic_cron_" + "a".repeat(40);
const env = { OUTBOX_ENABLED: "true", OUTBOX_SUPABASE_URL: config.databaseUrl, OUTBOX_SUPABASE_SECRET_KEY: config.databaseKey,
  OUTBOX_DAILY_CAP: "10", CRON_SECRET: secret, PARTICIPANT_ACCOUNTS_ENABLED: "true", STAFF_EDITION_KEY: "synthetic-2027" };
const summary = { claimed: 0, sent: 0, retryable: 0, permanent: 0, stale: 0 };
const request = () => new Request("http://localhost/api/jobs/outbox/drain", { headers: { authorization: "Bearer " + secret } });
afterEach(() => vi.unstubAllGlobals());

describe("scheduled announcement maintenance on the existing outbox drain", () => {
  it.each([{ state: "closed" }, { state: "updated", started: 2, needsReview: 1 }])("decodes safe counts only %j", async (result) => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(result));
    vi.stubGlobal("fetch", fetcher);
    expect(await maintainAnnouncements(config, "synthetic-2027")).toEqual(result);
    expect(fetcher).toHaveBeenCalledWith(config.databaseUrl + "/rest/v1/rpc/msrc_announcements_maintenance",
      expect.objectContaining({ method: "POST", cache: "no-store", redirect: "error", body: JSON.stringify({ edition_key: "synthetic-2027" }) }));
  });

  it.each(["PGRST202", "42883"])("degrades missing pending function %s to area-not-ready", async (code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code, message: "private diagnostic" }, { status: 404 })));
    expect(await maintainAnnouncements(config, "synthetic-2027")).toEqual({ state: "area-not-ready" });
  });

  it.each([{}, { state: "updated", started: -1, needsReview: 0 }, { state: "updated", started: 1, needsReview: 0, email: "private" },
    { state: "closed", recipients: [] }, { state: "updated", started: 0.5, needsReview: 0 }])("rejects malformed storage metadata %#", async (result) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(result)));
    await expect(maintainAnnouncements(config, "synthetic-2027")).rejects.toThrow("Announcement maintenance unavailable.");
  });

  it("sanitizes database failures and refuses malformed edition keys without fetching", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("private transport"));
    vi.stubGlobal("fetch", fetcher);
    await expect(maintainAnnouncements(config, "synthetic-2027")).rejects.toThrow("Announcement maintenance unavailable.");
    fetcher.mockClear();
    await expect(maintainAnnouncements(config, "bad edition")).rejects.toThrow("Announcement maintenance unavailable.");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    { OUTBOX_ENABLED: "false" }, { OUTBOX_DAILY_CAP: "0" }, { PARTICIPANT_ACCOUNTS_ENABLED: "false" },
  ])("runs no announcement maintenance while a runtime gate is closed %j", async (change) => {
    const maintain = vi.fn().mockResolvedValue({ state: "updated", started: 1, needsReview: 0 });
    const run = vi.fn().mockResolvedValue(summary);
    await createOutboxDrainHandler({ env: { ...env, ...change }, run, maintainAnnouncements: maintain })(request());
    expect(maintain).not.toHaveBeenCalled();
  });

  it("authenticates before maintenance and drains after maintenance, without a new scheduler", async () => {
    const maintain = vi.fn().mockResolvedValue({ state: "updated", started: 1, needsReview: 0 });
    const run = vi.fn().mockResolvedValue(summary);
    const handler = createOutboxDrainHandler({ env, run, maintainAnnouncements: maintain });
    expect((await handler(new Request(request().url))).status).toBe(401);
    expect(maintain).not.toHaveBeenCalled();
    const result = await handler(request());
    expect(await result.json()).toEqual({ ...summary, announcements: { state: "updated", started: 1, needsReview: 0 } });
    expect(maintain).toHaveBeenCalledWith(expect.objectContaining(config), "synthetic-2027");
    expect(maintain.mock.invocationCallOrder[0]).toBeLessThan(run.mock.invocationCallOrder[0]);
  });

  it("continues draining when the pending function is absent", async () => {
    const run = vi.fn().mockResolvedValue(summary);
    const result = await createOutboxDrainHandler({ env, run,
      maintainAnnouncements: vi.fn().mockResolvedValue({ state: "area-not-ready" }) })(request());
    expect(result.status).toBe(200);
    expect(run).toHaveBeenCalledOnce();
  });
});
