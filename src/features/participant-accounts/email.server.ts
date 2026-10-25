import "server-only";
import { renderParticipantBody } from "@/lib/email/participant-message.server";
import type { ParticipantConfig } from "./config.server";

export type ParticipantCodePurpose = "verify_email" | "reset_password";

/** ENG-083: bilingual code email in the shared branded layout (banner, English, then Arabic RTL). */
export function participantCodeEmail(recipient: string, code: string, purpose: ParticipantCodePurpose) {
  if (!/^[0-9]{6}$/.test(code) || !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(recipient)) throw new Error("Invalid private email envelope");
  const verification = purpose === "verify_email";
  const english = [
    verification ? "Verify your MSRC 2027 email" : "Reset your MSRC 2027 password",
    "Your six-digit code is: " + code,
    "This code expires in 10 minutes and can be used once. Requesting a new code replaces this one. Never share your code.",
    "If you did not request this email, you can ignore it.",
  ];
  const arabic = [
    verification ? "تحقق من بريدك الإلكتروني لمؤتمر MSRC 2027" : "إعادة تعيين كلمة المرور لحسابك في MSRC 2027",
    "رمزك المكوّن من ستة أرقام هو: " + code,
    "تنتهي صلاحية هذا الرمز خلال ١٠ دقائق ويمكن استخدامه مرة واحدة. طلب رمز جديد يلغي هذا الرمز. لا تشارك رمزك مع أحد.",
    "إذا لم تطلب هذه الرسالة، يمكنك تجاهلها.",
  ];
  const { text, html } = renderParticipantBody(english, arabic, []);
  return { from: "MSRC 2027 <no-reply@msrc2027.com>", to: [recipient],
    subject: verification ? "Verify your MSRC 2027 email | تحقق من بريدك الإلكتروني" : "Reset your MSRC 2027 password | إعادة تعيين كلمة المرور",
    text, html };
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
