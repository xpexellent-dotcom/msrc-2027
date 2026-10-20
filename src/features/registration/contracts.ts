export type RegistrationRequest = { id: string; status: string; createdAt: string };
export type RegistrationTicket = { status: "issued" | "revoked"; referenceCode: string; qrDataUrl: string | null };
export interface RegistrationTicketResponse {
  state: "closed" | "denied" | "area-not-ready" | "unavailable" | "ready";
  ticket?: RegistrationTicket | null;
}
export type RegistrationState = "ready" | "submitted" | "closed" | "denied" | "invalid_input" | "unavailable" | "limited";
export interface RegistrationResponse {
  state: RegistrationState;
  formToken?: string;
  request?: RegistrationRequest | null;
  termsVersion?: string;
}
