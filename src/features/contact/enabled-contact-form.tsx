"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type InvalidEvent } from "react";
import { FormField, FieldMessages } from "@/components/forms/form-field";
import { Select } from "@/components/forms/select";
import { Button } from "@/components/ui/button";
import { contactConfig, contactTopics } from "@/config/contact";
import { contactCopy } from "@/features/contact/contact-copy";
import type { Locale } from "@/lib/i18n";

const fields = ["topic", "name", "email", "relatedReference", "message"] as const;
type ContactField = (typeof fields)[number];
type FieldError = "required" | "invalid" | "too_long";
type FieldErrors = Partial<Record<ContactField, FieldError>>;
type Status = "idle" | "sending" | "preparing" | "sent" | "invalid" | "limited" | "tooFast" | "expired" | "unavailable" | "unconfirmed";

const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Read only safe result fields. Never display raw provider/server text or PII. */
function safeFieldErrors(value: unknown): FieldErrors {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: FieldErrors = {};
  for (const field of fields) {
    const code = (value as Record<string, unknown>)[field];
    if (code === "required" || code === "invalid" || code === "too_long") result[field] = code;
  }
  return result;
}

function resultRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function EnabledContactForm({ locale, token: initialToken, testOnly = false }: { locale: Locale; token: string; testOnly?: boolean }) {
  const copy = contactCopy[locale];
  const bounds = contactConfig.inputBounds;
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [needsToken, setNeedsToken] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const currentToken = useRef(initialToken);
  const inFlight = useRef(false);
  const cooldown = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (cooldown.current) clearTimeout(cooldown.current); }, []);

  const busy = status === "sending" || status === "preparing";
  const frozen = !hydrated || busy || status === "sent" || status === "unconfirmed";
  const error = (field: ContactField) => fieldErrors[field] ? copy.fieldErrors[fieldErrors[field]!] : undefined;

  function applyWait(value: unknown) {
    if (cooldown.current) clearTimeout(cooldown.current);
    const seconds = typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
    setRetryAfter(seconds);
    setWaiting(seconds !== null);
    if (seconds !== null) cooldown.current = setTimeout(() => setWaiting(false), Math.min(seconds * 1_000, 2_147_483_647));
  }

  function unconfirmed() {
    setStatus("unconfirmed");
    setNeedsToken(true);
    setDuplicateWarning(true);
  }

  function focusFirstError(errors: FieldErrors) {
    const first = fields.find((field) => errors[field]);
    if (!first) return;
    requestAnimationFrame(() => {
      const control = form.current?.elements.namedItem(first);
      if (control instanceof HTMLElement) control.focus();
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || inFlight.current || waiting || needsToken || frozen) return;
    inFlight.current = true;
    const data = new FormData(event.currentTarget);
    const submission = Object.fromEntries([...fields, "website"].map((field) => [field, data.get(field) ?? ""]));
    setFieldErrors({});
    setStatus("sending");
    setRetryAfter(null);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ locale, token: currentToken.current, submission }),
      });
      const result = resultRecord(await response.json());
      if (response.ok && result.state === "sent") {
        form.current?.reset();
        setStatus("sent");
        setNeedsToken(true);
        setDuplicateWarning(false);
      } else if (result.code === "CONTACT_INVALID_TOKEN") {
        setStatus("expired");
        setNeedsToken(true);
      } else if (result.code === "CONTACT_TOO_FAST") {
        setStatus("tooFast");
        setNeedsToken(false);
        applyWait(result.retryAfter);
      } else if (result.state === "invalid") {
        const errors = safeFieldErrors(result.fieldErrors);
        setFieldErrors(errors);
        setStatus("invalid");
        focusFirstError(errors);
      } else if (result.state === "limited") {
        if (result.code === "CONTACT_ATTEMPT_USED") unconfirmed();
        else {
          setStatus("limited");
          setNeedsToken(true);
        }
        applyWait(result.retryAfter);
      } else if (result.code === "CONTACT_DELIVERY_UNCONFIRMED") {
        unconfirmed();
      } else if (result.state === "closed" || result.state === "unavailable") {
        setStatus("unavailable");
        setNeedsToken(true);
      } else {
        unconfirmed();
      }
    } catch {
      // A response may have been lost after provider acceptance. Never replay
      // automatically, rotate silently or claim a confirmed delivery failure.
      unconfirmed();
    } finally {
      inFlight.current = false;
    }
  }

  async function prepareAttempt() {
    if (inFlight.current || waiting) return;
    inFlight.current = true;
    setStatus("preparing");
    try {
      const response = await fetch(`/api/contact?locale=${locale}`, { cache: "no-store", credentials: "same-origin" });
      const result = resultRecord(await response.json());
      if (response.ok && result.state === "ready" && typeof result.token === "string" && result.token) {
        currentToken.current = result.token;
        setNeedsToken(false);
        setStatus("idle");
        setRetryAfter(null);
        setFieldErrors({});
      } else {
        setStatus(duplicateWarning ? "unconfirmed" : "unavailable");
      }
    } catch {
      setStatus(duplicateWarning ? "unconfirmed" : "unavailable");
    } finally {
      inFlight.current = false;
    }
  }

  function nativeInvalid(event: InvalidEvent<HTMLFormElement>) {
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
    if (fields.includes(control.name as ContactField)) {
      setFieldErrors((previous) => ({ ...previous, [control.name]: control.validity.valueMissing ? "required" : "invalid" }));
      setStatus("invalid");
    }
  }

  const notice = {
    invalid: { title: copy.invalid, body: copy.invalidBody },
    limited: { title: copy.limited, body: copy.limitedBody },
    tooFast: { title: copy.tooFast, body: copy.tooFastBody },
    expired: { title: copy.expired, body: copy.expiredBody },
    unavailable: { title: copy.unavailable, body: copy.unavailableBody },
    unconfirmed: { title: copy.unconfirmed, body: copy.unconfirmedBody },
  };
  const failure = status in notice ? notice[status as keyof typeof notice] : null;
  const buttonLabel = status === "sent" ? copy.anotherMessage : status === "expired" ? copy.startNewAttempt : needsToken ? duplicateWarning ? copy.startNewAttempt : copy.retry : copy.send;

  return (
    <form
      ref={form} className="contact-form contact-form--enabled" aria-labelledby="contact-form-title"
      aria-describedby="contact-delivery-intro contact-delivery-processing contact-required-hint" onSubmit={submit} onInvalidCapture={nativeInvalid}
      onChangeCapture={(event) => {
        const control = event.target;
        if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
          setFieldErrors((previous) => { const next = { ...previous }; delete next[control.name as ContactField]; return next; });
        }
      }}
    >
      {testOnly ? <p className="contact-test-only" role="note" data-contact-test-only>{copy.testOnly}</p> : null}
      <p id="contact-delivery-intro" className="contact-delivery-intro">{copy.deliveryIntro}</p>
      <p id="contact-delivery-processing" className="contact-processing-note">{copy.deliveryProcessing}</p>
      {/* Keep the fallback real SSR text: client-component noscript children
          are not reliably readable in the streamed document without JS. */}
      <p className="contact-closed-note" hidden={hydrated} data-contact-no-script>{copy.noScript}</p>
      <div className="contact-delivery-status" role="status" aria-live="polite" aria-atomic="true" data-contact-status={status}>
        {busy ? <p>{status === "sending" ? copy.sending : copy.preparing}</p> : status === "sent" ? <p className="contact-delivery-success">{copy.sent}</p> : null}
      </div>
      <div className="contact-delivery-error" role="alert" aria-atomic="true">
        {failure ? <div className="contact-delivery-note"><h3>{failure.title}</h3><p>{failure.body}</p>
          {waiting && retryAfter ? <p>{copy.retryTiming} {new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(retryAfter, "second")}.</p> : null}
        </div> : null}
      </div>
      {duplicateWarning ? <p className="contact-duplicate-warning" id="contact-duplicate-warning">{copy.duplicateWarning}</p> : null}
      <p id="contact-required-hint" className="contact-required-hint">{copy.requiredHint}</p>
      <fieldset disabled={frozen} aria-describedby="contact-required-hint" className="contact-fields">
        <legend className="sr-only">{copy.fieldsLegend}</legend>
        <div className="contact-field-wide">
          <Select id="contact-topic" name="topic" label={copy.topic} defaultValue="" required error={error("topic")}>
            <option value="">{copy.chooseTopic}</option>
            {contactTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.label[locale]}</option>)}
          </Select>
        </div>
        <FormField id="contact-name" name="name" label={copy.name} autoComplete="name" maxLength={bounds.name} required error={error("name")} />
        <FormField id="contact-email" name="email" type="email" label={copy.email} autoComplete="email" dir="ltr" maxLength={bounds.email} required error={error("email")} />
        <div className="contact-field-wide">
          <FormField id="contact-reference" name="relatedReference" label={copy.relatedReference} hint={copy.relatedReferenceHint} autoComplete="off" maxLength={bounds.relatedReference} error={error("relatedReference")} />
        </div>
        <div className="field contact-field-wide">
          <label className="field-label" htmlFor="contact-message">{copy.message}<span className="field-required" aria-hidden="true"> *</span></label>
          <textarea id="contact-message" name="message" className="field-input contact-message" rows={6} maxLength={bounds.message} required aria-invalid={Boolean(fieldErrors.message)} aria-describedby={fieldErrors.message ? "contact-message-error" : undefined} />
          <FieldMessages id="contact-message" label={copy.message} error={error("message")} />
        </div>
        <div hidden aria-hidden="true">
          <label htmlFor="contact-website">{copy.website}</label>
          <input id="contact-website" name="website" type="text" autoComplete="off" tabIndex={-1} />
        </div>
      </fieldset>
      <Button
        type={needsToken ? "button" : "submit"} disabled={!hydrated || busy || waiting}
        loading={busy} loadingLabel={status === "preparing" ? copy.preparing : copy.sending}
        onClick={needsToken ? prepareAttempt : undefined}
        aria-describedby={duplicateWarning ? "contact-duplicate-warning" : undefined}
      >{buttonLabel}</Button>
    </form>
  );
}
