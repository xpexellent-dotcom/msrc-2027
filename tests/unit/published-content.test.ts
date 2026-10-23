import { beforeEach, describe, expect, it, vi } from "vitest";
import { decodePublishedContent, publishedOrFallback } from "@/features/content/published";
import { contentSession, contentSpeaker } from "@/features/content/catalogue";
import { fetchPublishedCollection, getPublishedContent, resolvePublicContentConfig } from "@/features/content/published.server";
import { revalidatePublishedContent } from "@/features/content/revalidate.server";

const next = vi.hoisted(() => ({ tag: vi.fn(), path: vi.fn(), connection: vi.fn(), cache: vi.fn((fn: () => unknown) => fn) }));
vi.mock("next/cache", () => ({ unstable_cache: next.cache, revalidateTag: next.tag, revalidatePath: next.path }));
vi.mock("next/server", () => ({ connection: next.connection }));
const id = "10000000-0000-4000-8000-000000000001";
const origin = "https://ecemjggwlzqpjcwmchrl.supabase.co";
const fields = { nameEn: "Synthetic Speaker", nameAr: "متحدث تجريبي", titleEn: "Synthetic title", titleAr: "صفة تجريبية", bioEn: "Synthetic biography", bioAr: "سيرة تجريبية", sortOrder: 2, links: ["https://example.org/profile"] };
const row = { id, collection: "speakers", version: 2, fields, media: null };
const config = { origin, edition: "synthetic-content-published", secret: "sb_secret_synthetic" };

describe("published collection fallback and strict public boundary", () => {
  it("keeps the exact static collection when no item is published", async () => {
    const fallback = ["approved static"];
    expect(await publishedOrFallback(async () => [], fallback)).toBe(fallback);
    expect(await publishedOrFallback(async () => null, fallback)).toBe(fallback);
  });
  it("keeps static content when the database is unreachable", async () => {
    const fallback = ["approved static"];
    expect(await publishedOrFallback(async () => { throw new Error("down"); }, fallback)).toBe(fallback);
  });
  it("replaces the entire static collection once published content exists", async () => {
    const approved = ["organizer content"];
    expect(await publishedOrFallback(async () => approved, ["old static"])).toBe(approved);
  });
  it("accepts the minimal published speaker projection and strips extra/private fields", () => {
    const decoded = decodePublishedContent({ items: [{ ...row, draft: "private draft", fields: { ...fields, rightsEvidence: "private", assetId: id, permissionToDisplay: true } }] }, "speakers", origin);
    expect(decoded).toHaveLength(1);
    expect(JSON.stringify(decoded)).not.toMatch(/draft|rightsEvidence|assetId|permissionToDisplay/);
  });
  it("honors published ordering and never mutates the RPC response", () => {
    const first = { ...row, id: "10000000-0000-4000-8000-000000000002", fields: { ...fields, sortOrder: 1 } };
    const body = { items: [row, first] }; const before = JSON.stringify(body);
    expect(decodePublishedContent(body, "speakers", origin)?.map((item) => item.id)).toEqual([first.id, id]);
    expect(JSON.stringify(body)).toBe(before);
  });
  it.each(["javascript:alert(1)", "data:text/html,test", "http://example.org", "https://person:secret@example.org"])("rejects unsafe public link %s", (url) => {
    expect(decodePublishedContent({ items: [{ ...row, fields: { ...fields, links: [url] } }] }, "speakers", origin)).toBeNull();
  });
  it.each([{}, { items: [{}] }, { items: [row, row] }, { items: [{ ...row, collection: "team" }] }, { items: [{ ...row, version: 0 }] }, { items: [{ ...row, fields: { ...fields, nameAr: "" } }] }])("rejects malformed collections without leaking partial content", (value) => {
    expect(decodePublishedContent(value, "speakers", origin)).toBeNull();
  });
  it("accepts published partners without exposing the internal display-permission evidence", () => {
    expect(decodePublishedContent({ items: [{ ...row, collection: "partners", fields: { nameEn: "Synthetic partner", nameAr: "شريك تجريبي", tier: "gold", url: "https://example.org", sortOrder: 0 } }] }, "partners", origin)).toHaveLength(1);
  });
  it("builds only public bucket URLs from constrained paths and preserves focal percentages", () => {
    const media = { path: "synthetic/asset/publication/image.webp", altEn: "Synthetic portrait", altAr: "صورة تجريبية", width: 640, height: 640, focalX: 25, focalY: 70 };
    const decoded = decodePublishedContent({ items: [{ ...row, media }] }, "speakers", origin)![0];
    expect(decoded.media?.src).toBe(`${origin}/storage/v1/object/public/msrc-published-media/${media.path}`);
    expect(contentSpeaker(decoded, "ar")).toMatchObject({ name: fields.nameAr, contentLocale: "ar", portraitPosition: "25% 70%" });
    for (const path of ["../private/image.webp", "https://example.org/a.webp", "draft/image.svg", "x/%2e%2e/image.webp"]) {
      expect(decodePublishedContent({ items: [{ ...row, media: { ...media, path } }] }, "speakers", origin)).toBeNull();
    }
  });
  it("preserves organizer-authored programme dates and interprets clocks in Riyadh", () => {
    const session = { ...row, collection: "sessions", fields: { titleEn: "Synthetic talk", titleAr: "محاضرة تجريبية", descriptionEn: "Synthetic only", descriptionAr: "تجريبي فقط", day: "2027-01-29", startTime: "09:00", endTime: "10:00", type: "talk", speakerIds: [id], sortOrder: 3 } };
    const item = decodePublishedContent({ items: [session] }, "sessions", origin)![0];
    expect(contentSession(item, "ar")).toMatchObject({ day: "2027-01-29", title: "محاضرة تجريبية", startAt: "2027-01-29T09:00:00+03:00", endAt: "2027-01-29T10:00:00+03:00", speakerSlugs: [id], sortOrder: 3 });
  });
});

describe("server-only public snapshot transport", () => {
  it("reads while the staff portal is closed and needs no email credentials", () => {
    expect(resolvePublicContentConfig({ STAFF_PORTAL_ENABLED: "false", STAFF_SUPABASE_URL: origin, STAFF_SUPABASE_SECRET_KEY: config.secret, STAFF_EDITION_KEY: "msrc-2027" })).toEqual({ origin, secret: config.secret, edition: "msrc-2027" });
    expect(resolvePublicContentConfig({})).toBeNull();
  });
  it("rejects arbitrary endpoints and hosted synthetic credentials", () => {
    expect(resolvePublicContentConfig({ STAFF_SUPABASE_URL: "https://example.org", STAFF_SUPABASE_SECRET_KEY: config.secret, STAFF_EDITION_KEY: "msrc-2027" })).toBeNull();
    expect(resolvePublicContentConfig({ PUBLIC_CONTENT_TEST_MODE: "true", VERCEL: "1", STAFF_SUPABASE_URL: "http://127.0.0.1:3230", STAFF_SUPABASE_SECRET_KEY: "sb_secret_public_content_mock_only", STAFF_EDITION_KEY: "synthetic-content-published" })).toBeNull();
  });
  it("calls only the published RPC with a server apikey, no user bearer or redirects", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [row] }));
    expect(await fetchPublishedCollection("speakers", config, request)).toHaveLength(1);
    expect(request).toHaveBeenCalledWith(`${origin}/rest/v1/rpc/msrc_content_published`, expect.objectContaining({
      method: "POST", redirect: "error", cache: "no-store", headers: { apikey: config.secret, "Content-Type": "application/json" },
      body: JSON.stringify({ edition_key: config.edition, collection_key: "speakers" }),
    }));
  });
  it.each([404, 403, 500, 503])("returns safe fallback on HTTP %s, including missing migrations", async (status) => {
    expect(await fetchPublishedCollection("speakers", config, vi.fn<typeof fetch>().mockResolvedValue(new Response("unavailable", { status })))).toBeNull();
  });
  it("handles timeout, malformed JSON and malformed fields", async () => {
    for (const request of [vi.fn<typeof fetch>().mockRejectedValue(new Error("timeout")), vi.fn<typeof fetch>().mockResolvedValue(new Response("invalid json")), vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [{}] }))]) {
      expect(await fetchPublishedCollection("speakers", config, request)).toBeNull();
    }
  });
  it("reads runtime configuration without forcing request-time rendering and excludes secrets from cache keys", async () => {
    vi.stubEnv("STAFF_SUPABASE_URL", origin); vi.stubEnv("STAFF_SUPABASE_SECRET_KEY", config.secret); vi.stubEnv("STAFF_EDITION_KEY", "msrc-2027");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [row] })));
    expect(await getPublishedContent("speakers")).toHaveLength(1);
    // ENG-063 follow-up: public content pages stay prerendered (ISR); connection() made
    // unknown locales and slugs render Next's bare error document without JavaScript.
    expect(next.connection).not.toHaveBeenCalled();
    expect(next.cache).toHaveBeenCalledWith(expect.any(Function), ["msrc-content-v1", origin, "msrc-2027", "speakers"], { revalidate: 60, tags: ["msrc-content:speakers"] });
    vi.unstubAllGlobals();
  });
});

describe("Next 16 publish and withdrawal revalidation", () => {
  beforeEach(() => { next.tag.mockClear(); next.path.mockClear(); });
  it.each(["speakers", "sessions", "partners", "team"] as const)("expires %s immediately and invalidates both locales", (collection) => {
    revalidatePublishedContent(collection);
    expect(next.tag).toHaveBeenCalledWith(`msrc-content:${collection}`, { expire: 0 });
    expect(next.path.mock.calls.some(([path]) => path.startsWith("/en"))).toBe(true);
    expect(next.path.mock.calls.some(([path]) => path.startsWith("/ar"))).toBe(true);
    if (collection === "speakers" || collection === "sessions") for (const locale of ["en", "ar"]) {
      expect(next.path).toHaveBeenCalledWith(`/${locale}/program/[slug]`, "page");
      expect(next.path).toHaveBeenCalledWith(`/${locale}/speakers/[slug]`, "page");
    }
  });
});
