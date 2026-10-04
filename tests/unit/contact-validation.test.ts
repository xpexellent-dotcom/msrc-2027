import { describe, expect, it, vi } from "vitest";
import { contactConfig, contactTopics } from "@/config/contact";
import { validateContactSubmission } from "@/features/contact/validation.server";

const valid = {
  topic: "general",
  name: "Synthetic Visitor",
  email: "synthetic.visitor+conference@gmail.com",
  relatedReference: "",
  message: "Question about conference information\nA second line of context.",
  website: "",
};

describe("Contact fixed topic routing (BL-PUB-06 / SUP-01–03)", () => {
  const mapping = [
    ["general", "[MSRC General]", "General"],
    ["registration", "[MSRC Registration]", "Registration"],
    ["abstracts", "[MSRC Abstracts]", "Research & abstracts"],
    ["workshops", "[MSRC Workshops]", "Workshops"],
    ["hackathon", "[MSRC Hackathon]", "Hackathon"],
    ["3mt", "[MSRC 3MT]", "3MT"],
    ["sponsors", "[MSRC Sponsors]", "Sponsors & partners"],
    ["support", "[MSRC Support]", "Website & account support"],
    ["privacy", "[MSRC Privacy]", "Privacy & data requests"],
  ];

  it("retains the exact organizer order, English labels and subject tags with Arabic equivalents", () => {
    expect(contactTopics.map(({ id, tag, label }) => [id, tag, label.en])).toEqual(mapping);
    for (const topic of contactTopics) {
      expect(topic.label.ar).toMatch(/[\u0600-\u06ff]/);
      expect(Object.isFrozen(topic)).toBe(true);
      expect(Object.isFrozen(topic.label)).toBe(true);
    }
    expect(Object.isFrozen(contactTopics)).toBe(true);
    expect(Object.isFrozen(contactConfig)).toBe(true);
    expect(Object.isFrozen(contactConfig.inputBounds)).toBe(true);
    expect(contactConfig).not.toHaveProperty("deliveryEnabled");
  });

  it.each(mapping)("uses trusted destination and sender for %s", (topic, tag) => {
    const result = validateContactSubmission({ ...valid, topic });
    expect(result).toMatchObject({
      ok: true,
      envelope: {
        to: "contact@msrc2027.com",
        from: "no-reply@msrc2027.com",
        replyTo: valid.email,
        subject: `${tag} Question about conference information`,
      },
    });
  });

  it.each(["gmail.com", "outlook.com", "yahoo.com", "example.invalid"])(
    "accepts %s without requiring a business email domain",
    (domain) => expect(validateContactSubmission({ ...valid, topic: "sponsors", email: `visitor+topic@${domain}` }).ok).toBe(true),
  );

  it("preserves bilingual names and message content while normalizing supported form whitespace", () => {
    const result = validateContactSubmission({
      ...valid, name: "  زائر تجريبي  ", email: "  Visitor+label@example.invalid  ",
      relatedReference: "  SYNTHETIC-123  ", message: "  سؤال عن المؤتمر\r\nالسطر الثاني\tللسؤال  ",
    });
    expect(result).toMatchObject({
      ok: true,
      value: { name: "زائر تجريبي", email: "Visitor+label@example.invalid", relatedReference: "SYNTHETIC-123", message: "سؤال عن المؤتمر\nالسطر الثاني\tللسؤال" },
      envelope: { replyTo: "Visitor+label@example.invalid", subject: "[MSRC General] سؤال عن المؤتمر" },
    });
  });

  it("accepts missing or empty optional related reference and honeypot without fabricating a reference", () => {
    const required: Partial<typeof valid> = { ...valid };
    delete required.relatedReference;
    delete required.website;
    expect(validateContactSubmission(required)).toMatchObject({ ok: true, value: { relatedReference: null } });
    expect(validateContactSubmission(valid)).toMatchObject({ ok: true, value: { relatedReference: null } });
  });

  it("derives a short summary from the body instead of accepting a user-supplied subject", () => {
    const message = `${"A".repeat(79)}😀 additional information\nBcc: recipient@example.invalid`;
    const result = validateContactSubmission({ ...valid, message });
    expect(result).toMatchObject({ ok: true, envelope: { subject: `[MSRC General] ${"A".repeat(79)}` } });
    expect(validateContactSubmission({ ...valid, subject: "Caller subject" }).ok).toBe(false);
    expect(validateContactSubmission({ ...valid, summary: "Caller summary" }).ok).toBe(false);
  });
});

describe("Contact independent server validation (SUP-02 / SEC-01)", () => {
  it.each([null, undefined, 1, true, "text", [], new Date(), new Map(), new URL("https://example.invalid")])(
    "rejects non-record input %j without coercion",
    (input) => expect(validateContactSubmission(input)).toEqual({ ok: false, code: "INVALID_CONTACT", fieldErrors: {} }),
  );

  it.each(["topic", "name", "email", "message"] as const)("identifies missing and blank required %s", (field) => {
    const input: Partial<typeof valid> = { ...valid };
    delete input[field];
    expect(validateContactSubmission(input)).toMatchObject({ ok: false, fieldErrors: { [field]: "required" } });
    expect(validateContactSubmission({ ...valid, [field]: field === "topic" ? "" : " \t " })).toMatchObject({ ok: false, fieldErrors: { [field]: "required" } });
  });

  it.each(["name", "email", "relatedReference", "message"] as const)("enforces the engineering input bound for %s", (field) => {
    const limit = contactConfig.inputBounds[field];
    let atLimit: string;
    if (field === "email") {
      atLimit = `${"v".repeat(64)}@${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(61)}`;
      expect(atLimit.length).toBe(limit);
    } else atLimit = "x".repeat(limit);
    expect(validateContactSubmission({ ...valid, [field]: atLimit }).ok).toBe(true);
    expect(validateContactSubmission({ ...valid, [field]: `${atLimit}x` })).toMatchObject({ ok: false, fieldErrors: { [field]: "too_long" } });
    expect(validateContactSubmission({ ...valid, [field]: ` ${atLimit}` })).toMatchObject({ ok: false, fieldErrors: { [field]: "too_long" } });
  });

  it.each(["GENERAL", "scientific", "__proto__", "constructor", "[MSRC General]", "privacy\r\nBcc: evil@example.invalid"])(
    "rejects an unknown topic %j instead of accepting a caller tag",
    (topic) => expect(validateContactSubmission({ ...valid, topic })).toMatchObject({ ok: false, fieldErrors: { topic: "invalid" } }),
  );

  it.each(fieldsAndWrongValues())("rejects non-string %s values", (field, value) => {
    expect(validateContactSubmission({ ...valid, [field]: value })).toEqual({ ok: false, code: "INVALID_CONTACT", fieldErrors: {} });
  });

  it.each(["to", "from", "replyTo", "subject", "summary", "locale", "deliveryEnabled", "consent", "ticketId", "__proto__"])(
    "denies caller-controlled or unknown %s fields",
    (field) => {
      const input = Object.assign(Object.create(null), valid);
      input[field] = "untrusted";
      expect(validateContactSubmission(input)).toEqual({ ok: false, code: "INVALID_CONTACT", fieldErrors: {} });
    },
  );

  it("does not execute getters or use an inherited authority field", () => {
    const getter = vi.fn(() => "untrusted@example.invalid");
    const accessor = { ...valid };
    Object.defineProperty(accessor, "email", { enumerable: true, get: getter });
    expect(validateContactSubmission(accessor).ok).toBe(false);
    expect(getter).not.toHaveBeenCalled();
    expect(validateContactSubmission(Object.create({ ...valid })).ok).toBe(false);
    expect(validateContactSubmission(Object.assign(Object.create(null), valid)).ok).toBe(true);
    expect(validateContactSubmission({ ...valid, [Symbol("unknown")]: "value" }).ok).toBe(false);
  });

  it.each(["name", "email", "relatedReference"] as const)("rejects injected line/control/header characters in %s", (field) => {
    for (const control of ["\r", "\n", "\u0000", "\u001b", "\u007f", "\u0085", "\u2028", "\u2029", "\u202e", "\u2066"]) {
      expect(validateContactSubmission({ ...valid, [field]: `value${control}Bcc: other@example.invalid` }).ok).toBe(false);
    }
  });

  it.each([
    "invalid", "a@@example.invalid", "a@example", "a@.example.invalid", "a@example..invalid",
    ".visitor@example.invalid", "visitor.@example.invalid", "v..name@example.invalid",
    "Visitor <visitor@example.invalid>", "visitor@example.invalid,second@example.invalid",
    "visitor@example.invalid;second@example.invalid", '"visitor"@example.invalid',
    "v isitor@example.invalid", "visitor@-example.invalid", "visitor@example-.invalid",
    `${"v".repeat(65)}@example.invalid`, `v@${"a".repeat(64)}.invalid`,
  ])("rejects unsafe or malformed Reply-To address %j", (email) => {
    expect(validateContactSubmission({ ...valid, email })).toMatchObject({ ok: false, fieldErrors: { email: "invalid" } });
  });

  it("keeps normal multiline body content out of headers", () => {
    const result = validateContactSubmission({ ...valid, message: "Question\r\nBcc: another@example.invalid\r\nMore details" });
    expect(result).toMatchObject({ ok: true, envelope: { subject: "[MSRC General] Question" } });
    if (result.ok) {
      for (const header of Object.values(result.envelope)) expect(header).not.toMatch(/[\r\n\u2028\u2029]/);
      expect(result.value.message).toBe("Question\nBcc: another@example.invalid\nMore details");
    }
  });

  it.each(["\u0000", "\u000b", "\u001b", "\u007f", "\u0085", "\u2028", "\u202e", "\u2069"])(
    "rejects body control/override %j",
    (control) => expect(validateContactSubmission({ ...valid, message: `Question${control}details` }).ok).toBe(false),
  );

  it.each(["https://spam.example.invalid", " ", "\u0000"])("rejects filled honeypot %j generically", (website) => {
    expect(validateContactSubmission({ ...valid, website })).toEqual({ ok: false, code: "INVALID_CONTACT", fieldErrors: {} });
  });

  it("handles a normal multipart form and denies duplicate fields instead of choosing one", () => {
    const form = new FormData();
    for (const [field, value] of Object.entries(valid)) form.set(field, value);
    expect(validateContactSubmission(form).ok).toBe(true);
    for (const duplicate of ["topic", "name", "email", "relatedReference", "message", "website"]) {
      form.append(duplicate, valid[duplicate as keyof typeof valid]);
      expect(validateContactSubmission(form)).toEqual({ ok: false, code: "INVALID_CONTACT", fieldErrors: {} });
      form.delete(duplicate);
      form.set(duplicate, valid[duplicate as keyof typeof valid]);
    }
    form.set("message", new Blob(["attachment"]), "message.txt");
    expect(validateContactSubmission(form).ok).toBe(false);
    form.set("message", valid.message);
    form.set("to", "other@example.invalid");
    expect(validateContactSubmission(form).ok).toBe(false);
  });
});

function fieldsAndWrongValues(): [string, unknown][] {
  return ["topic", "name", "email", "relatedReference", "message", "website"].flatMap((field) =>
    [null, 12, false, [], {}, new String("text")].map((value) => [field, value] as [string, unknown]),
  );
}
