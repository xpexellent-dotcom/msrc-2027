"use client";
import type { ContentCollection, ContentPayload, ContentResponse } from "./content-contract";

export async function requestContent(payload?: ContentPayload, options?: { collection?: ContentCollection; itemId?: string; signal?: AbortSignal }): Promise<ContentResponse> {
  try {
    const query = new URLSearchParams(options?.itemId ? { itemId: options.itemId } : { collection: options?.collection ?? "speakers" });
    const response = await fetch(`/api/staff-portal/content${payload ? "" : `?${query}`}`, {
      method: payload ? "POST" : "GET", cache: "no-store", credentials: "same-origin", signal: options?.signal,
      ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
    });
    if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable" };
    const value = await response.json() as ContentResponse;
    return value && typeof value.state === "string" ? value : { state: "unavailable" };
  } catch { return { state: "unavailable" }; }
}
