import { describe, expect, it, vi } from "vitest";
import { decodePublicHackathonTracks, fetchPublicHackathonTracks } from "@/features/competitions/public-tracks.server";

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
const config = { origin: "https://synthetic.supabase.co", edition: "synthetic-2027", secret: "sb_secret_synthetic" };
const track = { label: { en: "Evidence to Impact", ar: "من الدليل إلى الأثر" }, description: { en: "Synthetic public scope", ar: "نطاق تجريبي" } };
const tracks = { translating_research: track, advancing_research: { ...track, label: { en: "Research Reimagined", ar: "البحث برؤية جديدة" } } };

describe("public hackathon track settings boundary", () => {
  it("accepts only bilingual public labels and descriptions", () => {
    expect(decodePublicHackathonTracks(tracks)).toEqual(tracks);
    expect(decodePublicHackathonTracks({ ...tracks, whatsappSupportUrl: "https://chat.whatsapp.com/private" })).toBeNull();
    expect(decodePublicHackathonTracks({ ...tracks, translating_research: { ...track, phone: "+966500000000" } })).toBeNull();
    expect(decodePublicHackathonTracks({ ...tracks, translating_research: { ...track, label: { en: "Only English" } } })).toBeNull();
    expect(decodePublicHackathonTracks({ ...tracks, translating_research: { ...track, label: { en: "", ar: "عربي" } } })).toBeNull();
  });
  it.each([404, 503])("keeps built-in copy when the RPC is unavailable (%i)", async (status) => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status }));
    expect(await fetchPublicHackathonTracks(config, request)).toBeNull();
  });
  it("rejects network failure and private data in the RPC result", async () => {
    expect(await fetchPublicHackathonTracks(config, vi.fn<typeof fetch>().mockRejectedValue(new Error("unavailable")))).toBeNull();
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ...tracks, profile: { phone: "private" } }));
    expect(await fetchPublicHackathonTracks(config, request)).toBeNull();
  });
  it("fetches through the server configuration with no browser credentials or redirects", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(tracks));
    expect(await fetchPublicHackathonTracks(config, request)).toEqual(tracks);
    expect(request).toHaveBeenCalledWith(`${config.origin}/rest/v1/rpc/msrc_competitions_public_tracks`, expect.objectContaining({
      method: "POST", redirect: "error", cache: "no-store", body: JSON.stringify({ edition_key: config.edition }),
      headers: { apikey: config.secret, "Content-Type": "application/json" },
    }));
  });
});
