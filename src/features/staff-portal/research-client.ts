"use client";
import type { ResearchPayload, ResearchResponse } from "./research-contract";
export async function requestResearch(payload?: ResearchPayload, options: { area?: "settings" | "screening-settings" | "list" | "reviewers" | "queue" | "packet" | "submission"; assignmentId?: string; submissionId?: string; signal?: AbortSignal } = {}): Promise<ResearchResponse> {
  try {
    const query = new URLSearchParams({ area: options.area ?? "settings", ...(options.assignmentId ? { assignmentId: options.assignmentId } : {}), ...(options.submissionId ? { submissionId: options.submissionId } : {}) });
    const response = await fetch(`/api/staff-portal/research${payload ? "" : `?${query}`}`, { method: payload ? "POST" : "GET", cache: "no-store", credentials: "same-origin", signal: options.signal, ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}) });
    if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable" };
    const value = await response.json() as ResearchResponse; return value && typeof value.state === "string" ? value : { state: "unavailable" };
  } catch { return { state: "unavailable" }; }
}
