import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadStaffParticipantAvatar } from "@/features/staff-portal/participant-avatar.server";
import type { StaffConfig } from "@/features/staff-portal/config.server";

const object = "dc000000-0000-4000-8000-000000000001.webp";
const config = { supabaseUrl: "http://127.0.0.1:3220", secretKey: "sb_secret_staff_mock_only" } as StaffConfig;
afterEach(() => vi.unstubAllGlobals());
describe("staff avatar signed Storage transport", () => {
  it("signs for 60 seconds after authorization and fetches private bytes without exposing a token", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => init?.method === "POST"
      ? Response.json({ signedURL: `/object/sign/participant-avatars/${object}?token=synthetic-private-token` })
      : new Response(new Uint8Array([1, 2]), { headers: { "Content-Type": "image/webp" } }));
    vi.stubGlobal("fetch", fetcher);
    const blob = await downloadStaffParticipantAvatar(config, object);
    expect(blob?.type).toBe("image/webp"); expect(blob?.size).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [signUrl, signInit] = fetcher.mock.calls[0];
    expect(String(signUrl)).toBe(config.supabaseUrl + "/storage/v1/object/sign/participant-avatars/" + object);
    expect(JSON.parse(String(signInit?.body))).toEqual({ expiresIn: 60 });
    expect(new Headers(signInit?.headers).get("apikey")).toBe(config.secretKey);
    for (const [, init] of fetcher.mock.calls) {
      expect(init).toMatchObject({ cache: "no-store", redirect: "error" });
      expect(new Headers(init?.headers).get("authorization")).toBeNull();
    }
  });
  it("refuses an unregistered path before contacting Storage", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await downloadStaffParticipantAvatar(config, "../other.webp")).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not return a failed or non-image signed download", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => init?.method === "POST"
      ? Response.json({ signedURL: `/object/sign/participant-avatars/${object}?token=synthetic-private-token` })
      : new Response("not an image", { headers: { "Content-Type": "text/plain" } }));
    vi.stubGlobal("fetch", fetcher);
    expect(await downloadStaffParticipantAvatar(config, object)).toBeNull();
  });
});
