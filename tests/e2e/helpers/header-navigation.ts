import { expect, type Page } from "@playwright/test";

/** ORG-073. The full bar stays available throughout native scrolling. */
export async function revealDesktopHeader(page: Page) {
  await expect(page.locator(".axiom-header")).not.toHaveAttribute("data-compact");
  await expect(page.locator(".axiom-header .header-middle")).toHaveCSS("opacity", "1");
}

/** Language is directly available in the phone header and in the full desktop bar. */
export async function languageLink(page: Page, name: string) {
  const toggle = page.locator(".menu-toggle");
  if (!await toggle.isVisible()) await revealDesktopHeader(page);
  return page.getByRole("link", { name, exact: true });
}
