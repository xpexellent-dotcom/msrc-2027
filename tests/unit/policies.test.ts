import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { policyEffectiveDate } from "@/config/policies";
import { currentPolicyVersion, currentTermsVersion, currentVersionFor, getPolicyDocument, isPolicyVersion, policyKinds, policyVersionKeys, policyVersions } from "@/content/policies";
import { PolicyPage } from "@/features/policies/policy-page";
import { policyPageMetadata } from "@/features/policies/policy-metadata";
import { readApprovedPolicy } from "../policy-source";

const privateOrganizerNames = /\b(?:Emad|Abdulrahman|Akram)\b|عماد|عبد\s*الرحمن|[أا]كرم/iu;
const unfinished = /\b(?:draft|placeholder)\b|Organizer decision|awaiting review|wording pending|مسودة|نص مؤقت|بانتظار/iu;

afterEach(() => vi.unstubAllEnvs());

describe("approved privacy v1.1 and Terms v1.0 (ORG-066 / BL-PUB-08 / PRV-01/02/05/07/08)", () => {
  it("uses the approved privacy version without changing Terms or the shared effective date", () => {
    expect(currentPolicyVersion).toBe("v1.1");
    expect(currentTermsVersion).toBe("v1.0");
    expect(policyEffectiveDate).toBe("2026-10-06");
    expect(policyVersions[currentPolicyVersion]).toMatchObject({ version: "v1.1", status: "approved", effectiveOn: policyEffectiveDate });
    for (const kind of policyKinds) for (const locale of ["en", "ar"] as const) {
      const current = getPolicyDocument(kind, locale);
      expect(current.document).toEqual(getPolicyDocument(kind, locale, currentVersionFor(kind)).document);
      expect(current.effectiveOn).toBe(policyEffectiveDate);
    }
  });

  it("preserves archived v1.0 and changes only the approved optional profile rows in privacy v1.1", () => {
    expect(policyVersionKeys("privacy")).toEqual(["v1.0", "v1.1"]);
    expect(policyVersionKeys("terms")).toEqual(["v1.0"]);
    expect(isPolicyVersion("v1.1", "terms")).toBe(false);
    expect(() => getPolicyDocument("terms", "en", "v1.1")).toThrow("Unavailable policy version");
    const original = readApprovedPolicy("privacy", "v1.0");
    expect(getPolicyDocument("privacy", "en", "v1.0").document.sections.map(({ title, blocks }) => ({ title, blocks }))).toEqual(original.sections);
    for (const locale of ["en", "ar"] as const) {
      const before = getPolicyDocument("privacy", locale, "v1.0").document;
      const after = getPolicyDocument("privacy", locale).document;
      expect(after.title).toBe(before.title);
      expect(after.lead).toBe(before.lead);
      for (const section of before.sections) {
        const updated = after.sections.find(({ id }) => id === section.id)!;
        if (!["information", "processing", "retention"].includes(section.id)) expect(updated).toEqual(section);
        else {
          expect(updated.title).toBe(section.title);
          expect(updated.blocks).toHaveLength(section.blocks.length);
          section.blocks.forEach((block, index) => {
            const next = updated.blocks[index];
            if (block.type !== "table" || next.type !== "table") expect(next).toEqual(block);
            else {
              expect(next.headers).toEqual(block.headers);
              expect(next.rows).toHaveLength(block.rows.length);
              const changedRows = block.rows.flatMap((row, rowIndex) => JSON.stringify(row) === JSON.stringify(next.rows[rowIndex]) ? [] : [rowIndex]);
              expect(changedRows).toEqual(section.id === "information" ? [2] : section.id === "processing" ? [1] : [0, 5]);
              if (section.id === "retention") block.rows.forEach((row, rowIndex) => expect(next.rows[rowIndex][1]).toBe(row[1]));
            }
          });
        }
      }
    }
    const privacy = JSON.stringify(getPolicyDocument("privacy", "en").document);
    for (const text of ["a profile picture", "your university or institution", "your student status and year", "your specialty interests", "optional and visible only to you and authorized organizers", "There is no public directory", "your consent, given when you add them", "You can remove them at any time", "Deleted after 30 days", "by 28 January 2028"]) expect(privacy).toContain(text);
    const arabic = JSON.stringify(getPolicyDocument("privacy", "ar").document);
    for (const text of ["صورة ملفك الشخصي", "وجامعتك أو مؤسستك", "وصفتك الطلابية وسنتك الدراسية", "والتخصصات التي تهمك", "اختيارية", "للمنظمين المصرح لهم", "ولا يوجد دليل عام", "موافقتك التي تمنحها عند إضافتها", "ويمكنك إزالتها في أي وقت"]) expect(arabic).toContain(text);
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
      const version = currentVersionFor(kind);
      expect(html).toContain(`data-policy-version="${version}"`);
      expect(html).toContain(`href="/${locale}/${kind}/${version}"`);
      expect(html).toContain(`dateTime="${policyEffectiveDate}"`);
      expect(html).toContain(locale === "en" ? `Version ${version.slice(1)}` : kind === "privacy" ? "الإصدار ١.١" : "الإصدار ١.٠");
      expect(html).not.toMatch(unfinished);
      expect(html).not.toMatch(/<(form|input|textarea|select|iframe|video)\b/i);
      expect(html.match(/<table\b/g) ?? []).toHaveLength(kind === "privacy" ? 4 : 0);
      if (kind === "privacy") expect(html).toMatch(/<th[^>]*scope="col"/);
      const stable = renderToStaticMarkup(createElement(PolicyPage, { locale, kind, version, dated: true }));
      expect(stable).toContain(`href="/${locale}/${kind}"`);
    }
  });

  it.each(["en", "ar"] as const)("keeps internal people out of public %s documents and metadata", (locale) => {
    for (const kind of policyKinds) for (const version of [undefined, currentVersionFor(kind)]) {
      expect(renderToStaticMarkup(createElement(PolicyPage, { locale, kind, version, dated: version !== undefined }))).not.toMatch(privateOrganizerNames);
      expect(JSON.stringify(policyPageMetadata(kind, locale, version))).not.toMatch(privateOrganizerNames);
    }
  });

  it.each(["production", "preview", "development"])("indexes approved policies only on production (%s)", async (environment) => {
    vi.resetModules(); vi.stubEnv("VERCEL_ENV", environment);
    const { policyPageMetadata, policyTabLabel } = await import("@/features/policies/policy-metadata");
    const { publicRoutes } = await import("@/lib/metadata");
    expect(publicRoutes).toContain("/privacy"); expect(publicRoutes).toContain("/terms");
    for (const kind of policyKinds) for (const locale of ["en", "ar"] as const) for (const version of [undefined, currentVersionFor(kind)]) {
      const metadata = policyPageMetadata(kind, locale, version);
      // A dated version repeats the current text: never indexed, canonical to the unversioned page.
      expect(metadata.robots).toEqual({ index: environment === "production" && !version, follow: environment === "production" });
      expect(metadata.title).toBe(`${policyTabLabel(getPolicyDocument(kind, locale).document.title)} | MSRC 2027`);
      expect(String(metadata.title)).not.toMatch(/MSRC (?:2027|٢٠٢٧).*MSRC 2027/u);
      expect(metadata.alternates).toEqual({ canonical: `/${locale}/${kind}`, languages: { en: `/en/${kind}`, ar: `/ar/${kind}`, "x-default": `/en/${kind}` } });
    }
  });

  it("drops only the brand from the approved headings for the tab title", async () => {
    const { policyTabLabel } = await import("@/features/policies/policy-metadata");
    expect(policyTabLabel("MSRC 2027 Privacy Policy")).toBe("Privacy Policy");
    expect(policyTabLabel("MSRC 2027 Terms and Conditions")).toBe("Terms and Conditions");
    expect(policyTabLabel("سياسة الخصوصية لمؤتمر MSRC ٢٠٢٧")).toBe("سياسة الخصوصية");
    expect(policyTabLabel("شروط وأحكام مؤتمر MSRC ٢٠٢٧")).toBe("شروط وأحكام");
    expect(policyTabLabel("Cookie notice")).toBe("Cookie notice");
  });
});
