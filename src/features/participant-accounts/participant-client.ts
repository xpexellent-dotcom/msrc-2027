"use client";

import type { ParticipantField, ParticipantPayload, ParticipantResponse, ParticipantState } from "./contracts";

const responseStates = new Set<ParticipantState>(["closed", "ready", "accepted", "authenticated", "verified", "password_reset", "signed_out", "invalid_input", "invalid_credentials", "invalid_code", "limited", "unavailable"]);
const fields: ParticipantField[] = ["name", "email", "password", "code"];

function parseResponse(value: unknown): ParticipantResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { state: "unavailable" };
  const record = value as Record<string, unknown>;
  if (!responseStates.has(record.state as ParticipantState)) return { state: "unavailable" };
  const response: ParticipantResponse = { state: record.state as ParticipantState };
  for (const key of ["formToken", "requestId", "expiresAt", "resendAvailableAt"] as const) if (typeof record[key] === "string") response[key] = record[key];
  if (typeof record.retryAfterSeconds === "number" && Number.isSafeInteger(record.retryAfterSeconds) && record.retryAfterSeconds > 0) response.retryAfterSeconds = record.retryAfterSeconds;
  if (record.profile && typeof record.profile === "object") {
    const profile = record.profile as Record<string, unknown>;
    if (typeof profile.name === "string" && profile.accountState === "verified") response.profile = { name: profile.name, accountState: "verified" };
  }
  if (record.fieldErrors && typeof record.fieldErrors === "object") {
    response.fieldErrors = {};
    for (const field of fields) {
      const error = (record.fieldErrors as Record<string, unknown>)[field];
      if (error === "required" || error === "invalid" || error === "too_long") response.fieldErrors[field] = error;
    }
  }
  return response;
}

async function requestResponse(payload?: ParticipantPayload, signal?: AbortSignal): Promise<ParticipantResponse> {
  try {
    const response = await fetch("/api/participant-accounts", {
      method: payload ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal,
      ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
    });
    if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable" };
    return parseResponse(await response.json());
  } catch { return { state: "unavailable" }; }
}

export async function requestAccount(payload?: ParticipantPayload, signal?: AbortSignal) {
  const response = await requestResponse(payload, signal);
  return { response, receivedAt: Date.now() };
}

