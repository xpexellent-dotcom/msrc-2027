export const PARTICIPANT_ACTIONS = ["signup", "signin", "verify", "resend", "forgot", "reset", "logout"] as const;
export type ParticipantAction = typeof PARTICIPANT_ACTIONS[number];
export type ParticipantState = "closed" | "ready" | "accepted" | "authenticated" | "verified" | "password_reset"
  | "signed_out" | "invalid_input" | "invalid_credentials" | "invalid_code" | "limited" | "unavailable";
export type ParticipantField = "name" | "email" | "password" | "code" | "ageConfirmed";
export interface ApprovedNotice { version: string; url: string; summary: string }
export interface ParticipantProfile { name: string; accountState: "verified" }
export interface ParticipantResponse {
  state: ParticipantState;
  notice?: ApprovedNotice | null;
  profile?: ParticipantProfile | null;
  requestId?: string;
  formToken?: string;
  expiresAt?: string;
  resendAvailableAt?: string;
  retryAfterSeconds?: number;
  fieldErrors?: Partial<Record<ParticipantField, "required" | "invalid" | "too_long">>;
}
export interface ParticipantPayload {
  action: ParticipantAction;
  name?: string;
  email?: string;
  password?: string;
  code?: string;
  ageConfirmed?: boolean;
  requestId?: string;
  formToken?: string;
  website?: string;
}
export interface ParticipantPageState {
  enabled: boolean;
  notice: ApprovedNotice | null;
  profile: ParticipantProfile | null;
  sessionState: "anonymous" | "verification_required" | "authenticated" | "unavailable";
}
