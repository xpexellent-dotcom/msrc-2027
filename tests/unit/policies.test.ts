import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { policyEffectiveDate } from "@/config/policies";
import { currentPolicyVersion, getPolicyDocument, isPolicyVersion, policyKinds, policyVersions } from "@/content/policies";
import { PolicyPage } from "@/features/policies/policy-page";
import { policyPageMetadata } from "@/features/policies/policy-metadata";
import { readApprovedPolicy } from "../policy-source";

const privateOrganizerNames = /\b(?:Emad|Abdulrahman|Akram)\b|عماد|عبد\s*الرحمن|[أا]كرم/iu;
const unfinished = /\b(?:draft|placeholder)\b|Organizer decision|awaiting review|wording pending|مسودة|نص مؤقت|بانتظار/iu;

afterEach(() => vi.unstubAllEnvs());

describe("approved policy v1.0 (BL-PUB-08 / PRV-01/02/05/07/08)", () => {
  it("uses one approved version and effective date for both documents and stable routes", () => {
    expect(currentPolicyVersion).toBe("v1.0");
    expect(policyEffectiveDate).toBe("2026-10-06");
    expect(policyVersions[currentPolicyVersion]).toMatchObject({ version: "v1.0", status: "approved", effectiveOn: policyEffectiveDate });
    for (const kind of policyKinds) for (const locale of ["en", "ar"] as const) {
      const current = getPolicyDocument(kind, locale);
      expect(current.document).toEqual(getPolicyDocument(kind, locale, currentPolicyVersion).document);
      expect(current.effectiveOn).toBe(policyEffectiveDate);
    }
  });

  it.each([undefined, null, "", "2026-10-04-draft", "2026-10-04", "2027-final", "__proto__", "constructor", 20261004])("rejects an unavailable version %s", (version) => {
    expect(isPolicyVersion(version)).toBe(false);
  });

  it.each(policyKinds)("preserves every approved English %s paragraph, list item and table cell verbatim", (kind) => {
    const source = readApprovedPolicy(kind), { document } = getPolicyDocument(kind, "en");
    expect(document.title).toBe(source.title);
    expect(document.lead.split("\n\n").filter(Boolean)).toEqual(source.intro);
    expect(document.sections.map(({ title, blocks }) => ({ title, blocks }))).toEqual(source.sections);
    expect(document.sections).toHaveLength(kind === "privacy" ? 9 : 8);
    expect(document.sections.flatMap(({ blocks }) => blocks).filter(({ type }) => type === "table")).toHaveLength(kind === "privacy" ? 4 : 0);
  });

  it.each(policyKinds)("preserves Arabic %s section, list and table topology with localized links and numbers", (kind) => {
    const english = getPolicyDocument(kind, "en").document, arabic = getPolicyDocument(kind, "ar").document;
    const topology = (document: typeof english) => document.sections.map(({ id, blocks }) => ({ id, blocks: blocks.map((block) => block.type === "paragraph"
      ? { type: block.type } : block.type === "list" ? { type: block.type, ordered: block.ordered, count: block.items.length }
        : { type: block.type, headers: block.headers.length, rows: block.rows.map((row) => row.length) }) }));
    expect(topology(arabic)).toEqual(topology(english));
    expect(new Set(english.sections.map(({ id }) => id)).size).toBe(english.sections.length);
    const text = [arabic.title, arabic.lead, ...arabic.sections.flatMap(({ title, blocks }) => [title, ...blocks.flatMap((block) => block.type === "paragraph"
      ? [block.text] : block.type === "list" ? block.items : [...block.headers, ...block.rows.flat()])])].join(" ");
    // Latin brand names, emails/URLs and MSRC 2027 remain readable proper names.
    expect(text.replace(/\[[^\]]+\]\([^)]+\)/g, (link) => link.slice(1, link.indexOf("]"))).replace(/MSRC 2027|msrc2027\.com/g, "MSRC")).not.toMatch(/[0-9]/);
    expect(text).not.toMatch(/https:\/\/www\.msrc2027\.com\/en\//);
    const enTargets = [...JSON.stringify(english).matchAll(/https:\/\/[^\s")]+/g)].map(([target]) => target);
    const arTargets = [...JSON.stringify(arabic).matchAll(/https:\/\/[^\s")]+/g)].map(([target]) => target);
    expect(arTargets).toEqual(enTargets.map((target) => target.replace("/en/", "/ar/")));
    expect(text).not.toMatch(unfinished);
  });

  it("uses approved legal terminology and records Arabic precedence faithfully", () => {
    const privacy = JSON.stringify(getPolicyDocument("privacy", "ar").document);
    for (const term of ["نظام حماية البيانات الشخصية", "ولائحته التنفيذية", "جهة التحكم", "الهوية الوطنية أو رقم الإقامة", "صاحب البيانات"]) expect(privacy).toContain(term);
    const terms = getPolicyDocument("terms", "en").document.sections.find(({ id }) => id === "governing-law")!;
    expect(JSON.stringify(terms)).toContain("the Arabic version prevails");
    expect(JSON.stringify(getPolicyDocument("terms", "ar").document.sections.find(({ id }) => id === "governing-law"))).toContain("وفي حال وجود أي اختلاف بين النسختين، يُعتد بالنسخة العربية.");
  });

  it("renders final read-only documents, semantic tables, version label and shared effective date", () => {
    for (const locale of ["en", "ar"] as const) for (const kind of policyKinds) {
      const html = renderToStaticMarkup(createElement(PolicyPage, { locale, kind }));
      expect(html).toContain(`data-policy-version="${currentPolicyVersion}"`);
      expect(html).toContain(`href="/${locale}/${kind}/${currentPolicyVersion}"`);
      expect(html).toContain(`dateTime="${policyEffectiveDate}"`);
      expect(html).toContain(locale === "en" ? "Version 1.0" : "الإصدار ١.٠");
      expect(html).not.toMatch(unfinished);
      expect(html).not.toMatch(/<(form|input|textarea|select|iframe|video)\b/i);
      expect(html.match(/<table\b/g) ?? []).toHaveLength(kind === "privacy" ? 4 : 0);
      if (kind === "privacy") expect(html).toMatch(/<th[^>]*scope="col"/);
      const stable = renderToStaticMarkup(createElement(PolicyPage, { locale, kind, version: currentPolicyVersion, dated: true }));
      expect(stable).toContain(`href="/${locale}/${kind}"`);
    }
  });

  it.each(["en", "ar"] as const)("keeps internal people out of public %s documents and metadata", (locale) => {
    for (const kind of policyKinds) for (const version of [undefined, currentPolicyVersion]) {
      expect(renderToStaticMarkup(createElement(PolicyPage, { locale, kind, version, dated: version !== undefined }))).not.toMatch(privateOrganizerNames);
      expect(JSON.stringify(policyPageMetadata(kind, locale, version))).not.toMatch(privateOrganizerNames);
    }
  });

  it.each(["production", "preview", "development"])("indexes approved policies only on production (%s)", async (environment) => {
    vi.resetModules(); vi.stubEnv("VERCEL_ENV", environment);
    const { policyPageMetadata } = await import("@/features/policies/policy-metadata");
    const { publicRoutes } = await import("@/lib/metadata");
    expect(publicRoutes).toContain("/privacy"); expect(publicRoutes).toContain("/terms");
    for (const kind of policyKinds) for (const locale of ["en", "ar"] as const) for (const version of [undefined, currentPolicyVersion]) {
      const metadata = policyPageMetadata(kind, locale, version), suffix = version ? `/${version}` : "";
      expect(metadata.robots).toEqual({ index: environment === "production", follow: environment === "production" });
      expect(metadata.title).toBe(`${getPolicyDocument(kind, locale).document.title} | MSRC 2027`);
      expect(metadata.alternates).toEqual({ canonical: `/${locale}/${kind}${suffix}`, languages: { en: `/en/${kind}${suffix}`, ar: `/ar/${kind}${suffix}`, "x-default": `/en/${kind}${suffix}` } });
    }
  });
});
