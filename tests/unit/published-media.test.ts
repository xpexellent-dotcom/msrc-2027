import { beforeEach, describe, expect, it, vi } from "vitest";
import { editionMedia } from "@/content/edition-media";
import { publishedOrFallback } from "@/features/content/published";
import { decodePublishedMedia } from "@/features/media/published";
import { fetchPublishedMedia, getPublishedMedia } from "@/features/media/published.server";
import { revalidatePublishedMedia } from "@/features/media/revalidate.server";

const next = vi.hoisted(() => ({ tag: vi.fn(), path: vi.fn(), cache: vi.fn((fn: () => unknown) => fn) }));
vi.mock("next/cache", () => ({ unstable_cache: next.cache, revalidateTag: next.tag, revalidatePath: next.path }));
const origin = "https://ecemjggwlzqpjcwmchrl.supabase.co";
const config = { origin, edition: "msrc-2027", secret: "sb_secret_synthetic" };
const row = { id: "10000000-0000-4000-8000-000000000001", slug: "msrc-2026-photo-1", publicPath: "edition/asset/publication/image.webp",
  altEn: "Synthetic photo", altAr: "صورة تجريبية", captionEn: "Synthetic caption", captionAr: "وصف تجريبي", focalX: 50, focalY: 75,
  width: 1280, height: 720, editionYear: 2026, kind: "photograph", displayOrder: 1, videoPath: null, durationSeconds: null };

describe("published media archive projection", () => {
  it("maps every current archive item in the exact current year/order with bilingual copy and framing", () => {
    const items = editionMedia.map((item, index) => ({ ...row, id: `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`, slug: item.slug,
      altEn: item.title, altAr: item.titleAr, captionEn: item.description, captionAr: item.descriptionAr,
      focalX: parseFloat((item.objectPosition ?? "50% 50%").split(" ")[0]), focalY: parseFloat((item.objectPosition ?? "50% 50%").split(" ")[1]),
      width: item.width, height: item.height, editionYear: item.edition, kind: item.kind === "photograph" ? "photograph" : "film",
      displayOrder: index, videoPath: item.kind === "photograph" ? null : item.asset, durationSeconds: item.durationSeconds }));
    const result = decodePublishedMedia({ items: [...items].reverse() }, origin)!;
    expect(result.map(({ slug, title, titleAr, description, descriptionAr, objectPosition, durationSeconds }) => ({ slug, title, titleAr, description, descriptionAr, objectPosition, durationSeconds })))
      .toEqual(editionMedia.map(({ slug, title, titleAr, description, descriptionAr, objectPosition, durationSeconds }) => ({ slug, title, titleAr, description, descriptionAr, objectPosition: objectPosition ?? "50% 50%", durationSeconds })));
    expect(result.filter((item) => item.kind === "photograph")).toHaveLength(26);
    expect(result.filter((item) => item.kind === "highlight")).toHaveLength(4);
  });
  it("keeps only public projection fields and trusted canonical public bucket URLs", () => {
    const decoded = decodePublishedMedia({ items: [{ ...row, rightsEvidence: "private evidence", rawPath: "private-original.webp", actorId: "private" }] }, origin)![0];
    expect(decoded.asset).toBe(`${origin}/storage/v1/object/public/msrc-published-media/${row.publicPath}`);
    expect(decoded.objectPosition).toBe("50% 75%");
    expect(JSON.stringify(decoded)).not.toMatch(/rightsEvidence|rawPath|actorId|private/);
  });
  it("allows optional empty published captions without losing the archive", () => {
    expect(decodePublishedMedia({ items: [{ ...row, captionEn: "", captionAr: "" }] }, origin)).toHaveLength(1);
  });
  it("uses the selected static film's actual duration after staff change its video path", () => {
    const decoded = decodePublishedMedia({ items: [{ ...row, kind: "film", videoPath: "/media/editions/2026/video-2-silent-v2.mp4", durationSeconds: 6.7 }] }, origin)![0];
    expect(decoded.durationSeconds).toBe(4.733333);
    expect(decoded.asset).toBe("/media/editions/2026/video-2-silent-v2.mp4");
  });
  it.each(["../private/image.webp", "https://example.org/image.webp", "edition/image.svg", "edition/%2e%2e/image.webp"])("rejects unsafe storage path %s", (publicPath) => {
    expect(decodePublishedMedia({ items: [{ ...row, publicPath }] }, origin)).toBeNull();
  });
  it.each([{ kind: "film", videoPath: "https://example.org/video.mp4" }, { kind: "film", videoPath: "/media/editions/2026/video-1.mp4" }, { editionYear: null }, { altAr: "" }, { focalX: 101 }, { displayOrder: -1 }, { durationSeconds: -1 }, { durationSeconds: NaN }])("rejects invalid rows %j as one archive", (change) => {
    expect(decodePublishedMedia({ items: [row, { ...row, ...change, id: "10000000-0000-4000-8000-000000000002", slug: "another" }] }, origin)).toBeNull();
  });
  it("rejects duplicate ids/slugs rather than silently hiding a published item", () => {
    expect(decodePublishedMedia({ items: [row, row] }, origin)).toBeNull();
    expect(decodePublishedMedia({ items: [row, { ...row, id: "10000000-0000-4000-8000-000000000002" }] }, origin)).toBeNull();
  });
  it("keeps the full built-in archive for empty, missing or unavailable database reads", async () => {
    for (const read of [async () => [], async () => null, async () => { throw new Error("missing migration"); }]) {
      expect(await publishedOrFallback(read, editionMedia)).toBe(editionMedia);
    }
  });
});

describe("server-only media transport and immediate withdrawal", () => {
  beforeEach(() => { next.tag.mockClear(); next.path.mockClear(); });
  it("uses service apikey only and the published RPC with bounded uncached transport", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [row] }));
    expect(await fetchPublishedMedia(config, request)).toHaveLength(1);
    expect(request).toHaveBeenCalledWith(`${origin}/rest/v1/rpc/msrc_media_published`, expect.objectContaining({ method: "POST", redirect: "error", cache: "no-store",
      headers: { apikey: config.secret, "Content-Type": "application/json" }, body: JSON.stringify({ edition_key: config.edition }), signal: expect.any(AbortSignal) }));
  });
  it.each([403, 404, 500, 503])("safely falls back on HTTP %s including the pending migration", async (status) => {
    expect(await fetchPublishedMedia(config, vi.fn<typeof fetch>().mockResolvedValue(new Response("unavailable", { status })))).toBeNull();
  });
  it("safely falls back for malformed JSON and network errors", async () => {
    for (const request of [vi.fn<typeof fetch>().mockResolvedValue(new Response("bad json")), vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"))]) expect(await fetchPublishedMedia(config, request)).toBeNull();
  });
  it("shares the existing closed staff configuration and caches only the public archive for 60 seconds", async () => {
    vi.stubEnv("STAFF_SUPABASE_URL", origin); vi.stubEnv("STAFF_SUPABASE_SECRET_KEY", config.secret); vi.stubEnv("STAFF_EDITION_KEY", config.edition);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [row] })));
    try {
      expect(await getPublishedMedia()).toHaveLength(1);
      expect(next.cache).toHaveBeenCalledWith(expect.any(Function), ["msrc-media-archive-v1", origin, config.edition], { revalidate: 60, tags: ["msrc-media:archive"] });
    } finally { vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
  });
  it("expires tag and both localized media routes immediately", () => {
    revalidatePublishedMedia();
    expect(next.tag).toHaveBeenCalledWith("msrc-media:archive", { expire: 0 });
    expect(next.path.mock.calls).toEqual([["/en/media"], ["/ar/media"]]);
  });
});
