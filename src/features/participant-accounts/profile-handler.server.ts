import "server-only";
import { randomUUID } from "node:crypto";
import { encryptProfileIdentity } from "./profile-identity.server";
import { participantReady, verifiedClaims } from "@/features/registration/handler.server";
import { getParticipantConfig, type ParticipantConfig, type ParticipantReadiness } from "./config.server";
import { createParticipantProfileBackend, avatarObjectPattern, ParticipantProfileRpcMissingError, type ParticipantProfileBackend } from "./profile-backend.server";
import { decodeProfileResponse, type ParticipantProfileResponse } from "./profile-contract";
import { profileFormToken, readProfileFormToken } from "./profile-security.server";
import { readProfileForm, reencodeProfileAvatar, validateProfileForm } from "./profile-validation.server";
import { nativeTokenNeedsRefresh, participantCookie, participantHash, participantIp, participantOrigin, readParticipantSession } from "./security.server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
function projection(value: unknown, token: string): ParticipantProfileResponse {
  const result = record(value), profile = record(result?.profile);
  if (result?.state !== "ready" || !profile || !(profile.avatarObject === null || typeof profile.avatarObject === "string" && avatarObjectPattern.test(profile.avatarObject))) return { state: "unavailable", formToken: token };
  return decodeProfileResponse({ state: "ready", profile: { institution: profile.institution, status: profile.studentStatus, year: profile.studentYear,
    institutionId: profile.institutionId, institutionOther: profile.institutionOther, arabicName: profile.arabicName, nationality: profile.nationality, gender: profile.gender, dateOfBirth: profile.dateOfBirth, city: profile.city, phone: profile.phone, identityType: profile.identityType, identityLast4: profile.identityLast4,
    interests: profile.specialtyInterests, version: profile.version,
    avatarUrl: profile.avatarObject ? "/api/participant-accounts/profile/avatar?v=" + profile.version : null }, specialties: result?.specialties, formToken: token });
}
export function createParticipantProfileHandler(dependencies: {
  readiness?: () => ParticipantReadiness; backend?: (config: ParticipantConfig) => ParticipantProfileBackend; now?: () => number;
} = {}) {
  return async (request: Request): Promise<Response> => {
    let rotated: string | undefined;
    const reply = (body: ParticipantProfileResponse, status = 200) => Response.json(body, { status, headers: { ...privateHeaders, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    // The flag is checked before headers, cookies, body, identity or Storage access.
    if (process.env.PARTICIPANT_PROFILE_ENABLED !== "true") return reply({ state: "closed" }, 503);
    const readiness = (dependencies.readiness ?? getParticipantConfig)();
    if (readiness.state !== "ready") return reply({ state: "closed" }, 503);
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = participantOrigin(config, request);
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site"))
      || request.headers.get("origin") && request.headers.get("origin") !== origin
      || request.method === "POST" && request.headers.get("origin") !== origin) return reply({ state: "invalid_input" }, 400);
    if (!["GET", "POST", "HEAD"].includes(request.method)) return reply({ state: "invalid_input" }, 405);
    const url = new URL(request.url), avatarRequest = url.pathname.endsWith("/avatar");
    if (avatarRequest ? request.method !== "GET" || Array.from(url.searchParams.keys()).some((key) => key !== "v") || url.searchParams.size > 1 || url.searchParams.has("v") && !/^\d+$/.test(url.searchParams.get("v")!)
      : Array.from(url.searchParams.keys()).some((key) => key !== "locale") || url.searchParams.size > 1 || ![null, "en", "ar"].includes(url.searchParams.get("locale"))) return reply({ state: "invalid_input" }, 400);
    const backend = (dependencies.backend ?? createParticipantProfileBackend)(config);
    try {
      if (!await participantReady(config, backend)) return reply({ state: "closed" }, 503);
      let session = readParticipantSession(config, request, now);
      if (!session) return reply({ state: "denied" }, 401);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) {
          rotated = participantCookie(config, null, now); return reply({ state: "denied" }, 401);
        }
        session = { ...session, ...refreshed }; rotated = participantCookie(config, session, now);
      }
      if (await backend.identity(session.accessToken) !== session.actorId) return reply({ state: "denied" }, 401);
      const claims = verifiedClaims(session.accessToken, session.actorId, session.sessionId, now);
      if (!claims) return reply({ state: "denied" }, 401);
      const args = { edition_key: config.editionKey, session_claims: claims };
      const current = record(await backend.rpc("msrc_participant_profile_read", args));
      if (current?.state === "denied") return reply({ state: "denied" }, 403);
      if (current?.state !== "ready" || typeof current.sessionDeadline !== "string"
        || Date.parse(current.sessionDeadline) !== session.deadline) return reply({ state: "unavailable" }, 503);
      const fresh = () => profileFormToken(config, origin, session.actorId, session.sessionId, now);
      if (!Object.hasOwn(record(current.profile) ?? {}, "institutionId")) return reply({ state: "area-not-ready" }, 503);
      const present = projection(current, fresh());
      if (present.state !== "ready") return reply(present, 503);
      if (process.env.PARTICIPANT_PROFILE_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
      if (avatarRequest) {
        const object = record(current.profile)?.avatarObject;
        if (typeof object !== "string") return new Response(null, { status: 404, headers: { ...privateHeaders, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
        const blob = await backend.download(object);
        if (!blob || blob.size > 2 * 1024 * 1024) return reply({ state: "unavailable" }, 503);
        return new Response(blob, { headers: { ...privateHeaders, "Content-Type": "image/webp", "Content-Disposition": "inline; filename=profile.webp", ...(rotated ? { "Set-Cookie": rotated } : {}) } });
      }
      if (request.method === "HEAD") return new Response(null, { headers: { ...privateHeaders, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
      if (request.method === "GET") return reply(present);
      let form: FormData;
      try { form = await readProfileForm(request); } catch { return reply({ state: "invalid_input", formToken: fresh() }, 400); }
      const validated = validateProfileForm(form, present.specialties, present.profile, new Date(now));
      if (!validated.ok) return reply({ state: "invalid_input", fieldErrors: validated.fieldErrors, formToken: fresh() }, 400);
      const input = validated.value, ip = participantIp(config, request);
      if (!ip || !readProfileFormToken(config, input.formToken, origin, session.actorId, session.sessionId, now)) return reply({ state: "invalid_input", formToken: fresh() }, 400);
      const claim = record(await backend.rpc("msrc_participant_form_claim", { nonce_hash: participantHash(config, "nonce", randomUUID()), ip_hash: participantHash(config, "ip", ip) }));
      if (claim?.state !== "claimed") return reply({ state: "limited", formToken: fresh() }, 429);
      const image = input.avatar ? await reencodeProfileAvatar(input.avatar) : null;
      if (input.avatar && !image) return reply({ state: "invalid_input", fieldErrors: { avatar: "invalid" }, formToken: fresh() }, 400);
      if (process.env.PARTICIPANT_PROFILE_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
      const identity = input.identityNumber && input.identityType ? encryptProfileIdentity(session.actorId, config.editionKey, input.identityType, input.identityNumber) : null;
      if (input.identityNumber && !identity) return reply({ state: "area-not-ready", formToken: fresh() }, 503);
      const object = image ? randomUUID() + ".webp" : null;
      let consumed = false;
      try {
        if (object && image) {
          const reserved = record(await backend.rpc("msrc_participant_profile_avatar_reserve", { ...args, object_name: object }));
          if (reserved?.state !== "reserved") return reply({ state: reserved?.state === "denied" ? "denied" : "unavailable", formToken: fresh() }, 503);
          if (!await backend.upload(object, image)) return reply({ state: "unavailable", formToken: fresh() }, 503);
        }
        if (process.env.PARTICIPANT_PROFILE_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
        const saved = record(await backend.rpc("msrc_participant_profile_save", { ...args, profile_input: { institutionId: input.institutionId, institutionOther: input.institutionOther, arabicName: input.arabicName, nationality: input.nationality, gender: input.gender, dateOfBirth: input.dateOfBirth, city: input.city, phone: input.phone,
          status: input.status, interests: input.interests, identity, removeIdentity: input.removeIdentity }, expected_version: input.version, avatar_object: object, remove_avatar: input.removeAvatar }));
        if (saved?.state === "conflict") return reply({ state: "conflict", formToken: fresh() }, 409);
        if (saved?.state === "invalid") return reply({ state: "invalid_input", formToken: fresh() }, 400);
        if (saved?.state === "denied") return reply({ state: "denied", formToken: fresh() }, 403);
        const result = projection(saved, fresh());
        if (saved?.state === "ready") consumed = true;
        if (result.state !== "ready") return reply({ state: "unavailable", formToken: fresh() }, 503);
        // Delete superseded/removed bytes before acknowledging success. Failures
        // retain their durable queue entry and return unavailable for safe retry.
        const previous = record(current.profile)?.avatarObject;
        if (typeof previous === "string" && (object || input.removeAvatar)) {
          if (!await backend.remove(previous)) return reply({ state: "unavailable", formToken: fresh() }, 503);
          await backend.rpc("msrc_participant_profile_avatar_deleted", { object_name: previous });
        }
        return reply(result);
      } finally {
        // An RPC may commit before its response is lost. Atomically abandon
        // only staged objects; never delete a possibly committed active avatar.
        // Lost/revoked-session requests remain in the durable expiry queue.
        if (object && !consumed) {
          try {
            const abandoned = record(await backend.rpc("msrc_participant_profile_avatar_abandon", { ...args, object_name: object }));
            if (abandoned?.state === "queued" && await backend.remove(object)) await backend.rpc("msrc_participant_profile_avatar_deleted", { object_name: object });
          } catch { /* The worker retries durable deletion, without private logs. */ }
        }
      }
    } catch (error) { return reply({ state: error instanceof ParticipantProfileRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleParticipantProfileRequest = createParticipantProfileHandler();
