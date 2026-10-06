import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditActionLabel, auditActions, auditResultLabel, auditResults, auditSearchQuery } from "@/features/staff-portal/audit-labels";

function enumValues(path: string, column: string) {
  const source = readFileSync(new URL(`../../supabase/migrations/${path}`, import.meta.url), "utf8");
  const sql = path === "20261006224926_staff_portal_foundation.sql" ? source.slice(source.indexOf("create table msrc_staff.audit")) : source;
  const enumText = sql.match(new RegExp(`${column} text not null check\\s*\\(\\s*${column} in \\(([^)]+)\\)`))?.[1];
  expect(enumText, path).toBeTruthy();
  return [...enumText!.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

describe("LOC-03 bilingual immutable audit labels", () => {
  const actions = [
    ...enumValues("20261006224926_staff_portal_foundation.sql", "action"),
    ...enumValues("20261002173712_persisted_authorization.sql", "event"),
    ...enumValues("20261002193800_staff_mfa_session_foundations.sql", "event"),
    ...enumValues("20261002233353_regular_staff_email_check.sql", "event"),
  ];
  it("covers every current SQL action and result enum in both languages", () => {
    expect(Object.keys(auditActions.en).sort()).toEqual(actions.sort());
    expect(Object.keys(auditActions.ar).sort()).toEqual(Object.keys(auditActions.en).sort());
    expect(Object.keys(auditResults.en).sort()).toEqual(enumValues("20261006224926_staff_portal_foundation.sql", "result").sort());
    expect(Object.keys(auditResults.ar)).toEqual(Object.keys(auditResults.en));
  });
  it.each(actions)("translates %s without exposing codes or details", (action) => {
    expect(auditActionLabel(action, "en")).not.toBe(action);
    expect(auditActionLabel(action, "ar")).toMatch(/[\u0600-\u06ff]/);
    expect(auditActionLabel(action, "ar")).not.toBe(auditActionLabel(action, "en"));
  });
  it.each(Object.keys(auditResults.en))("translates result %s", (result) => {
    expect(auditResultLabel(result, "en")).not.toBe(result);
    expect(auditResultLabel(result, "ar")).toMatch(/[\u0600-\u06ff]/);
  });
  it("retains safe future enum codes and rejects arbitrary fallback text", () => {
    expect(auditActionLabel("future.action", "ar")).toBe("future.action");
    expect(auditResultLabel("future_result", "en")).toBe("future_result");
    for (const value of ["secret=synthetic-password", "<script>alert(1)</script>", "SYNTHETIC SECRET", "a".repeat(100)]) {
      expect(auditActionLabel(value, "en")).toBe("Unknown value");
      expect(auditResultLabel(value, "ar")).toBe("قيمة غير معروفة");
    }
  });
  it.each(["en", "ar"] as const)("%s visible labels map to parameterized enum filters", (locale) => {
    for (const [code, text] of Object.entries(auditActions[locale])) expect(auditSearchQuery(`  ${text.toLocaleUpperCase(locale)}  `, locale)).toBe(code);
    for (const [code, text] of Object.entries(auditResults[locale])) expect(auditSearchQuery(text, locale)).toBe(code);
  });
  it("does not reinterpret ordinary names, partial phrases, codes or arbitrary queries", () => {
    for (const query of ["Synthetic Staff", "Synthetic Create invitation Staff", "grant.created", "invite", "مشارك مصطنع", "'; select 1; --", "name\nvalue"]) {
      expect(auditSearchQuery(query, "en")).toBe(query);
      expect(auditSearchQuery(query, "ar")).toBe(query);
    }
  });
});
