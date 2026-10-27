import { afterEach, describe, expect, it, vi } from "vitest";
import { maintainParticipantProfiles } from "@/lib/jobs/participant-profile.server";

const config = { databaseUrl: "http://127.0.0.1:54321", databaseKey: "sb_secret_synthetic_profile_cleanup" };
const object = "dc000000-0000-4000-8000-000000000001.webp";
afterEach(() => vi.unstubAllGlobals());

describe("durable participant profile cleanup (ENG-086 / AUTH-08 / PRV-05/06)", () => {
  it("deletes actual Storage bytes before acknowledging a bounded deletion batch", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/msrc_participant_profile_cleanup")) return Response.json({ state: "ready", erased: 2, objects: [object] });
      if (url.endsWith("/storage/v1/object/participant-avatars")) return Response.json([{ name: object, bucket_id: "participant-avatars" }]);
      if (url.endsWith("/msrc_participant_profile_avatar_deleted_many")) return Response.json({ state: "ready" });
      throw new Error("Unexpected cleanup request " + init?.method);
    });
    vi.stubGlobal("fetch", fetcher);
    expect(await maintainParticipantProfiles(config)).toEqual({ state: "updated", erased: 2, removed: 1, pending: 0 });
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      config.databaseUrl + "/rest/v1/rpc/msrc_participant_profile_cleanup",
      config.databaseUrl + "/storage/v1/object/participant-avatars",
      config.databaseUrl + "/rest/v1/rpc/msrc_participant_profile_avatar_deleted_many",
    ]);
    const [, remove] = fetcher.mock.calls[1];
    expect(remove).toMatchObject({ method: "DELETE", redirect: "error", cache: "no-store" });
    expect(JSON.parse(String(remove?.body))).toEqual({ prefixes: [object] });
    expect(JSON.parse(String(fetcher.mock.calls[2][1]?.body))).toEqual({ object_names: [object] });
    for (const [, init] of fetcher.mock.calls) {
      const headers = new Headers(init?.headers); expect(headers.get("apikey")).toBe(config.databaseKey); expect(headers.get("authorization")).toBeNull();
    }
  });
  it("leaves deletion pending without acknowledging when Storage fails", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/msrc_participant_profile_cleanup")
      ? Response.json({ state: "ready", erased: 1, objects: [object] })
      : Response.json({ statusCode: "500", error: "Storage unavailable", message: "Synthetic failure" }, { status: 500 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await maintainParticipantProfiles(config)).toEqual({ state: "updated", erased: 1, removed: 0, pending: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.some(([url]) => String(url).includes("avatar_deleted"))).toBe(false);
  });
  it("does not create a Storage request or acknowledgement for an empty batch", async () => {
    const fetcher = vi.fn(async () => Response.json({ state: "ready", erased: 0, objects: [] })); vi.stubGlobal("fetch", fetcher);
    expect(await maintainParticipantProfiles(config)).toEqual({ state: "updated", erased: 0, removed: 0, pending: 0 }); expect(fetcher).toHaveBeenCalledOnce();
  });
  it("treats an absent migration as area-not-ready without Storage access", async () => {
    const fetcher = vi.fn(async () => Response.json({ code: "PGRST202", details: "private diagnostic" }, { status: 404 })); vi.stubGlobal("fetch", fetcher);
    expect(await maintainParticipantProfiles(config)).toEqual({ state: "area-not-ready" }); expect(fetcher).toHaveBeenCalledOnce();
  });
  it("does not treat permission errors as a missing migration", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "42501", details: "private diagnostic" }, { status: 403 })));
    await expect(maintainParticipantProfiles(config)).rejects.toThrow("Profile maintenance unavailable");
  });
  it.each([{ state: "ready", erased: -1, objects: [] }, { state: "ready", erased: 1.5, objects: [] },
    { state: "ready", erased: 0, objects: ["../other.webp"] }, { state: "ready", erased: 0, objects: Array(11).fill(object) },
    { state: "ready", erased: 0, objects: null }, { state: "denied", erased: 0, objects: [] }])("rejects malformed cleanup metadata %# before deleting files", async (result) => {
    const fetcher = vi.fn(async () => Response.json(result)); vi.stubGlobal("fetch", fetcher);
    await expect(maintainParticipantProfiles(config)).rejects.toThrow("Profile maintenance unavailable"); expect(fetcher).toHaveBeenCalledOnce();
  });
  it("fails visibly when deletion acknowledgement is unavailable, retaining durable work for retry", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/msrc_participant_profile_cleanup")) return Response.json({ state: "ready", erased: 0, objects: [object] });
      if (url.includes("/storage/")) return Response.json([{ name: object }]);
      return Response.json({ code: "PGRST202" }, { status: 404 });
    });
    vi.stubGlobal("fetch", fetcher); await expect(maintainParticipantProfiles(config)).rejects.toThrow("Profile maintenance unavailable"); expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
