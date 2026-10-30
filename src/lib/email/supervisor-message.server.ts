import "server-only";
import { contactConfig } from "@/config/contact";
import type { EmailRequest } from "./outbox.server";

/** ORG-069 / ENG-091: owner body verbatim, including source line wrapping.
 * Supervisor correspondence is English-only (ORG-059). Subject awaits owner approval.
 * Full supervisor name is retained: a surname cannot safely be inferred.
 */
export const supervisorTemplate = { key: "abstract_supervisor", version: 1, approval: "DRAFT" } as const;
export const supervisorBody = `Dear Dr. [Last Name],

We are writing to inform you that the abstract titled "[Abstract Title]", submitted by
[Presenting Author's Name] for the Medical Students Research Conference (MSRC'27), has
successfully passed the initial evaluation.

As the supervising physician listed in the submission, we wanted to notify you of this application
and keep you informed of the research being submitted under your supervision.

Thank you for your valuable support and contribution to medical student research.

Best regards,
MSRC'27 Abstract Submission Committee
Medical Students Research Conference (MSRC'27)`;
export type SupervisorPayload = { supervisor_name: string; abstract_title: string; presenter_name: string };
export function validSupervisorPayload(p: Record<string, unknown>): p is SupervisorPayload {
  return Object.keys(p).sort().join() === "abstract_title,presenter_name,supervisor_name"
    && Object.entries(p).every(([k,v]) => typeof v === "string" && v.trim().length > 0 && v.length <= (k === "abstract_title" ? 6000 : 500) && !/[\u0000-\u001f\u007f]/.test(v));
}
// Entity-escape substitutions in both MIME parts; substitution callback prevents
// replacement-token interpretation. Plain text never interprets markup or controls.
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function renderSupervisorMessage(payload: SupervisorPayload, recipient: string): EmailRequest {
  const values: Record<string,string> = { "[Last Name]": payload.supervisor_name, "[Abstract Title]": payload.abstract_title, "[Presenting Author's Name]": payload.presenter_name };
  const text = supervisorBody.replace(/\[Last Name\]|\[Abstract Title\]|\[Presenting Author's Name\]/g, key => escape(values[key]));
  return { from: `MSRC 2027 <${contactConfig.sender}>`, to: [recipient], subject: "MSRC'27 abstract submission", text,
    html: `<div lang="en" dir="ltr" style="white-space:pre-wrap">${text}</div>` };
}
