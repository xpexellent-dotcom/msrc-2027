import type { Role } from "@/lib/permissions/contract";

export type StaffScreen = "sign-in" | "accept-invitation" | "home" | "people" | "audit" | "participants" | "security" | "registration" | "priority" | "early-access" | "registration-settings" | "email-previews" | "check-in" | "launch-readiness" | "announcements";
export type StaffArea = "people" | "audit" | "participants" | "registration" | "registration-detail" | "registration-export" | "registration-confirmation-preview" | "priority" | "early-access" | "registration-settings" | "email-previews" | "summary" | "check-in" | "launch-readiness";
export type StaffReadinessStatus = "green" | "amber" | "red";
export type StaffLaunchCheckKey = "migrations" | "settings" | "confirmationSettings" | "participantAccounts" | "participantPolicy" | "retention" | "outboxDelivery" | "outboxSweeps" | "outboxCap" | "conferenceDays" | "approvers" | "checkInStaff" | "earlyAccess" | "secondSuperAdmin" | "health" | "latestDrain";
export type StaffLaunchReadiness = {
  checks: { key: StaffLaunchCheckKey; status: StaffReadinessStatus }[];
  environment: { name: string; present: boolean; valid: boolean; enabled?: boolean; status: StaffReadinessStatus }[];
  requiredRpcs: Record<"participantAccounts" | "registration" | "registrationSettings" | "confirmation" | "earlyAccess" | "tickets" | "checkIn" | "outbox" | "health", boolean>;
  staffCounts: Record<Exclude<Role, "participant">, number>;
  earlyAccessCount: number; outboxDailyCap: number; participantEmailDailyLimit: number; superAdminsWithAuthenticatorCount: number;
  registrationEnabled: boolean;
  settings: Pick<StaffRegistrationSettings, "general_capacity" | "priority_start_at" | "priority_end_at" | "general_opening_at" | "closing_at" | "conference_days" | "confirm_seat_lead_days" | "confirm_seat_response_hours"> | null;
};
/** BL-CHK / BL-ATT: day-specific evidence, never certificate eligibility. */
export type StaffCheckInStatus = "checked_in" | "already_checked_in" | "revoked" | "not_found" | "wrong_day" | "not_approved";
export type StaffCheckInResult = { status: StaffCheckInStatus; attendanceId?: string; checkedInAt?: string; performedBy?: string };
export type StaffCheckInView = { conferenceDays: string[] | null; summary: { day: string | null; checkedIn: number; scan: number; manualCode: number } | null };
export type StaffEmailPreview = {
  wordingStatus: "draft"; previewKey: string; templateKey: string; templateVersion: number;
  recipient: string; subject: string; text: string; html: string; englishText: string; arabicText: string;
  banner: { src: string; alt: string; width: number; height: number };
};
export type StaffProfile = { actorId: string; name: string; roles: Role[] };
export type StaffPerson = { actorId: string; name: string; email: string; roles: Role[]; status: "active" | "suspended"; lastSignIn: string | null; recoveryState?: "none" | "pending" | "failed" | "awaiting_invitation" };
export type StaffInvitation = { id: string; email: string; roles: Role[]; status: "pending" | "accepted" | "revoked" | "expired"; expiresAt: string };
export type StaffAuditRow = { id: string; actorId: string | null; actorName?: string | null; action: string; targetId: string | null; targetName?: string | null; occurredAt: string; result: string };
export type StaffParticipant = { actorId: string; name: string; email: string; status: "unverified" | "verified" | "suspended"; createdAt: string; identityMasked?: string | null };
export type StaffRegistrationStatus = "pending_approval" | "approved" | "approved_awaiting_payment" | "waitlisted" | "offered" | "confirmed" | "cancelled" | "expired";
export type StaffConfirmationFilter = "confirmation_awaiting" | "confirmation_confirmed" | "confirmation_released";
export type StaffConfirmationPolicy = "release_unconfirmed" | "keep_unconfirmed";
export type StaffConfirmationPreview = { eligibleCount: number; opensAt: string | null; settingsReady: boolean; canStart: boolean; previewToken: string | null; responseHours: number | null };
export type StaffSeatConfirmation = { state: "awaiting" | "confirmed" | "released" | "kept"; deadline: string };
export type StaffRegistrationRequest = { id: string; actorId: string; name: string; email: string; status: StaffRegistrationStatus; priority: boolean; createdAt: string; decidedAt: string | null; offerExpiresAt: string | null; identityMasked: string | null; ticketStatus?: "issued" | "revoked" | null; confirmation?: StaffSeatConfirmation | null };
export type StaffRegistrationEvent = "request.submitted" | "request.approved" | "request.waitlisted" | "request.offered" | "request.offer_expired" | "request.offer_accepted" | "request.offer_declined" | "request.cancelled" | "request.confirmation_opened" | "request.seat_confirmed" | "request.seat_released" | "request.confirmation_kept" | "ticket.issued" | "ticket.revoked";
export type StaffRegistrationHistoryRow = {
  id: string; event: StaffRegistrationEvent; actorKind: "participant" | "automatic" | "staff";
  from: StaffRegistrationStatus | null; to: StaffRegistrationStatus | null; at: string; performerName: string | null;
};
export type StaffRegistrationDetail = {
  identity: { documentType: "national_id" | "iqama" | "passport"; documentNumber: string } | null;
  request: StaffRegistrationRequest;
  history: StaffRegistrationHistoryRow[];
};
export type StaffRegistrationCounts = { pending: number; approved: number; waitlisted: number; offered: number; expired: number; capacity: number | null; remaining: number | null; confirmationAwaiting?: number; confirmationConfirmed?: number; confirmationReleased?: number };
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
  conference_days: string[] | null;
};
export type StaffRegistrationSettingsField = Exclude<keyof StaffRegistrationSettings, "default_workshop_capacity">;
export type StaffRegistrationSettingsChanges = Partial<Pick<StaffRegistrationSettings, StaffRegistrationSettingsField>>;
export type StaffRegistrationSettingsAudit = { id: string; operationId: string; performerId: string | null; performerName: string | null; at: string;
  changes: Partial<Record<StaffRegistrationSettingsField, { before: string | string[] | number | boolean | null; after: string | string[] | number | boolean | null }>> };
export type StaffRegistrationSettingsView = { settings: StaffRegistrationSettings | null; settingsComplete: boolean;
  participantAccountsReady: boolean; history: StaffRegistrationSettingsAudit[] };
export type StaffSummary = { registration?: StaffRegistrationCounts; participants?: number; staff?: number; auditLast24h?: number; priority?: number };
export type StaffAction = "signin" | "logout" | "activity" | "enroll-totp" | "challenge-totp" | "verify-totp" | "challenge-email" | "verify-email" | "invite-accept" | "invite" | "invite-resend" | "invite-revoke" | "roles" | "suspend" | "reactivate" | "revoke-sessions" | "reset-authenticator" | "reset-account" | "reveal-identity" | "password-change" | "registration-approve" | "registration-waitlist" | "registration-offer" | "priority-set" | "priority-remove" | "early-access-add" | "early-access-remove" | "registration-confirmation-start" | "registration-settings-save" | "check-in" | "check-in-undo";
export type StaffPayload = {
  action: StaffAction; formToken?: string; email?: string; password?: string; passwordConfirmation?: string; name?: string;
  code?: string; factorId?: string; challengeId?: string; invitationId?: string; token?: string;
  targetId?: string; roles?: Role[]; reason?: string; requestIds?: string[]; status?: StaffRegistrationStatus | "all";
  emails?: string[]; entryIds?: string[]; changes?: StaffRegistrationSettingsChanges; operationId?: string;
  nonresponsePolicy?: StaffConfirmationPolicy; previewToken?: string;
  ticketTokenOrReference?: string; conferenceDay?: string; entryPoint?: string; attendanceId?: string;
};
export type StaffState = "ready" | "authenticated" | "pending-email" | "pending-totp" | "enroll-totp" | "closed" | "unavailable" | "identity-unavailable" | "invalid-input" | "invalid-credentials" | "invalid-code" | "denied" | "limited" | "invited" | "updated" | "accepted" | "signed-out" | "password-changed" | "reauthentication-required" | "capacity-not-set" | "payment-configuration-required" | "offer-window-not-set" | "area-not-ready" | "capacity-below-held" | "enable-not-allowed-here" | "operation-conflict" | "confirmation-not-due";
export type StaffResponse = {
  state: StaffState; profile?: StaffProfile | null; formToken?: string; challengeId?: string; factorId?: string; passwordChangeAvailable?: boolean;
  expiresAt?: string | number; enrollment?: { factorId: string; secret: string; qrCode: string };
  people?: StaffPerson[]; invitations?: StaffInvitation[]; audit?: StaffAuditRow[]; participants?: StaffParticipant[];
  registration?: { requests: StaffRegistrationRequest[]; counts: StaffRegistrationCounts };
  registrationDetail?: StaffRegistrationDetail;
  confirmationPreview?: StaffConfirmationPreview; confirmationOpened?: number;
  registrationSettings?: StaffRegistrationSettingsView; operationId?: string;
  emailPreviews?: StaffEmailPreview[];
  launchReadiness?: StaffLaunchReadiness;
  checkIn?: StaffCheckInView; checkInResult?: StaffCheckInResult;
  priority?: { designations: StaffPriorityRow[]; candidates?: StaffParticipant[] }; summary?: StaffSummary;
  earlyAccess?: { entries: StaffEarlyAccessEntry[] }; added?: number; removed?: number; invalid?: string[];
  decided?: { approved: number; waitlisted: number; offered?: number; skipped: number };
  /** Client-only: an area read failed while the session read stayed signed in. */
  areaFailure?: StaffState;
  identity?: string; retryAfter?: number;
};
