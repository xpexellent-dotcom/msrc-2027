import "server-only";

import { contactConfig, contactTopics, type ContactTopicId } from "@/config/contact";

const fields = ["topic", "name", "email", "relatedReference", "message", "website"] as const;
type InputField = (typeof fields)[number];
export type ContactField = Exclude<InputField, "website">;
type FieldError = "required" | "invalid" | "too_long";

export type ValidatedContact = Readonly<{
  topic: ContactTopicId;
  name: string;
  email: string;
  relatedReference: string | null;
  message: string;
}>;

export type ContactValidation =
  | {
      ok: true;
      value: ValidatedContact;
      // Validated fixed headers; only the server delivery module can send them.
      envelope: Readonly<{ to: string; from: string; replyTo: string; subject: string }>;
    }
  | { ok: false; code: "INVALID_CONTACT"; fieldErrors: Partial<Record<ContactField, FieldError>> };

// Plain single-line fields cannot create additional mail headers. Explicit bidi
// overrides and Unicode line separators are rejected rather than hidden.
const unsafeSingleLine = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;
const unsafeMessage = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;
const localPart = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const domainLabel = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

function invalid(fieldErrors: Partial<Record<ContactField, FieldError>> = {}): ContactValidation {
  return { ok: false, code: "INVALID_CONTACT", fieldErrors };
}

function readFields(input: unknown): Partial<Record<InputField, string>> | null {
  const result: Partial<Record<InputField, string>> = {};
  if (input instanceof FormData) {
    for (const [field, value] of input) {
      if (!fields.includes(field as InputField) || typeof value !== "string" || Object.hasOwn(result, field)) return null;
      result[field as InputField] = value;
    }
    return result;
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== null && prototype !== Object.prototype) return null;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !fields.includes(key as InputField)) return null;
    const property = Object.getOwnPropertyDescriptor(input, key);
    // Do not execute caller getters or accept non-string coercion.
    if (!property || !("value" in property) || typeof property.value !== "string") return null;
    result[key as InputField] = property.value;
  }
  return result;
}

function validEmail(email: string): boolean {
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || !localPart.test(local) || !domain) return false;
  const labels = domain.split(".");
  return labels.length >= 2 && labels.every((label) => label.length <= 63 && domainLabel.test(label)) &&
    /[A-Za-z]/.test(labels.at(-1) ?? "");
}

/** Server validation; the API still never reads a body when delivery is off. */
export function validateContactSubmission(input: unknown): ContactValidation {
  const raw = readFields(input);
  if (!raw) return invalid();
  // A filled trap gets the same generic rejection as other invalid input.
  if (raw.website !== undefined && raw.website !== "") return invalid();

  const fieldErrors: Partial<Record<ContactField, FieldError>> = {};
  const topic = contactTopics.find((candidate) => candidate.id === raw.topic);
  if (!topic) fieldErrors.topic = raw.topic ? "invalid" : "required";

  function text(field: "name" | "email" | "relatedReference" | "message", required: boolean): string {
    const supplied = raw?.[field];
    if (supplied === undefined) {
      if (required) fieldErrors[field] = "required";
      return "";
    }
    const normalized = field === "message" ? supplied.replace(/\r\n?/g, "\n").trim() : supplied.trim();
    if (required && !normalized) fieldErrors[field] = "required";
    // Bound raw input too, so padding cannot bypass the input budget.
    else if (supplied.length > contactConfig.inputBounds[field]) fieldErrors[field] = "too_long";
    else if ((field === "message" ? unsafeMessage : unsafeSingleLine).test(supplied)) fieldErrors[field] = "invalid";
    return normalized;
  }

  const name = text("name", true);
  const email = text("email", true);
  const relatedReference = text("relatedReference", false);
  const message = text("message", true);
  if (!fieldErrors.email && !validEmail(email)) fieldErrors.email = "invalid";
  if (!topic || Object.keys(fieldErrors).length) return invalid(fieldErrors);

  const value: ValidatedContact = {
    topic: topic.id,
    name,
    email,
    relatedReference: relatedReference || null,
    message,
  };
  // Derive a short summary from the first nonempty message line; never accept an
  // independent user subject or let a multiline body become mail headers.
  const firstLine = message.split("\n").find((line) => line.trim()) ?? "";
  const summary = firstLine.replace(/\s+/g, " ").trim()
    .slice(0, contactConfig.inputBounds.subjectSummary).replace(/[\ud800-\udbff]$/, "");
  return {
    ok: true,
    value,
    envelope: {
      to: contactConfig.recipient,
      from: contactConfig.sender,
      replyTo: email,
      subject: `${topic.tag} ${summary}`,
    },
  };
}
