/** Diagnostics are fixed enums only. Never serialize a provider error or payload. */
export function nativeAuthDiagnostic(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const value = error as Record<string, unknown>;
  const status = typeof value.status === "number" && Number.isInteger(value.status) && value.status >= 100 && value.status <= 599 ? value.status : "withheld";
  const codes = ["unexpected_failure", "validation_failed", "user_not_found", "email_exists", "signup_disabled", "email_not_confirmed", "invalid_credentials",
    "hook_execution_error", "hook_timeout", "hook_payload_invalid"];
  const code = typeof value.code === "string" && codes.includes(value.code) ? value.code : "withheld";
  const message = typeof value.message === "string" ? value.message : "";
  const sqlState = ["42501", "23514", "55000", "23505", "40P01"].find((state) => value.code === state || new RegExp("\\b" + state + "\\b").test(message)) ?? "withheld";
  const reasons = [
    ["Bootstrap native prerequisites required.", "bootstrap_prerequisites"],
    ["Staff invitation admission required.", "staff_admission"],
    ["Staff identity recovery requires another Super Admin.", "staff_recovery"],
    ["Database error creating new user", "native_database_creation"],
    ["Database error creating user", "native_database_creation"],
  ] as const;
  const reason = reasons.find(([fragment]) => message.includes(fragment))?.[1] ?? "withheld";
  return ` (Auth status=${status}, code=${code}, SQLSTATE=${sqlState}, reason=${reason})`;
}
export function handlerDiagnostic(value: { status: number; result: { state: string } }): string {
  const states = ["ready", "authenticated", "pending-email", "pending-totp", "enroll-totp", "closed", "unavailable", "invalid-input", "invalid-credentials",
    "invalid-code", "denied", "limited", "invited", "updated", "accepted", "signed-out", "identity-unavailable"];
  const status = Number.isInteger(value.status) && value.status >= 100 && value.status <= 599 ? value.status : "withheld";
  return ` (handler status=${status}, state=${states.includes(value.result.state) ? value.result.state : "withheld"})`;
}
