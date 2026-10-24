"use client";
import type { WorkshopStaffPayload, WorkshopStaffResponse } from "./staff-contract";
export async function requestStaffWorkshops(payload?: WorkshopStaffPayload, signal?: AbortSignal): Promise<WorkshopStaffResponse> {
  try {
    const response = await fetch("/api/staff-portal/workshops", { method: payload ? "POST" : "GET", cache: "no-store", credentials: "same-origin", signal, ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}) });
    if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable" };
    const value: unknown = await response.json(); return value && typeof value === "object" && "state" in value && typeof value.state === "string" ? value as WorkshopStaffResponse : { state: "unavailable" };
  } catch { return { state: "unavailable" }; }
}
