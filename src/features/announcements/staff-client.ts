"use client";
import type { AnnouncementPayload, AnnouncementResponse } from "./contracts";
export async function requestAnnouncements(payload?: AnnouncementPayload, signal?: AbortSignal): Promise<AnnouncementResponse> {
  try {
    const response = await fetch("/api/staff-portal/announcements", { method: payload ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal,
      ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}) });
    if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable" };
    const value = await response.json() as AnnouncementResponse;
    return value && typeof value.state === "string" ? value : { state: "unavailable" };
  } catch { return { state: "unavailable" }; }
}
