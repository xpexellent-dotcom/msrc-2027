import "server-only";
import { randomUUID } from "node:crypto";
import { getParticipantConfig, type ParticipantConfig, type ParticipantReadiness } from "@/features/participant-accounts/config.server";
import { nativeTokenNeedsRefresh, participantCookie, participantHash, participantIp, participantOrigin,
  readParticipantSession } from "@/features/participant-accounts/security.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";
import { participantReady, verifiedClaims } from "@/features/registration/handler.server";
import { certificateObject, certificateUuid, decodeParticipantCertificatePayload, decodeParticipantCertificateResponse } from "@/lib/certificates/contracts";
import { createCertificateParticipantBackend, CertificateRpcMissingError } from "./backend.server";
import { certificateFormToken, readCertificateJson, validCertificateFormToken } from "./security.server";

export const certificatePrivateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0",
  "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
export function createCertificateParticipantHandler(dependencies: { readiness?: () => ParticipantReadiness;
  backend?: (config: ParticipantConfig) => RegistrationBackend; now?: () => number; observeOnly?: boolean; download?: boolean } = {}) {
  return async (request: Request): Promise<Response> => {
    let changedCookie: string | undefined;
    const responseHeaders = () => ({ ...certificatePrivateHeaders, ...(changedCookie ? { "Set-Cookie": changedCookie } : {}) });
    const reply = (state: string, status = 503, extra: Record<string, unknown> = {}) => Response.json({ state, ...extra }, { status, headers: responseHeaders() });
    const getReadiness = dependencies.readiness ?? getParticipantConfig;
    const open = () => process.env.CERTIFICATES_ENABLED === "true" && getReadiness().state === "ready";
    if (!open()) return reply("closed");
    const readiness = getReadiness(); if (readiness.state !== "ready") return reply("closed");
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), url = new URL(request.url);
    const origin = participantOrigin(config, request), site = request.headers.get("sec-fetch-site");
    if (!["GET", "POST"].includes(request.method) || (dependencies.observeOnly || dependencies.download) && request.method !== "GET") return reply("invalid", 405);
    if (!origin || site && !["same-origin", "none"].includes(site) || request.headers.get("origin") && request.headers.get("origin") !== origin
      || request.method === "POST" && request.headers.get("origin") !== origin
      || Array.from(url.searchParams.keys()).some((key) => !["locale", ...(dependencies.download ? ["id"] : [])].includes(key))
      || ![null, "en", "ar"].includes(url.searchParams.get("locale"))) return reply("invalid", 400);
    const backend = (dependencies.backend ?? createCertificateParticipantBackend)(config);
    try {
      if (!await participantReady(config, backend)) return reply("closed");
      let session = readParticipantSession(config, request, now); if (!session) return reply("denied", 401);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        if (dependencies.observeOnly) return reply("denied", 401);
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return reply("denied", 401);
        session = { ...session, ...refreshed }; changedCookie = participantCookie(config, session, now);
      }
      if (await backend.identity(session.accessToken) !== session.actorId) return reply("denied", 401);
      const claims = verifiedClaims(session.accessToken, session.actorId, session.sessionId, now); if (!claims) return reply("denied", 401);
      const args = { edition_key: config.editionKey, session_claims: claims };
      const fresh = () => certificateFormToken(config, origin, session.actorId, session.sessionId, now);
      if (dependencies.download) {
        const id = url.searchParams.get("id"); if (!certificateUuid(id)) return reply("invalid", 400);
        const result = certificateObject(await backend.rpc("msrc_certificates_download", { ...args, certificate_id: id }));
        if (result?.state !== "ready" || typeof result.pdfBase64 !== "string") return reply(result?.state === "denied" ? "denied" : "not_found", 404);
        if (result.pdfBase64.length > 1_333_336 || !/^[A-Za-z0-9+/]+={0,2}$/.test(result.pdfBase64)) return reply("unavailable");
        const pdf = Buffer.from(result.pdfBase64, "base64");
        if (pdf.length > 1_000_000 || !pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) return reply("unavailable");
        return new Response(new Uint8Array(pdf), { headers: { ...responseHeaders(), "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="MSRC-certificate.pdf"' } });
      }
      if (request.method === "POST") {
        let raw: unknown; try { raw = await readCertificateJson(request); } catch { return reply("invalid", 400); }
        const input = decodeParticipantCertificatePayload(raw), token = certificateObject(raw)?.formToken, ip = participantIp(config, request);
        if (!input || !ip || !validCertificateFormToken(config, token, origin, session.actorId, session.sessionId, now)) return reply("invalid", 400, { formToken: fresh() });
        const rate = certificateObject(await backend.rpc("msrc_participant_form_claim", {
          nonce_hash: participantHash(config, "nonce", randomUUID()), ip_hash: participantHash(config, "ip", ip),
        }));
        if (rate?.state !== "claimed") return reply("limited", 429, { formToken: fresh() });
        if (!open()) return reply("closed");
        // No CSRF nonce, operation ID, IP hash or raw request metadata enters S2 storage.
        const result = certificateObject(await backend.rpc("msrc_certificates_participant_manage", { ...args, input }));
        if (!["completed", "saved", "already_completed", "requested", "updated"].includes(String(result?.state))) {
          const state = typeof result?.state === "string" ? result.state : "unavailable";
          return reply(state, state === "denied" ? 403 : state === "closed" ? 503 : 409, { formToken: fresh() });
        }
      }
      if (!open()) return reply("closed");
      const current = decodeParticipantCertificateResponse(await backend.rpc("msrc_certificates_participant_read", args));
      if (!current) return reply("unavailable");
      return Response.json({ ...current, ...(current.state === "ready" ? { formToken: fresh() } : {}) }, {
        status: current.state === "ready" ? 200 : current.state === "denied" ? 403 : 503, headers: responseHeaders(),
      });
    } catch (error) { return reply(error instanceof CertificateRpcMissingError ? "area-not-ready" : "unavailable"); }
  };
}
export const handleCertificateParticipant = createCertificateParticipantHandler();
export const handleCertificateDownload = createCertificateParticipantHandler({ download: true });
