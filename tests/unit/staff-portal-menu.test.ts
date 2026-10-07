import { describe, expect, it } from "vitest";
import { PERMISSION_RULES, ROLES, type Role } from "@/lib/permissions/contract";
import { canChangeOwnPassword, canRevealIdentity, maskIdentity, STAFF_MENU, staffMenu } from "@/features/staff-portal/menu";
import { staffCopy } from "@/features/staff-portal/copy";

describe("BL-AUTH-01 and BL-RPT-01/03 navigation projection", () => {
  it.each(ROLES)("%s sees only areas projected by the permission contract", (role) => {
    const expected = STAFF_MENU.filter((entry) => !entry.ownAccount && (PERMISSION_RULES[entry.operation].roles.includes(role)
      || role === "superAdmin" && entry.key === "participants")).map((entry) => entry.key);
    expect(staffMenu([role]).map((entry) => entry.key)).toEqual(expected);
  });
  it("is additive without granting a participant general staff access", () => {
    expect(staffMenu(["participant"])).toEqual([]);
    expect(staffMenu(["finance", "contentMediaEditor"]).map((entry) => entry.key)).toEqual(["finance", "content"]);
    expect(staffMenu(["checkInStaff"]).some((entry) => entry.key === "participants")).toBe(false);
  });
  it.each(ROLES)("%s receives own password security only behind its separate availability gate", (role) => {
    expect(canChangeOwnPassword([role])).toBe(role === "superAdmin");
    expect(staffMenu([role]).some((entry) => entry.key === "security")).toBe(false);
    expect(staffMenu([role], { passwordChangeAvailable: false }).some((entry) => entry.key === "security")).toBe(false);
    expect(staffMenu([role], { passwordChangeAvailable: true }).some((entry) => entry.key === "security")).toBe(role === "superAdmin");
  });
  it("keeps assessment areas English only and translates every non-review area and role", () => {
    expect(STAFF_MENU.filter((entry) => entry.englishOnly).map((entry) => entry.key)).toEqual(["review", "faculty-judging"]);
    for (const locale of ["en", "ar"] as const) {
      for (const entry of STAFF_MENU) expect(staffCopy[locale].areas[entry.key]).toBeTruthy();
      for (const role of ROLES) expect(staffCopy[locale].roleLabels[role]).toBeTruthy();
      expect(Object.keys(staffCopy[locale].states)).toEqual(Object.keys(staffCopy.en.states));
      expect(Object.keys(staffCopy[locale].recoveryStates)).toEqual(["none", "pending", "failed", "awaiting_invitation"]);
    }
  });
  it("projects only the final four identifier characters and never short identifiers", () => {
    expect(maskIdentity("SYNTHETIC1234")).toBe("••••••1234");
    expect(maskIdentity("SYN THETIC ١٢٣٤")).toBe("••••••١٢٣٤");
    expect(maskIdentity("123")).toBe("••••••");
    expect(maskIdentity(null)).toBeNull();
  });
  it.each(ROLES)("%s has the expected explicit reveal control policy", (role: Role) => {
    expect(canRevealIdentity([role])).toBe(role === "superAdmin");
  });
});
