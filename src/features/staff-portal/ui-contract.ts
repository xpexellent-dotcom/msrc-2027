import type { Role } from "@/lib/permissions/contract";

export type StaffScreen = "sign-in" | "accept-invitation" | "home" | "people" | "audit" | "participants" | "security" | "registration" | "priority";
export type StaffArea = "people" | "audit" | "participants" | "registration" | "priority" | "summary" | "registration-detail";
export type StaffProfile = { actorId: string; name: string; roles: Role[] };
export type StaffPerson = { actorId: string; name: string; email: string; roles: Role[]; status: "active" | "suspended"; lastSignIn: string | null; recoveryState?: "none" | "pending" | "failed" | "awaiting_invitation" };
export type StaffInvitation = { id: string; email: string; roles: Role[]; status: "pending" | "accepted" | "revoked" | "expired"; expiresAt: string };
export type StaffAuditRow = { id: string; actorId: string | null; actorName?: string | null; action: string; targetId: string | null; targetName?: string | null; occurredAt: string; result: string };
export type StaffParticipant = { actorId: string; name: string; email: string; status: "unverified" | "verified" | "suspended"; createdAt: string; identityMasked?: string | null };
export type StaffRegistrationStatus = "pending_approval" | "approved" | "approved_awaiting_payment" | "waitlisted" | "offered" | "confirmed" | "cancelled" | "expired";
export type StaffRegistrationRequest = { id: string; actorId: string; name: string; email: string; status: StaffRegistrationStatus; priority: boolean; createdAt: string; decidedAt: string | null; identityMasked: string | null; offerExpiresAt: string | null };
export type StaffRegistrationCounts = { pending: number; approved: number; waitlisted: number; offered: number; expired: number; capacity: number | null; remaining: number | null };
export type StaffRegistrationHistoryRow = { from: StaffRegistrationStatus | null; to: StaffRegistrationStatus; at: string; performerName: string | null };
export type StaffRegistrationDetail = { request: StaffRegistrationRequest; history: StaffRegistrationHistoryRow[] };
export type StaffPriorityRow = { actorId: string; name: string; email: string; active: boolean; reason: string; designatedAt: string; designatedByName: string | null; removedAt: string | null };
export type StaffSummary = { registration?: StaffRegistrationCounts; participants?: number; staff?: number; auditLast24h?: number; priority?: number };
export type StaffAction = "signin" | "logout" | "activity" | "enroll-totp" | "challenge-totp" | "verify-totp" | "challenge-email" | "verify-email" | "invite-accept" | "invite" | "invite-resend" | "invite-revoke" | "roles" | "suspend" | "reactivate" | "revoke-sessions" | "reset-authenticator" | "reset-account" | "reveal-identity" | "password-change" | "registration-approve" | "registration-offer" | "registration-waitlist" | "priority-set" | "priority-remove";
export type StaffPayload = {
  action: StaffAction; formToken?: string; email?: string; password?: string; passwordConfirmation?: string; name?: string;
  code?: string; factorId?: string; challengeId?: string; invitationId?: string; token?: string;
  targetId?: string; roles?: Role[]; reason?: string; requestIds?: string[]; status?: StaffRegistrationStatus | "all";
};
export type StaffState = "ready" | "authenticated" | "pending-email" | "pending-totp" | "enroll-totp" | "closed" | "unavailable" | "identity-unavailable" | "invalid-input" | "invalid-credentials" | "invalid-code" | "denied" | "limited" | "invited" | "updated" | "accepted" | "signed-out" | "password-changed" | "reauthentication-required" | "capacity-not-set" | "payment-configuration-required" | "area-not-ready" | "offer-window-not-set";
export type StaffResponse = {
  state: StaffState; profile?: StaffProfile | null; formToken?: string; challengeId?: string; factorId?: string; passwordChangeAvailable?: boolean;
  expiresAt?: string | number; enrollment?: { factorId: string; secret: string; qrCode: string };
  people?: StaffPerson[]; invitations?: StaffInvitation[]; audit?: StaffAuditRow[]; participants?: StaffParticipant[];
  registration?: { requests: StaffRegistrationRequest[]; counts: StaffRegistrationCounts };
  priority?: { designations: StaffPriorityRow[]; candidates?: StaffParticipant[] }; summary?: StaffSummary;
  registrationDetail?: StaffRegistrationDetail;
  decided?: { approved: number; waitlisted: number; skipped: number; offered?: number };
  /** Client-only: an area read failed while the session read stayed signed in. */
  areaFailure?: StaffState;
  identity?: string; retryAfter?: number;
};
