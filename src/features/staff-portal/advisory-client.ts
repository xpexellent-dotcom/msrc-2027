"use client";
import type { AdvisoryPayload, AdvisoryResponse } from "./advisory-contract";

export async function requestAdvisory(payload?: AdvisoryPayload, options: { area?: "workspace" | "calibration" | "reviewer" | "submission"; submissionId?: string; assignmentId?: string; signal?: AbortSignal } = {}): Promise<AdvisoryResponse> {
  try {
    const query = new URLSearchParams({ area: options.area ?? "workspace", ...(options.submissionId ? { submissionId: options.submissionId } : {}), ...(options.assignmentId ? { assignmentId: options.assignmentId } : {}) });
    const response = await fetch(`/api/staff-portal/advisory${payload ? "" : `?${query}`}`, { method: payload ? "POST" : "GET", cache: "no-store", credentials: "same-origin", signal: options.signal, ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}) });
    if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable" };
    const value = await response.json() as AdvisoryResponse;
    return value && typeof value.state === "string" ? value : { state: "unavailable" };
  } catch { return { state: "unavailable" }; }
}
