import path from "node:path";
import type { Stats } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isLocalMediaPreviewAllowed } from "@/lib/preview.server";
import { getLocalPreviewAsset, previewByteRange } from "@/lib/preview-media.server";

vi.mock("node:fs/promises", () => ({ realpath: vi.fn(), stat: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("LOCAL_MEDIA_PREVIEW_ENABLED", "true");
  vi.mocked(realpath).mockImplementation(async (file) => path.resolve(String(file)));
  vi.mocked(stat).mockResolvedValue({ size: 100, isFile: () => true } as Stats);
});

describe("unpublished media boundary (MED-02/04, CFG-12)", () => {
  it("permits only an explicitly enabled development process", () => {
    expect(isLocalMediaPreviewAllowed()).toBe(true);
    vi.stubEnv("LOCAL_MEDIA_PREVIEW_ENABLED", "");
    expect(isLocalMediaPreviewAllowed()).toBe(false);
  });
  it.each(["production", "test"])("refuses NODE_ENV=%s even with the preview flag enabled", async (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    expect(isLocalMediaPreviewAllowed()).toBe(false);
    expect(await getLocalPreviewAsset("desktop.mp4")).toBeNull();
    expect(realpath).not.toHaveBeenCalled();
  });
  it("refuses a production deployment even with development and preview flags", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(await getLocalPreviewAsset("desktop.mp4")).toBeNull();
    expect(realpath).not.toHaveBeenCalled();
  });
  it.each(["Montage_3.mp4", "manifest.json", "../desktop.mp4", "/desktop.mp4", "desktop.mp4?token=secret"])("never reads unlisted asset %s", async (name) => {
    expect(await getLocalPreviewAsset(name)).toBeNull();
    expect(realpath).not.toHaveBeenCalled();
  });
  it("resolves an allowed derivative within its private review folder", async () => {
    const asset = await getLocalPreviewAsset("desktop.mp4");
    expect(asset?.file).toBe(path.join(process.cwd(), ".tools", "media", "msrc2026-preview", "desktop.mp4"));
    expect(asset?.contentType).toBe("video/mp4");
  });
  it("refuses a symlink that escapes the review folder", async () => {
    vi.mocked(realpath).mockResolvedValueOnce(path.resolve(".tools/media/msrc2026-preview"))
      .mockResolvedValueOnce(path.resolve(".tools/media/private-original.mp4"));
    expect(await getLocalPreviewAsset("desktop.mp4")).toBeNull();
    expect(stat).not.toHaveBeenCalled();
  });
  it.each([0, 32 * 1024 * 1024 + 1])("refuses a derivative outside the bounded file size: %s", async (size) => {
    vi.mocked(stat).mockResolvedValue({ size, isFile: () => true } as Stats);
    expect(await getLocalPreviewAsset("desktop.mp4")).toBeNull();
  });
  it("fails closed if a local file is absent", async () => {
    vi.mocked(realpath).mockRejectedValueOnce(new Error("ENOENT"));
    expect(await getLocalPreviewAsset("poster-mobile.jpg")).toBeNull();
  });
});

describe("native video byte ranges", () => {
  it.each([
    [null, { start: 0, end: 99, partial: false }],
    ["bytes=0-9", { start: 0, end: 9, partial: true }],
    ["bytes=90-", { start: 90, end: 99, partial: true }],
    ["bytes=-10", { start: 90, end: 99, partial: true }],
    ["bytes=90-999", { start: 90, end: 99, partial: true }],
    ["bytes=-999", { start: 0, end: 99, partial: true }],
  ])("supports full, seek and suffix delivery: %s", (range, expected) => {
    expect(previewByteRange(range as string | null, 100)).toEqual(expected);
  });
  it.each(["bytes=100-", "bytes=9-1", "bytes=-0", "bytes=-", "bytes=0-1,2-3", "bytes=9007199254740992-", "items=0-9"])("rejects invalid or multiple range: %s", (range) => {
    expect(previewByteRange(range, 100)).toBeNull();
  });
});
