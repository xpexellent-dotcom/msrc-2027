import { PERMISSION_RULES, ROLES, type Operation, type Role } from "@/lib/permissions/contract";
import type { StaffArea } from "./ui-contract";

export const STAFF_ROLES = ROLES.filter((role) => role !== "participant");
export type StaffMenuKey = StaffArea | "registration" | "finance" | "check-in" | "review" | "science" | "judging" | "faculty-judging" | "content" | "sponsorship";
type MenuDefinition = { key: StaffMenuKey; operation: Operation; built: boolean; englishOnly?: boolean };
export const STAFF_MENU: readonly MenuDefinition[] = [
  { key: "people", operation: "security.grant.manage", built: true },
  { key: "audit", operation: "security.audit.read", built: true },
  { key: "participants", operation: "operations.registration.manage", built: true },
  { key: "registration", operation: "operations.registration.manage", built: false },
  { key: "finance", operation: "finance.reconciliation.read", built: false },
  { key: "check-in", operation: "checkIn.entitlement.read", built: false },
  { key: "review", operation: "review.packet.read", built: false, englishOnly: true },
  { key: "science", operation: "science.assignment.manage", built: false },
  { key: "judging", operation: "judging.readiness.manage", built: false },
  { key: "faculty-judging", operation: "judging.material.read", built: false, englishOnly: true },
  { key: "content", operation: "content.draft.manage", built: false },
  { key: "sponsorship", operation: "sponsorship.inquiry.manage", built: false },
];

/** Navigation projection only. APIs and RLS independently recheck current scoped grants. */
export function staffMenu(roles: readonly Role[]) {
  return STAFF_MENU.filter((item) => PERMISSION_RULES[item.operation].roles.some((role) => roles.includes(role))
    || (item.key === "participants" && roles.includes("superAdmin")));
}

/** Future registration identifiers must reach the client masked, never as raw values. */
export function maskIdentity(value: string | null | undefined): string | null {
  if (!value) return null;
  const compact = value.replace(/\s/g, "");
  return compact.length >= 4 ? `••••••${compact.slice(-4)}` : "••••••";
}
export function canRevealIdentity(roles: readonly Role[]): boolean { return roles.includes("superAdmin"); }
