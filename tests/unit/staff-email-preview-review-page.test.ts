import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { headers } from "next/headers";
import EmailPreviewReviewPage, { generateMetadata } from "@/app/[locale]/(staff-review)/staff/email-preview-review/page";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

const previewHost = "msrc-2027-review.vercel.app";
const renderPage = (locale = "en") => EmailPreviewReviewPage({ params: Promise.resolve({ locale }) });

beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_TARGET_ENV", "preview");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "codex/email-preview-brand-refresh");
  vi.stubEnv("VERCEL_URL", previewHost);
  vi.mocked(headers).mockResolvedValue(new Headers({ host: previewHost }));
});

describe("protected synthetic email preview catalogue", () => {
  it.each([
    ["en", "ar", "Email design review"],
    ["ar", "en", "مراجعة تصميم البريد الإلكتروني"],
  ])("renders all 11 fixed samples with the %s review chrome", async (locale, targetLocale, title) => {
    const markup = renderToStaticMarkup(await renderPage(locale));
    expect(markup).toContain(`<h1>${title}</h1>`);
    expect(markup).toContain(`href="/${targetLocale}/staff/email-preview-review"`);
    expect(markup.match(/data-testid="email-preview"/g)).toHaveLength(11);
    expect(markup.match(/data-testid="email-message-arabic"/g)).toHaveLength(11);
    expect(markup).toContain("sample@example.invalid");
    expect(markup).not.toMatch(/<form|<iframe|\/staff\/sign-in|\/api\/staff-portal/);
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect(metadata.robots).toMatchObject({ index: false, follow: false, noarchive: true });
    expect(metadata.title).toBe(`MSRC 2027 | ${title}`);
  });

  it.each([
    ["VERCEL", undefined],
    ["VERCEL_ENV", undefined],
    ["VERCEL_ENV", "production"],
    ["VERCEL_ENV", "development"],
    ["VERCEL_TARGET_ENV", "production"],
    ["VERCEL_TARGET_ENV", "staging"],
    ["VERCEL_GIT_COMMIT_REF", "main"],
    ["VERCEL_GIT_COMMIT_REF", undefined],
    ["VERCEL_URL", undefined],
    ["VERCEL_URL", "msrc-2027.com"],
  ])("returns not found when %s is %s", async (key, value) => {
    vi.stubEnv(key, value);
    await expect(renderPage()).rejects.toThrow("NOT_FOUND");
  });

  it.each([
    "msrc-2027.com",
    "other-preview.vercel.app",
    "msrc-2027-review.vercel.app.example.invalid",
    "localhost:3000",
  ])("returns not found from host %s", async (host) => {
    vi.mocked(headers).mockResolvedValue(new Headers({ host }));
    await expect(renderPage()).rejects.toThrow("NOT_FOUND");
  });

  it("returns not found for unsupported locales", async () => {
    await expect(renderPage("fr")).rejects.toThrow("NOT_FOUND");
  });
});
