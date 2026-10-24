"use client";
import { decodeCertificateStaffResponse, decodeParticipantCertificateResponse, type CertificateStaffPayload, type CertificateStaffResponse, type ParticipantCertificatePayload, type ParticipantCertificateResponse } from "@/lib/certificates/contracts";

async function request(path: string, payload: unknown, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { method: payload ? "POST" : "GET", cache: "no-store", credentials: "same-origin", signal, ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}) });
  if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable" };
  return response.json();
}
export async function requestStaffCertificates(payload?: CertificateStaffPayload, signal?: AbortSignal): Promise<CertificateStaffResponse> {
  try { return decodeCertificateStaffResponse(await request("/api/staff-portal/certificates", payload, signal)) ?? { state: "unavailable" }; } catch { return { state: "unavailable" }; }
}
export async function requestParticipantCertificates(locale: string, payload?: ParticipantCertificatePayload, signal?: AbortSignal): Promise<ParticipantCertificateResponse> {
  try { return decodeParticipantCertificateResponse(await request("/api/certificates?locale=" + locale, payload, signal)) ?? { state: "unavailable" }; } catch { return { state: "unavailable" }; }
}
