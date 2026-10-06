import "server-only";
import type { StaffConfig } from "./config.server";

const email = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;
export function staffInvitationEmail(recipient: string, url: string) {
  if (!email.test(recipient) || recipient.length > 254) throw new Error("Invalid invitation envelope");
  const link = new URL(url);
  if (!((link.protocol === "https:" && ["msrc2027.com", "www.msrc2027.com"].includes(link.hostname))
    || link.origin === "http://127.0.0.1:3219") || link.pathname !== "/en/staff/accept-invitation"
    || link.search || !/^#invitation=[0-9a-f-]{36}&token=[A-Za-z0-9_-]{43}$/.test(link.hash)) throw new Error("Invalid invitation URL");
  return { from: "MSRC 2027 <no-reply@msrc2027.com>", to: [recipient], subject: "Your MSRC 2027 staff invitation",
    text: ["You have been invited to the MSRC 2027 staff portal.", "", "Set your password and complete your required second step:", url,
      "", "This single-use invitation expires in 72 hours. A replacement invitation invalidates the earlier link.",
      "Do not forward this invitation. If you were not expecting it, contact the inviting administrator."].join("\n") };
}
export async function deliverStaffMessage(config: StaffConfig, recipient: string, subject: string, text: string, id: string): Promise<boolean> {
  if (!email.test(recipient) || recipient.length > 254 || /[\r\n]/.test(subject)
    || (config.testMode && !recipient.endsWith("@example.invalid"))) return false;
  try {
    const response = await fetch(config.resendUrl, { method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000),
      headers: { Authorization: "Bearer " + config.resendKey, "Content-Type": "application/json", "Idempotency-Key": "staff/" + id },
      body: JSON.stringify({ from: "MSRC 2027 <no-reply@msrc2027.com>", to: [recipient], subject, text }) });
    const accepted = response.ok; await response.body?.cancel(); return accepted;
  } catch { return false; }
}
