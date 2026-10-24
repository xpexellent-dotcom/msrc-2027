import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
let pathname = "/en";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => createElement("header", { "data-public-shell": "header" }) }));
vi.mock("@/components/footer", () => ({ Footer: () => createElement("footer", { "data-public-shell": "footer" }) }));
import { SiteShell } from "@/components/site-shell";
function shell(path: string) { pathname = path; const props = { locale: path.startsWith("/ar") ? "ar" as const : "en" as const, children: createElement("h1", null, "Synthetic workspace") }; return renderToStaticMarkup(createElement(SiteShell, props)); }
describe("ENG-077 private competition shell", () => {
  it.each(["/en/reviewer/competitions", "/ar/reviewer/competitions", "/en/judge/competitions", "/ar/judge/competitions/", "/en/staff/competitions", "/ar/staff"]) ("keeps public navigation from covering the private workspace at %s", (path) => { const html = shell(path); expect(html).not.toContain("data-public-shell"); expect(html).toContain('class="staff-main"'); expect(html.match(/<main /g)).toHaveLength(1); expect(html).toContain('href="#main-content"'); });
  it.each(["/en", "/ar/hackathon", "/en/3mt", "/en/entries", "/en/reviewer/competitions-preview", "/ar/judge/other"]) ("preserves the public shell at %s", (path) => { expect(shell(path)).toContain('data-public-shell="header"'); expect(shell(path)).toContain('data-public-shell="footer"'); });
});
