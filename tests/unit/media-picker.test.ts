import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MediaPickerChoices } from "@/features/staff-portal/media-picker";
import { mediaCopy } from "@/features/staff-portal/media-copy";
import type { MediaAsset } from "@/features/staff-portal/media-contract";

const published: MediaAsset = { id: "synthetic-approved", filename: "Synthetic image.webp", state: "published", publicUrl: "https://synthetic.supabase.co/approved.webp", previewUrl: "/api/staff-portal/media?preview=synthetic-approved", width: 100, height: 100, altEn: "Approved synthetic image", altAr: "صورة تجريبية معتمدة", focalX: 35, focalY: 62, mime: "image/webp", size: 100, version: 1, captionEn: "", captionAr: "", creditEn: "", creditAr: "", rightsConfirmed: true, rightsEvidence: "Synthetic permission", createdAt: "2026-10-23T00:00:00Z", updatedAt: "2026-10-23T00:00:00Z" };

describe("MED-01 published image picker", () => {
  it.each(["en", "ar"] as const)("offers only available published choices with %s labels", (locale) => {
    const html = renderToStaticMarkup(createElement(MediaPickerChoices, { locale, value: published.id, onChoose: vi.fn(), assets: [
      published, { ...published, id: "draft-with-stale-url", state: "draft", altEn: "Forbidden draft" },
      { ...published, id: "archived-with-stale-url", state: "archived", altEn: "Forbidden archive" },
      { ...published, id: "no-public-object", publicUrl: null, altEn: "Forbidden missing object" },
      { ...published, id: "unfinished-operation", busy: true, altEn: "Forbidden unfinished operation" },
    ] }));
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain(`aria-label="${mediaCopy[locale].choose}: ${locale === "ar" ? published.altAr : published.altEn}"`);
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("Forbidden");
    expect(html).not.toContain("https://synthetic.supabase.co");
    expect(html).toContain("object-position:35% 62%");
  });
  it("shows an empty state when all returned records are unpublished", () => {
    const html = renderToStaticMarkup(createElement(MediaPickerChoices, { locale: "en", onChoose: vi.fn(), assets: [{ ...published, state: "archived" }] }));
    expect(html).toContain(mediaCopy.en.pickerEmpty);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<img");
  });
  it("keeps choices disabled while the host editor is saving", () => {
    const html = renderToStaticMarkup(createElement(MediaPickerChoices, { locale: "en", onChoose: vi.fn(), disabled: true, assets: [published] }));
    expect(html).toContain('disabled=""');
  });
});
