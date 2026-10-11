import { expect, type Page } from "@playwright/test";

/** Language lives in the desktop bar and in the phone's explicit Menu disclosure. */
export async function languageLink(page: Page, name: string) {
  const toggle = page.locator(".menu-toggle");
  if (await toggle.isVisible() && await toggle.getAttribute("aria-expanded") !== "true") {
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".mobile-menu")).toBeVisible();
  } else if (!await toggle.isVisible()) {
    // A pointer approaches the visible logo before choosing the collapsed middle.
    // Direct locator.click() checks hit testing before moving the pointer there.
    await page.locator(".axiom-header .wordmark").hover();
    await expect(page.locator(".axiom-header")).toHaveAttribute("data-compact", "false");
  }
  return page.getByRole("link", { name, exact: true });
}
