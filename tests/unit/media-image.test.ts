import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MediaImage, type PublishedMediaImage } from "@/components/media-image";

const published: PublishedMediaImage = { state: "published", publicUrl: "https://synthetic.supabase.co/storage/v1/object/public/msrc-media-public/approved.webp", width: 2048, height: 1024, altEn: "Synthetic image", altAr: "صورة تجريبية", focalX: 31, focalY: 72 };

describe("MED-01/03/04 public media rendering", () => {
  it.each(["draft", "archived"] as const)("never renders a %s reference even when a stale public URL remains", (state) => {
    expect(renderToStaticMarkup(createElement(MediaImage, { asset: { ...published, state }, locale: "en" }))).toBe("");
  });
  it("does not render a published row without its public object", () => {
    expect(renderToStaticMarkup(createElement(MediaImage, { asset: { ...published, publicUrl: null }, locale: "en" }))).toBe("");
  });
  it.each(["en", "ar"] as const)("uses %s alt text and fixed responsive files with the stored physical focal point", (locale) => {
    const html = renderToStaticMarkup(createElement(MediaImage, { asset: published, locale, sizes: "(max-width: 640px) 100vw, 50vw" }));
    expect(html).toContain(`alt="${locale === "ar" ? published.altAr : published.altEn}"`);
    expect(html).toContain("approved.640.webp 640w");
    expect(html).toContain("approved.1280.webp 1280w");
    expect(html).toContain("approved.1920.webp 1920w");
    expect(html).toContain("approved.webp 2048w");
    expect(html).toContain("object-position:31% 72%");
    expect(html).not.toContain("/_next/image");
  });
  it("does not advertise enlarged derivatives for a small source", () => {
    const html = renderToStaticMarkup(createElement(MediaImage, { asset: { ...published, width: 320, height: 160 }, locale: "en" }));
    expect(html).toContain("approved.webp 320w");
    expect(html).not.toContain(".640.webp");
    expect(html).not.toContain(".1280.webp");
  });
});
