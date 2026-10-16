export type RegistrationRequest = { id: string; status: string; createdAt: string };
export type RegistrationState = "ready" | "submitted" | "closed" | "denied" | "invalid_input" | "unavailable" | "limited";
export interface RegistrationResponse {
  state: RegistrationState;
  formToken?: string;
  request?: RegistrationRequest | null;
  termsVersion?: string;
}
