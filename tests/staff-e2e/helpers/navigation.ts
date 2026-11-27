import { expect, type Page } from "../../helpers/csp";
import { staffCopy } from "../../../src/features/staff-portal/copy";
import type { Locale } from "../../../src/lib/i18n";

export async function openStaffNavigation(page: Page, locale: Locale) {
  const navigation = page.getByRole("navigation", { name: staffCopy[locale].menu, exact: true });
  await expect(navigation).toBeVisible();
  const closedToggle = navigation.locator("details:not([open]) > .staff-nav-toggle:visible");
  if (await closedToggle.isVisible()) await closedToggle.click();
  return navigation;
}
