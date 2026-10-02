import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** A provider contract is not a staff authorization or release gate. */
export const MANAGED_STAFF_MFA_READY = false as const;

type Auth = SupabaseClient["auth"];
export type TotpProviderResult<T> =
  | Readonly<{ state: "ok"; data: T }>
  | Readonly<{ state: "denied" }>
  | Readonly<{ state: "unavailable" }>;

export interface TotpEnrollment {
  readonly factorId: string;
  readonly secret: string;
  readonly uri: string;
}

const identifier = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 128;

/**
 * Typed, injectable SDK boundary for isolated tests and future reviewed integration.
 * There is no configured live client, route, reset/unenroll method or service key here.
 * Callers must separately enforce current identity, assignment, database session policy,
 * durable audit and the live gate. Provider success never authorizes an operation.
 */
export function createSupabaseTotpContract(auth: Auth) {
  return Object.freeze({
    async enroll(): Promise<TotpProviderResult<TotpEnrollment>> {
      try {
        const result = await auth.mfa.enroll({ factorType: "totp", friendlyName: "MSRC staff authenticator" });
        if (result.error) return { state: "unavailable" };
        const data = result.data;
        if (!data || data.type !== "totp" || !identifier(data.id) || !/^[A-Z2-7]{16,128}$/.test(data.totp.secret)
          || !data.totp.uri.startsWith("otpauth://totp/")) return { state: "unavailable" };
        // Provider SVG is not placed into HTML. The future UI generates QR pixels from this URI.
        return { state: "ok", data: { factorId: data.id, secret: data.totp.secret, uri: data.totp.uri } };
      } catch { return { state: "unavailable" }; }
    },
    async challenge(factorId: string): Promise<TotpProviderResult<Readonly<{ challengeId: string }>>> {
      if (!identifier(factorId)) return { state: "denied" };
      try {
        const result = await auth.mfa.challenge({ factorId });
        if (result.error || !result.data || !identifier(result.data.id)) return { state: "unavailable" };
        return { state: "ok", data: { challengeId: result.data.id } };
      } catch { return { state: "unavailable" }; }
    },
    async verify(factorId: string, challengeId: string, code: string): Promise<TotpProviderResult<Readonly<{ providerVerified: true }>>> {
      if (!identifier(factorId) || !identifier(challengeId) || typeof code !== "string" || !/^\d{6}$/.test(code)) return { state: "denied" };
      try {
        const result = await auth.mfa.verify({ factorId, challengeId, code });
        if (result.error) return { state: "denied" };
        if (!result.data || typeof result.data.access_token !== "string" || !result.data.access_token) return { state: "unavailable" };
        // Never return JWTs, refresh tokens, provider errors or an assumed authorized session.
        return { state: "ok", data: { providerVerified: true } };
      } catch { return { state: "unavailable" }; }
    },
  });
}

/** All live enrollment, challenge, verification and factor resets remain closed. */
export async function managedStaffMfa(): Promise<Readonly<{ state: "unavailable"; ready: false }>> {
  return { state: "unavailable", ready: MANAGED_STAFF_MFA_READY };
}
