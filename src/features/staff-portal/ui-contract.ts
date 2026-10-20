import type { Role } from "@/lib/permissions/contract";

export type StaffScreen = "sign-in" | "accept-invitation" | "home" | "people" | "audit" | "participants" | "security" | "registration" | "priority" | "early-access" | "registration-settings";
export type StaffArea = "people" | "audit" | "participants" | "registration" | "registration-detail" | "registration-export" | "priority" | "early-access" | "registration-settings" | "summary";
export type StaffProfile = { actorId: string; name: string; roles: Role[] };
export type StaffPerson = { actorId: string; name: string; email: string; roles: Role[]; status: "active" | "suspended"; lastSignIn: string | null; recoveryState?: "none" | "pending" | "failed" | "awaiting_invitation" };
export type StaffInvitation = { id: string; email: string; roles: Role[]; status: "pending" | "accepted" | "revoked" | "expired"; expiresAt: string };
export type StaffAuditRow = { id: string; actorId: string | null; actorName?: string | null; action: string; targetId: string | null; targetName?: string | null; occurredAt: string; result: string };
export type StaffParticipant = { actorId: string; name: string; email: string; status: "unverified" | "verified" | "suspended"; createdAt: string; identityMasked?: string | null };
export type StaffRegistrationStatus = "pending_approval" | "approved" | "approved_awaiting_payment" | "waitlisted" | "offered" | "confirmed" | "cancelled" | "expired";
export type StaffRegistrationRequest = { id: string; actorId: string; name: string; email: string; status: StaffRegistrationStatus; priority: boolean; createdAt: string; decidedAt: string | null; offerExpiresAt: string | null; identityMasked: string | null; ticketStatus?: "issued" | "revoked" | null };
export type StaffRegistrationDetail = {
  request: StaffRegistrationRequest;
  history: { id: string; from: StaffRegistrationStatus | null; to: StaffRegistrationStatus; at: string; performerName: string | null }[];
};
export type StaffRegistrationCounts = { pending: number; approved: number; waitlisted: number; offered: number; expired: number; capacity: number | null; remaining: number | null };
export type StaffPriorityRow = { actorId: string; name: string; email: string; active: boolean; reason: string; designatedAt: string; designatedByName: string | null; removedAt: string | null };
export type StaffEarlyAccessEntry = { id: string; email: string; addedAt: string; addedByName: string | null; hasAccount: boolean; hasRequest: boolean };
export type StaffRegistrationSettings = {
  enabled: boolean; terms_version: string | null; payment_required: boolean | null;
  general_capacity: number | null; default_workshop_capacity: number | null;
  early_access_start_at: string | null; early_access_end_at: string | null;
  priority_start_at: string | null; priority_end_at: string | null;
  general_opening_at: string | null; closing_at: string | null;
  offer_window_hours: number | null; places_remaining_threshold: number | null; minimum_age: number | null;
  waitlist_offer_hours: number | null; confirm_seat_lead_days: number | null;
  confirm_seat_response_hours: number | null; payment_window_hours: number | null;
};
export type StaffRegistrationSettingsField = Exclude<keyof StaffRegistrationSettings, "default_workshop_capacity">;
export type StaffRegistrationSettingsChanges = Partial<Pick<StaffRegistrationSettings, StaffRegistrationSettingsField>>;
export type StaffRegistrationSettingsAudit = { id: string; operationId: string; performerId: string | null; performerName: string | null; at: string;
  changes: Partial<Record<StaffRegistrationSettingsField, { before: string | number | boolean | null; after: string | number | boolean | null }>> };
export type StaffRegistrationSettingsView = { settings: StaffRegistrationSettings | null; settingsComplete: boolean;
  participantAccountsReady: boolean; history: StaffRegistrationSettingsAudit[] };
export type StaffSummary = { registration?: StaffRegistrationCounts; participants?: number; staff?: number; auditLast24h?: number; priority?: number };
export type StaffAction = "signin" | "logout" | "activity" | "enroll-totp" | "challenge-totp" | "verify-totp" | "challenge-email" | "verify-email" | "invite-accept" | "invite" | "invite-resend" | "invite-revoke" | "roles" | "suspend" | "reactivate" | "revoke-sessions" | "reset-authenticator" | "reset-account" | "reveal-identity" | "password-change" | "registration-approve" | "registration-waitlist" | "registration-offer" | "priority-set" | "priority-remove" | "early-access-add" | "early-access-remove" | "registration-settings-save";
export type StaffPayload = {
  action: StaffAction; formToken?: string; email?: string; password?: string; passwordConfirmation?: string; name?: string;
  code?: string; factorId?: string; challengeId?: string; invitationId?: string; token?: string;
  targetId?: string; roles?: Role[]; reason?: string; requestIds?: string[]; status?: StaffRegistrationStatus | "all";
  emails?: string[]; entryIds?: string[]; changes?: StaffRegistrationSettingsChanges; operationId?: string;
};
export type StaffState = "ready" | "authenticated" | "pending-email" | "pending-totp" | "enroll-totp" | "closed" | "unavailable" | "identity-unavailable" | "invalid-input" | "invalid-credentials" | "invalid-code" | "denied" | "limited" | "invited" | "updated" | "accepted" | "signed-out" | "password-changed" | "reauthentication-required" | "capacity-not-set" | "payment-configuration-required" | "offer-window-not-set" | "area-not-ready" | "capacity-below-held" | "enable-not-allowed-here" | "operation-conflict";
export type StaffResponse = {
  state: StaffState; profile?: StaffProfile | null; formToken?: string; challengeId?: string; factorId?: string; passwordChangeAvailable?: boolean;
  expiresAt?: string | number; enrollment?: { factorId: string; secret: string; qrCode: string };
  people?: StaffPerson[]; invitations?: StaffInvitation[]; audit?: StaffAuditRow[]; participants?: StaffParticipant[];
  registration?: { requests: StaffRegistrationRequest[]; counts: StaffRegistrationCounts };
  registrationDetail?: StaffRegistrationDetail;
  registrationSettings?: StaffRegistrationSettingsView; operationId?: string;
  priority?: { designations: StaffPriorityRow[]; candidates?: StaffParticipant[] }; summary?: StaffSummary;
  earlyAccess?: { entries: StaffEarlyAccessEntry[] }; added?: number; removed?: number; invalid?: string[];
  decided?: { approved: number; waitlisted: number; offered?: number; skipped: number };
  /** Client-only: an area read failed while the session read stayed signed in. */
  areaFailure?: StaffState;
  identity?: string; retryAfter?: number;
};
