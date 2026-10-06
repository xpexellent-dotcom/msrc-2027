import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IdentityDocument } from "@/features/staff-portal/identity-document";

describe("BL-RPT-03 identifier presentation", () => {
  it.each(["en", "ar"] as const)("%s defensively masks an accidentally raw projection", (locale) => {
    const html = renderToStaticMarkup(createElement(IdentityDocument, { locale, masked: "SYNTHETIC1234", allowReveal: true, busy: false, onReveal: vi.fn() }));
    expect(html).toContain("••••••1234");
    expect(html).not.toContain("SYNTHETIC1234");
  });
  it("does not give ordinary staff a reveal control", () => {
    const reveal = vi.fn();
    const html = renderToStaticMarkup(createElement(IdentityDocument, { locale: "en", masked: "••••••1234", allowReveal: false, busy: false, onReveal: reveal }));
    expect(html).not.toContain("<button");
    expect(reveal).not.toHaveBeenCalled();
  });
  it("leaves missing registration data unavailable without an action", () => {
    const html = renderToStaticMarkup(createElement(IdentityDocument, { locale: "en", masked: null, allowReveal: true, busy: false, onReveal: vi.fn() }));
    expect(html).toContain("Registration identity field is not available yet.");
    expect(html).not.toContain("<button");
  });
});
