"use client";
import type { MediaFilter, MediaPayload, MediaResponse } from "./media-contract";

export async function requestMedia(payload?: MediaPayload, options?: { query?: string; state?: MediaFilter; signal?: AbortSignal }): Promise<MediaResponse> {
  try {
    const query = payload ? "" : `?${new URLSearchParams({ q: options?.query ?? "", state: options?.state ?? "all" })}`;
    const response = await fetch(`/api/staff-portal/media${query}`, { method: payload ? "POST" : "GET", cache: "no-store", credentials: "same-origin", signal: options?.signal,
      ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}) });
    if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable" };
    const value = await response.json() as MediaResponse;
    return value && typeof value.state === "string" ? value : { state: "unavailable" };
  } catch { return { state: "unavailable" }; }
}

/** The original reaches only a private, server-authorized Storage upload URL. */
export function uploadMediaFile(file: File, signedUrl: string, progress: (percent: number) => void, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const complete = (success: boolean) => { signal.removeEventListener("abort", abort); resolve(success); };
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => complete(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => complete(false);
    xhr.onabort = () => complete(false);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { complete(false); return; }
    xhr.send(file);
  });
}
