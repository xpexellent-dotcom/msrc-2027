import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { currentPolicyVersion, getPolicyDocument, isPolicyVersion, policyKinds, policyVersions } from "@/content/policies";
import { PolicyPage } from "@/features/policies/policy-page";

afterEach(() => vi.unstubAllEnvs());

describe("versioned draft policies (BL-PUB-08 / PRV-01/02/05/07/08)", () => {
  it("records an immutable dated draft without inventing an effective legal date", () => {
    expect(currentPolicyVersion).toBe("2026-10-04-draft");
    expect(policyVersions[currentPolicyVersion]).toMatchObject({
      version: "2026-10-04-draft", recordedOn: "2026-10-04", status: "draft", effectiveOn: null,
    });
    for (const kind of policyKinds) for (const locale of ["en", "ar"] as const) {
      expect(getPolicyDocument(kind, locale).document).toEqual(getPolicyDocument(kind, locale, currentPolicyVersion).document);
    }
  });

  it.each([undefined, null, "", "2026-10-04", "2027-final", "__proto__", "constructor", 20261004])("rejects an unrecorded version %s", (version) => {
    expect(isPolicyVersion(version)).toBe(false);
  });

  it("preserves bilingual section identities and identifies every unfinished section", () => {
    for (const kind of policyKinds) {
      const english = getPolicyDocument(kind, "en").document;
      const arabic = getPolicyDocument(kind, "ar").document;
      expect(arabic.sections.map(({ id, status }) => ({ id, status }))).toEqual(english.sections.map(({ id, status }) => ({ id, status })));
      expect(new Set(english.sections.map(({ id }) => id)).size).toBe(english.sections.length);
      for (const locale of ["en", "ar"] as const) {
        const { document, labels } = getPolicyDocument(kind, locale);
        expect(labels.approvalNotice).toMatch(locale === "en" ? /Emad Khoja/ : /عماد خوجة/);
        for (const section of document.sections) {
          expect(section.paragraphs.length).toBeGreaterThan(0);
          if (section.status === "placeholder") {
            expect(section.paragraphs.join(" ")).toMatch(locale === "en" ? /Placeholder/ : /نص مؤقت/);
          }
        }
      }
    }
  });

  it("contains only the decided retention fields and leaves the certificate period anchor unresolved", () => {
    const { document } = getPolicyDocument("privacy", "en");
    const retention = document.sections.find(({ id }) => id === "retention")!;
    expect(retention.paragraphs.join(" ")).toContain("one year after the conference");
    expect(retention.paragraphs.join(" ")).toContain("name, certificate number and date");
    expect(retention.paragraphs.join(" ")).toContain("two years");
    expect(retention.paragraphs.join(" ")).toContain("Abdulrahman Ismail");
    const implementation = document.sections.find(({ id }) => id === "retention-details")!;
    expect(implementation.status).toBe("placeholder");
    expect(implementation.paragraphs.join(" ")).toContain("start of the certificate record’s two-year period");
  });

  it("gives the decided data-request channel, response period, owner and localized KAU links", () => {
    const english = getPolicyDocument("privacy", "en").document;
    const request = english.sections.find(({ id }) => id === "data-requests")!;
    expect(request.paragraphs.join(" ")).toContain("Privacy & data requests");
    expect(request.paragraphs.join(" ")).toContain("within 30 days");
    expect(request.paragraphs.join(" ")).toContain("Akram Awan");
    expect(request.links).toContainEqual({ label: "contact@msrc2027.com", href: "mailto:contact@msrc2027.com", direction: "ltr" });
    for (const locale of ["en", "ar"] as const) {
      const responsibility = getPolicyDocument("privacy", locale).document.sections.find(({ id }) => id === "responsibility")!;
      expect(responsibility.links?.[0].href).toBe(`https://kau.edu.sa/${locale}/page/privacy-policy`);
    }
  });

  it("keeps identifiable publication wording unresolved instead of claiming blanket consent", () => {
    const { document } = getPolicyDocument("privacy", "en");
    expect(document.sections.find(({ id }) => id === "photography")?.paragraphs.join(" ")).toContain("The event is photographed and recorded.");
    const publication = document.sections.find(({ id }) => id === "photography-publication")!;
    expect(publication.status).toBe("placeholder");
    expect(publication.paragraphs.join(" ")).toContain("legal basis");
    expect(document.sections.flatMap(({ paragraphs }) => paragraphs).join(" ")).not.toMatch(/deemed consent|consent by attending|automatically consent|notice is sufficient/i);
  });

  it("leaves Terms wholly placeholder without invented contractual clauses", () => {
    for (const locale of ["en", "ar"] as const) {
      const sections = getPolicyDocument("terms", locale).document.sections;
      expect(sections.every(({ status }) => status === "placeholder")).toBe(true);
      expect(sections).toHaveLength(1);
      expect(sections.flatMap(({ paragraphs }) => paragraphs).join(" ")).not.toMatch(/refund|liability|jurisdiction|governing law|waive/i);
    }
  });

  it("renders a read-only document with visible review status and a stable dated link", () => {
    for (const locale of ["en", "ar"] as const) for (const kind of policyKinds) {
      const html = renderToStaticMarkup(createElement(PolicyPage, { locale, kind }));
      expect(html).toContain(`data-policy-version="${currentPolicyVersion}"`);
      expect(html).toContain(`href="/${locale}/${kind}/${currentPolicyVersion}"`);
      expect(html).toContain(getPolicyDocument(kind, locale).labels.status);
      expect(html).not.toMatch(/<(form|input|textarea|select|iframe|video)\b/i);
      const dated = renderToStaticMarkup(createElement(PolicyPage, { locale, kind, version: currentPolicyVersion, dated: true }));
      expect(dated).toContain(`href="/${locale}/${kind}"`);
    }
  });

  it.each(["production", "preview", "development"])("keeps both latest and dated drafts noindex in %s", async (environment) => {
    vi.resetModules();
    vi.stubEnv("VERCEL_ENV", environment);
    const { policyPageMetadata } = await import("@/features/policies/policy-metadata");
    const { publicRoutes } = await import("@/lib/metadata");
    expect(publicRoutes).not.toContain("/privacy");
    expect(publicRoutes).not.toContain("/terms");
    for (const kind of policyKinds) for (const locale of ["en", "ar"] as const) {
      for (const version of [undefined, currentPolicyVersion]) {
        const metadata = policyPageMetadata(kind, locale, version);
        const suffix = version ? `/${version}` : "";
        expect(metadata.robots).toEqual({ index: false, follow: false, noarchive: true });
        expect(metadata.alternates).toEqual({
          canonical: `/${locale}/${kind}${suffix}`,
          languages: { en: `/en/${kind}${suffix}`, ar: `/ar/${kind}${suffix}`, "x-default": `/en/${kind}${suffix}` },
        });
      }
    }
  });
});
