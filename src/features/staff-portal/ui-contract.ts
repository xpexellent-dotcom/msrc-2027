import type { Role } from "@/lib/permissions/contract";

export type StaffScreen = "sign-in" | "accept-invitation" | "home" | "people" | "audit" | "participants";
export type StaffArea = "people" | "audit" | "participants";
export type StaffProfile = { actorId: string; name: string; roles: Role[] };
export type StaffPerson = { actorId: string; name: string; email: string; roles: Role[]; status: "active" | "suspended"; lastSignIn: string | null };
export type StaffInvitation = { id: string; email: string; roles: Role[]; status: "pending" | "accepted" | "revoked" | "expired"; expiresAt: string };
export type StaffAuditRow = { id: string; actorId: string | null; actorName?: string | null; action: string; targetId: string | null; targetName?: string | null; occurredAt: string; result: string };
export type StaffParticipant = { actorId: string; name: string; email: string; status: "unverified" | "verified" | "suspended"; createdAt: string; identityMasked?: string | null };
export type StaffAction = "signin" | "logout" | "enroll-totp" | "challenge-totp" | "verify-totp" | "challenge-email" | "verify-email" | "invite-accept" | "invite" | "invite-resend" | "invite-revoke" | "roles" | "suspend" | "reactivate" | "revoke-sessions" | "reset-authenticator" | "reset-account" | "reveal-identity";
export type StaffPayload = {
  action: StaffAction; formToken?: string; email?: string; password?: string; name?: string;
  code?: string; factorId?: string; challengeId?: string; invitationId?: string; token?: string;
  targetId?: string; roles?: Role[];
};
export type StaffState = "ready" | "authenticated" | "pending-email" | "pending-totp" | "enroll-totp" | "closed" | "unavailable" | "identity-unavailable" | "invalid-input" | "invalid-credentials" | "invalid-code" | "denied" | "limited" | "invited" | "updated" | "accepted" | "signed-out";
export type StaffResponse = {
  state: StaffState; profile?: StaffProfile | null; formToken?: string; challengeId?: string; factorId?: string;
  expiresAt?: string | number; enrollment?: { factorId: string; secret: string; qrCode: string };
  people?: StaffPerson[]; invitations?: StaffInvitation[]; audit?: StaffAuditRow[]; participants?: StaffParticipant[];
  identity?: string; retryAfter?: number;
};
