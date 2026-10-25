"use client";

import type { ParticipantField, ParticipantPayload, ParticipantResponse, ParticipantState } from "./contracts";

const responseStates = new Set<ParticipantState>(["closed", "ready", "accepted", "authenticated", "verified", "password_reset", "signed_out", "invalid_input", "invalid_credentials", "invalid_code", "limited", "unavailable"]);
const fields: ParticipantField[] = ["name", "email", "password", "code", "ageConfirmed"];

function parseResponse(value: unknown): ParticipantResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { state: "unavailable" };
  const record = value as Record<string, unknown>;
  if (!responseStates.has(record.state as ParticipantState)) return { state: "unavailable" };
  const response: ParticipantResponse = { state: record.state as ParticipantState };
  for (const key of ["formToken", "requestId", "expiresAt", "resendAvailableAt"] as const) if (typeof record[key] === "string") response[key] = record[key];
  if (typeof record.retryAfterSeconds === "number" && Number.isSafeInteger(record.retryAfterSeconds) && record.retryAfterSeconds > 0) response.retryAfterSeconds = record.retryAfterSeconds;
  if (record.profile && typeof record.profile === "object") {
    const profile = record.profile as Record<string, unknown>;
    if (typeof profile.name === "string" && profile.accountState === "verified") {
      response.profile = { name: profile.name, accountState: "verified" };
      if (typeof profile.email === "string") response.profile.email = profile.email;
      if (typeof profile.createdAt === "string") response.profile.createdAt = profile.createdAt;
    }
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

/** Non-secret hint that lets the site header ask for the session only when one may exist. */
export const PARTICIPANT_HINT_COOKIE = "msrc-signed-in";
export function hasParticipantHint() { return typeof document !== "undefined" && document.cookie.split(";").some((part) => part.trim() === PARTICIPANT_HINT_COOKIE + "=1"); }
export function setParticipantHint(signedIn: boolean) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = signedIn ? `${PARTICIPANT_HINT_COOKIE}=1; Path=/; Max-Age=28800; SameSite=Strict${secure}` : `${PARTICIPANT_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict${secure}`;
  window.dispatchEvent(new Event("msrc-participant-hint"));
}

export async function requestAccount(payload?: ParticipantPayload, signal?: AbortSignal) {
  const response = await requestResponse(payload, signal);
  // Keep the header hint in step with what the server reports about this session.
  if (response.profile) setParticipantHint(true);
  else if (response.state === "signed_out" || response.state === "closed" || (!payload && response.state === "ready")) setParticipantHint(false);
  return { response, receivedAt: Date.now() };
}

