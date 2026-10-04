import "server-only";
import type { ParticipantConfig } from "./config.server";

export type ParticipantCodePurpose = "verify_email" | "reset_password";
export function participantCodeEmail(recipient: string, code: string, purpose: ParticipantCodePurpose) {
  if (!/^[0-9]{6}$/.test(code) || !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(recipient)) throw new Error("Invalid private email envelope");
  const verification = purpose === "verify_email";
  return { from: "MSRC 2027 <no-reply@msrc2027.com>", to: [recipient],
    subject: verification ? "Verify your MSRC 2027 email" : "Reset your MSRC 2027 password",
    text: [verification ? "Verify your MSRC 2027 email" : "Reset your MSRC 2027 password", "",
      "Your six-digit code is: " + code, "", "This code expires in 10 minutes and can be used once.",
      "Requesting a new code replaces this one. Never share your code.",
      "If you did not request this email, you can ignore it."].join("\n") };
}
export async function deliverParticipantCode(config: ParticipantConfig, recipient: string, code: string,
  purpose: ParticipantCodePurpose, challengeId: string): Promise<boolean> {
  if (config.testMode && !recipient.endsWith("@example.invalid")) return false;
  try {
    const response = await fetch(config.resendUrl, { method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000),
      headers: { Authorization: "Bearer " + config.resendKey, "Content-Type": "application/json", "Idempotency-Key": "participant/" + challengeId },
      body: JSON.stringify(participantCodeEmail(recipient, code, purpose)) });
    const accepted = response.ok;
    await response.body?.cancel();
    return accepted;
  } catch { return false; }
}
