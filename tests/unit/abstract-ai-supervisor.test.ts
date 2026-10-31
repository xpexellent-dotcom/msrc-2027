import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { ABSTRACT_RUBRIC } from "@/features/staff-portal/abstract-rubric";
import { parseAdvisoryResponse, prepareAdvisoryRequest } from "@/lib/ai-assessment/advisory.server";
import { createDeepSeekProvider } from "@/lib/ai-assessment/deepseek.server";
import { isDraftParticipantTemplate, renderOutboxMessage } from "@/lib/email/outbox.server";
import { supervisorBody } from "@/lib/email/supervisor-message.server";

const identity = { authorNames: ["Synthetic Private Supervisor"], institutions: ["Synthetic Private Institution"] };
const output = () => ({ criteria: ABSTRACT_RUBRIC.map(r => ({ criterionId: r.id, score: 3, rationale: "Synthetic evidence supports this observation." })), gates: [1,2,3,4,5,6].map(gate => ({ gate, observation: "This blinded packet cannot verify identity or confidential ethics evidence." })), overallComment: "Advisory only; explicit human confirmation required." });
const response = (o: unknown) => ({ model: "deepseek-flash", choices: [{ finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(o) } }] });
const parse = (o: unknown) => parseAdvisoryResponse(response(o), 1, ABSTRACT_RUBRIC, identity);
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("uses DeepSeek Chat Completions JSON mode with only the blinded reviewer science and a fixed rubric", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response(output())))); vi.stubGlobal("fetch",fetch);
  const packet = { specialtyId: "internal_medicine", studyTypeId: "cross_sectional", studyTypeOther: "", analysisComplete: true, title: "Synthetic study", body: { background: "Background", objectives: "Objectives", methods: "Methods", results: "Results", limitations: "Limitations", conclusion: "Conclusion" } };
  const prepared = prepareAdvisoryRequest({ ...packet, supervisor: { email: "private@example.invalid" }, confidential: "IRB canary" }, 1, ABSTRACT_RUBRIC, { model: "deepseek-flash", promptVersion: "staff-advisory-org069-v2", thinking: "disabled", maxTokens: 2048 }, identity);
  expect(prepared.ok).toBe(true); if (!prepared.ok) throw new Error("fixture");
  await createDeepSeekProvider({ apiKey: "synthetic-test-credential" }).assess(prepared.request);
  expect(fetch).toHaveBeenCalledWith("https://api.deepseek.com/chat/completions", expect.objectContaining({ method: "POST", redirect: "error", credentials: "omit" }));
  const body = JSON.parse(fetch.mock.calls[0][1].body); expect(body).toMatchObject({ model: "deepseek-flash", response_format: { type: "json_object" }, thinking: { type: "disabled" }, stream: false });
  expect(JSON.parse(body.messages[1].content)).toEqual(packet); expect(JSON.stringify(body)).not.toContain("private@example.invalid"); expect(JSON.stringify(body)).not.toContain("IRB canary"); expect(body.messages[0].content).toContain("G1-G4 are deterministic");
});
it("computes the total in code from all seven integer scores", () => {
  const p = parse(output()); expect(p).toMatchObject({ ok: true, total: 66.67 });
  expect(parse({ ...output(), total: 100 })).toEqual({ ok: false, reason: "invalid_output" });
});
it.each(["missing", "duplicate", "pass", "fractional", "decision", "identity"])("rejects the whole malformed %s response", variant => {
  const o = output(); if (variant === "missing") o.gates.pop(); if (variant === "duplicate") o.gates[5].gate = 1; if (variant === "pass") Object.assign(o.gates[0], { passed: true }); if (variant === "fractional") o.criteria[0].score = 2.5; if (variant === "decision") Object.assign(o, { decision: "accept" }); if (variant === "identity") o.gates[0].observation = identity.authorNames[0];
  expect(parse(o)).toEqual({ ok: false, reason: "invalid_output" });
});
it("matches the owner notification body verbatim, including its source line breaks", () => {
  expect(supervisorBody).toBe(readFileSync(new URL("./fixtures/supervisor-email-owner.txt", import.meta.url), "utf8").replace(/\r\n/g,"\n").trimEnd());
});
const message = { id: "synthetic", template_key: "abstract_supervisor", template_version: 1, locale: "en", recipient_email: "supervisor@example.invalid", payload: { supervisor_name: "Synthetic Full Name", abstract_title: "Synthetic abstract", presenter_name: "Synthetic Presenter" }, attempt_count: 0, lease_token: "synthetic", lease_expires_at: "2026-10-31T06:00:00Z", provider_idempotency_key: "synthetic", provider_request: null, first_attempt_at: "2026-10-31T06:00:00Z" };
it("renders English-only supervisor correspondence using the stored full name and holds all delivery", () => {
  const r = renderOutboxMessage(message); expect(r.text).toBe(supervisorBody.replace("[Last Name]",message.payload.supervisor_name).replace("[Abstract Title]",message.payload.abstract_title).replace("[Presenting Author's Name]",message.payload.presenter_name));
  expect(r.subject).toBe("MSRC'27 abstract submission"); expect(r.to).toEqual([message.recipient_email]); expect(isDraftParticipantTemplate("abstract_supervisor")).toBe(true);
});
it("escapes every substitution once in both MIME parts without interpreting replacement tokens", () => {
  const r = renderOutboxMessage({ ...message, payload: { supervisor_name: "<img src=x>&", abstract_title: '"Title" $&', presenter_name: "O'Name" } });
  for (const part of [r.text,r.html]) { expect(part).toContain("&lt;img src=x&gt;&amp;"); expect(part).toContain("&quot;Title&quot; $&amp;"); expect(part).toContain("O&#39;Name"); expect(part).not.toContain("<img"); }
  expect(() => renderOutboxMessage({ ...message, payload: { ...message.payload, supervisor_name: "Injected\r\nHeader" } })).toThrow();
});
