import { describe, expect, it } from "vitest";
import { staffActionSummary, staffCopy } from "@/features/staff-portal/copy";
import { STAFF_MENU, staffMenu } from "@/features/staff-portal/menu";
import { ROLES } from "@/lib/permissions/contract";

describe("Current staff tool guidance", () => {
  it.each(["en", "ar"] as const)("%s has an action phrase for every built tool", (locale) => {
    expect(Object.keys(staffCopy[locale].toolActions).sort()).toEqual(STAFF_MENU.filter((entry) => entry.built).map((entry) => entry.key).sort());
  });
  it("describes Super Admin tools without implying future module access", () => {
    expect(staffActionSummary("en", ["superAdmin"])).toBe("Manage staff access, view audit records, and view participant accounts.");
    expect(staffActionSummary("en", ["superAdmin"], { passwordChangeAvailable: true })).toBe("Change your password, manage staff access, view audit records, and view participant accounts.");
  });
  it.each(ROLES)("%s describes only its current built menu tools in both locales", (role) => {
    for (const locale of ["en", "ar"] as const) {
      for (const available of [false, true]) {
        const menu = staffMenu([role], { passwordChangeAvailable: available }), summary = staffActionSummary(locale, [role], { passwordChangeAvailable: available });
        if (!menu.some((entry) => entry.built)) expect(summary).toBe(staffCopy[locale].toolsSoon);
        for (const [key, phrase] of Object.entries(staffCopy[locale].toolActions)) {
          const contained = summary!.toLocaleLowerCase(locale).includes(phrase.toLocaleLowerCase(locale));
          expect(contained).toBe(menu.some((entry) => entry.built && entry.key === key));
        }
      }
    }
  });
  it("describes the participant list rather than unbuilt registration for its administrator", () => {
    expect(staffActionSummary("en", ["registrationWorkshopAdministrator"])).toBe("View participant accounts.");
    expect(staffActionSummary("ar", ["registrationWorkshopAdministrator"])).toBe("عرض حسابات المشاركين.");
  });
  it("keeps multi-role guidance additive and does not duplicate tools", () => {
    expect(staffActionSummary("en", ["finance", "registrationWorkshopAdministrator", "contentMediaEditor"])).toBe("View participant accounts.");
    expect(staffActionSummary("en", ["superAdmin", "registrationWorkshopAdministrator", "superAdmin"])).toBe(staffActionSummary("en", ["superAdmin"]));
  });
  it("does not invent guidance when no current role exists", () => {
    expect(staffActionSummary("en", [])).toBeNull(); expect(staffActionSummary("ar", [])).toBeNull();
  });
});
