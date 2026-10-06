"use client";
import { useSyncExternalStore } from "react";
import type { StaffArea, StaffPayload, StaffResponse } from "./ui-contract";
import type { Role } from "@/lib/permissions/contract";

type Draft = { email: string; password: string; name: string; code: string; invitationId: string; token: string; inviteEmail: string; inviteRoles: Role[]; enrollment?: StaffResponse["enrollment"] };
const empty: Draft = { email: "", password: "", name: "", code: "", invitationId: "", token: "", inviteEmail: "", inviteRoles: [] };
let draft = empty;
const listeners = new Set<() => void>();
export function updateStaffDraft(next: Partial<typeof empty>) { draft = { ...draft, ...next }; for (const listener of listeners) listener(); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  const clear = () => updateStaffDraft(empty);
  window.addEventListener("pagehide", clear);
  return () => { listeners.delete(listener); window.removeEventListener("pagehide", clear); };
}
/** Transient memory keeps form data during locale changes; never browser storage or logs. */
export function useStaffDraft() { return useSyncExternalStore(subscribe, () => draft, () => empty); }
export function normalizeStaffCode(value: string) { return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))); }
export async function requestStaff(payload?: StaffPayload, options?: { area?: StaffArea; query?: string; signal?: AbortSignal }): Promise<StaffResponse> {
  try {
    const query = options?.area ? "?" + new URLSearchParams({ area: options.area, q: options.query ?? "" }) : "";
    const response = await fetch("/api/staff-portal" + query, { method: payload ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal: options?.signal,
      ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}) });
    if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable" };
    const result = await response.json() as StaffResponse;
    return typeof result.state === "string" ? result : { state: "unavailable" };
  } catch { return { state: "unavailable" }; }
}
