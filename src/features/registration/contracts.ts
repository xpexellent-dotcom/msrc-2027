export type RegistrationRequest = { id: string; status: string; createdAt: string };
export type RegistrationTicket = { status: "issued" | "revoked"; referenceCode: string; qrDataUrl: string | null };
export interface RegistrationTicketResponse {
  state: "closed" | "denied" | "area-not-ready" | "unavailable" | "ready";
  ticket?: RegistrationTicket | null;
}
export type RegistrationState = "ready" | "submitted" | "closed" | "denied" | "area-not-ready" | "invalid_input" | "unavailable" | "limited";
export interface RegistrationResponse {
  state: RegistrationState;
  formToken?: string;
  request?: RegistrationRequest | null;
  termsVersion?: string;
}

export type ParticipantRegistrationStatus = "pending_approval" | "waitlisted" | "offered" | "approved" | "confirmed"
  | "approved_awaiting_payment" | "cancelled" | "expired";
export type MyRegistration = { status: ParticipantRegistrationStatus; createdAt: string; offerExpiresAt: string | null };
export type RegistrationWindow = { state: "early-access" | "scheduled" | "open" | "closed"; eligible: boolean; opensAt: string | null };
export type RegistrationAction = "accept" | "decline" | "cancel";
export type MyRegistrationResponse = {
  state: "ready";
  registration: MyRegistration | null;
  window: RegistrationWindow;
  fewPlacesLeft: boolean;
  serverTime: string;
  formToken: string;
  ticket: RegistrationTicket | null;
  outcome?: "updated" | "expired" | "conflict";
} | {
  state: "closed" | "denied" | "area-not-ready" | "unavailable" | "invalid_input" | "limited";
  formToken?: string;
};
