"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { formatStaffDate, formatStaffNumber } from "./console-shell";
import { registrationSettingsCopy } from "./registration-settings-copy";
import { parseConferenceDays } from "@/features/attendance/conference-days";
import { registrationSettingsChanges, registrationSettingsComplete, riyadhLocalToTimestamp, timestampToRiyadhLocal } from "./registration-settings-validation";
import type { StaffPayload, StaffRegistrationSettings, StaffRegistrationSettingsAudit, StaffRegistrationSettingsChanges, StaffRegistrationSettingsField, StaffRegistrationSettingsView, StaffResponse, StaffState } from "./ui-contract";

const dateFields = ["priority_start_at", "priority_end_at", "general_opening_at", "closing_at"] as const;
const numberFields = ["general_capacity", "offer_window_hours", "places_remaining_threshold", "waitlist_offer_hours", "confirm_seat_lead_days", "confirm_seat_response_hours", "payment_window_hours"] as const;
type DraftField = typeof dateFields[number] | typeof numberFields[number] | "terms_version" | "conference_days";
type Draft = Record<DraftField, string> & { payment_required: boolean };
type Change = { field: StaffRegistrationSettingsField; before: string | string[] | number | boolean | null; after: string | string[] | number | boolean | null };
type Confirmation = { changes: StaffRegistrationSettingsChanges; rows: Change[]; baseline: string; operationId: string };
type Actions = { busy: boolean; act: (payload: Omit<StaffPayload, "formToken">) => Promise<StaffResponse>; onResult: (text: string) => void };
const emptyView: StaffRegistrationSettingsView = { settings: null, settingsComplete: false, participantAccountsReady: false, history: [] };

function initialDraft(settings: StaffRegistrationSettings | null): Draft {
  return {
    terms_version: settings?.terms_version ?? "", payment_required: settings?.payment_required ?? false,
    conference_days: settings?.conference_days?.join(", ") ?? "",
    ...Object.fromEntries(dateFields.map((field) => [field, timestampToRiyadhLocal(settings?.[field] ?? null)])),
    ...Object.fromEntries(numberFields.map((field) => [field, settings?.[field] == null ? "" : String(settings[field])])),
  } as Draft;
}
function sameValue(left: Change["before"], right: Change["after"], field: string): boolean {
  return left === right || Array.isArray(left) && Array.isArray(right) && left.join(",") === right.join(",")
    || field.endsWith("_at") && typeof left === "string" && typeof right === "string" && Date.parse(left) === Date.parse(right);
}
function settingsValue(value: Change["before"], field: StaffRegistrationSettingsField, locale: Locale): string {
  const text = registrationSettingsCopy[locale];
  if (value === null) return text.none;
  if (Array.isArray(value)) return value.map((day) => new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", {
    dateStyle: "medium", timeZone: "Asia/Riyadh",
  }).format(new Date(day + "T00:00:00Z"))).join(locale === "ar" ? "، " : ", ");
  if (typeof value === "boolean") return field === "payment_required" ? value ? text.paid : text.free : value ? text.open : text.closed;
  if (typeof value === "number") return formatStaffNumber(value, locale);
  return field.endsWith("_at") ? formatStaffDate(value, locale, text.none) : value;
}
function ChangeList({ rows, locale }: { rows: Change[]; locale: Locale }) {
  const text = registrationSettingsCopy[locale];
  return <dl className="staff-settings-changes">{rows.map(({ field, before, after }) => <div key={field}>
    <dt>{text.fields[field]}</dt><dd><span>{text.before}: <bdi>{settingsValue(before, field, locale)}</bdi></span><span>{text.after}: <bdi>{settingsValue(after, field, locale)}</bdi></span></dd>
  </div>)}</dl>;
}
function auditChanges(entry: StaffRegistrationSettingsAudit): Change[] {
  return Object.entries(entry.changes).map(([field, values]) => ({ field: field as StaffRegistrationSettingsField, ...values }));
}

function SettingsEditor({ locale, data, available, busy, act, onResult }: Actions & { locale: Locale; data: StaffRegistrationSettingsView; available: boolean }) {
  const text = registrationSettingsCopy[locale];
  // Untouched fields follow the current read; once editing starts, polling never replaces the owner's draft.
  const [draft, setDraft] = useState<Draft | null>(null), [confirmation, setConfirmation] = useState<Confirmation | null>(null), [message, setMessage] = useState("");
  const values = draft ?? initialDraft(data.settings), baseline = JSON.stringify(data.settings);
  const confirmationHeading = useRef<HTMLHeadingElement>(null), feedback = useRef<HTMLParagraphElement>(null), reviewAction = useRef<HTMLDivElement>(null), restoreFocus = useRef(false);
  useEffect(() => {
    if (confirmation) confirmationHeading.current?.focus();
    else if (restoreFocus.current) { reviewAction.current?.querySelector("button")?.focus(); restoreFocus.current = false; }
  }, [confirmation]);
  useEffect(() => { if (message) feedback.current?.focus(); }, [message]);
  function edit(field: DraftField | "payment_required", value: string | boolean) {
    setDraft({ ...values, [field]: value }); setMessage("");
  }
  function review(event: FormEvent) {
    event.preventDefault(); setMessage("");
    const proposed: Record<string, unknown> = { terms_version: values.terms_version.trim(), payment_required: values.payment_required, minimum_age: 18 };
    proposed.conference_days = parseConferenceDays(values.conference_days);
    if (proposed.conference_days === undefined) { setMessage(text.invalidConferenceDays); return; }
    for (const field of dateFields) proposed[field] = riyadhLocalToTimestamp(values[field]);
    for (const field of numberFields) if (field !== "payment_window_hours" || values.payment_required) proposed[field] = values[field] === "" ? null : Number(values[field]);
    proposed.early_access_start_at = proposed.priority_start_at;
    proposed.early_access_end_at = proposed.priority_end_at;
    const parsed = registrationSettingsChanges(proposed);
    if (!parsed || !registrationSettingsComplete({ ...data.settings, ...parsed })) { setMessage(text.invalid); return; }
    const rows = Object.entries(parsed).flatMap(([field, after]) => {
      const key = field as StaffRegistrationSettingsField, before = data.settings?.[key] ?? null;
      return sameValue(before, after, key) ? [] : [{ field: key, before, after }];
    });
    if (!rows.length) { setMessage(text.unchanged); return; }
    setConfirmation({ rows, changes: Object.fromEntries(rows.map(({ field, after }) => [field, after])), baseline, operationId: crypto.randomUUID() });
  }
  function cancel() { restoreFocus.current = true; setConfirmation(null); }
  async function save() {
    if (!confirmation || confirmation.baseline !== baseline) return;
    const response = await act({ action: "registration-settings-save", changes: confirmation.changes, operationId: confirmation.operationId });
    if (response.state === "updated") { setDraft(null); setMessage(""); restoreFocus.current = true; setConfirmation(null); onResult(text.saved); }
  }
  const numeric = (field: typeof numberFields[number], hint?: string) => <FormField key={field} id={`registration-settings-${field}`} label={text.fields[field]}
    type="number" inputMode="numeric" dir="ltr" min={field === "places_remaining_threshold" || field === "confirm_seat_lead_days" ? 0 : 1} max={2_147_483_647} step={1}
    required={field !== "offer_window_hours"} hint={field === "offer_window_hours" ? `${text.optional}. ${hint ?? ""}` : hint} value={values[field]} onChange={(event) => edit(field, event.target.value)} />;

  return <section className="staff-panel staff-settings-editor" aria-labelledby="staff-settings-edit-title">
    <h2 id="staff-settings-edit-title">{text.title}</h2><p>{text.intro}</p>
    {available && !data.settings ? <p className="staff-note">{text.noSettings}</p> : null}
    {message ? <p ref={feedback} tabIndex={-1} role="alert" className="staff-feedback">{message}</p> : null}
    {confirmation ? <section className="staff-settings-confirmation" aria-labelledby="staff-settings-confirm-title" data-testid="registration-settings-confirmation">
      <h3 id="staff-settings-confirm-title" ref={confirmationHeading} tabIndex={-1}>{text.confirmTitle}</h3>
      <p>{text.confirmHint}</p><p className="field-hint">{text.timezone}</p>
      <ChangeList rows={confirmation.rows} locale={locale} />
      {confirmation.baseline !== baseline ? <p role="alert" className="staff-note">{text.changed}</p> : null}
      <div className="staff-actions"><Button disabled={busy || !available || confirmation.baseline !== baseline} onClick={() => void save()} data-testid="registration-settings-confirm">{text.confirm}</Button>
        <Button variant="secondary" disabled={busy} onClick={cancel} data-testid="registration-settings-cancel">{text.cancel}</Button></div>
    </section> : <form onSubmit={review} aria-busy={busy}>
      <p className="field-hint">{text.required}</p>
      <fieldset className="staff-settings-group" disabled={busy || !available}><legend>{text.basic}</legend>
        <FormField id="registration-settings-terms_version" label={text.fields.terms_version} hint={text.termsHint} maxLength={128} required value={values.terms_version} onChange={(event) => edit("terms_version", event.target.value)} />
        <FormField id="registration-settings-conference_days" label={text.fields.conference_days} hint={text.conferenceDaysHint} dir="ltr" maxLength={371}
          value={values.conference_days} onChange={(event) => edit("conference_days", event.target.value)} />
        <fieldset className="staff-settings-attendance" aria-describedby="registration-settings-payment-hint"><legend>{text.attendance}</legend>
          <div><label htmlFor="registration-settings-free"><input id="registration-settings-free" name="attendance" type="radio" checked={!values.payment_required} onChange={() => edit("payment_required", false)} />{text.free}</label>
            <label htmlFor="registration-settings-paid"><input id="registration-settings-paid" name="attendance" type="radio" checked={values.payment_required} onChange={() => edit("payment_required", true)} />{text.paid}</label></div>
          <p id="registration-settings-payment-hint" className="field-hint">{text.freeHint}</p>
        </fieldset>
        {values.payment_required ? numeric("payment_window_hours", text.paymentHint) : null}
        <div className="staff-settings-grid">{numeric("general_capacity", text.capacityHint)}{numeric("places_remaining_threshold")}
          <FormField id="registration-settings-minimum_age" label={text.fields.minimum_age} hint={text.ageHint} type="number" dir="ltr" value={18} readOnly /></div>
      </fieldset>
      <fieldset className="staff-settings-group" disabled={busy || !available}><legend>{text.schedule}</legend><p id="registration-settings-timezone" className="field-hint">{text.timezone}</p>
        <div className="staff-settings-grid">{dateFields.map((field) => <div className="field" key={field}>
          <label className="field-label" htmlFor={`registration-settings-${field}`}>{text.fields[field]}<span className="field-required" aria-hidden="true"> *</span></label>
          <input className="field-input" id={`registration-settings-${field}`} type="datetime-local" dir="ltr" step="any" required value={values[field]}
            aria-describedby="registration-settings-timezone" onChange={(event) => edit(field, event.target.value)} />
        </div>)}</div><p className="field-hint">{text.earlyHint}</p>
      </fieldset>
      <fieldset className="staff-settings-group" disabled={busy || !available}><legend>{text.timing}</legend>
        {numeric("offer_window_hours", text.offerHint)}<p className="staff-note" id="registration-settings-legacy-hint">{text.legacyHint}</p>
        <div className="staff-settings-grid" aria-describedby="registration-settings-legacy-hint">{numeric("confirm_seat_lead_days")}{numeric("confirm_seat_response_hours")}</div>
      </fieldset>
      <div className="staff-actions" ref={reviewAction}><Button type="submit" disabled={busy || !available} data-testid="registration-settings-review">{text.review}</Button></div>
    </form>}
  </section>;
}

/** Super Admin navigation is independently enforced by the page, handler and exact-session RPC. */
export function RegistrationSettingsPanel({ locale, data, areaFailure, busy, act, onResult }: Actions & { locale: Locale; data?: StaffRegistrationSettingsView; areaFailure?: StaffState }) {
  const text = registrationSettingsCopy[locale], checked = !!data && !areaFailure;
  const readiness = [
    [text.complete, checked ? data.settingsComplete ? text.ready : text.notReady : text.unavailable],
    [text.accounts, checked ? data.participantAccountsReady ? text.ready : text.notReady : text.unavailable],
    [text.registrationSwitch, checked ? data.settings?.enabled ? text.open : text.closed : text.unavailable],
    [text.database, areaFailure === "area-not-ready" ? text.missing : checked ? text.applied : text.unavailable],
  ];
  return <>
    <section className="staff-panel" aria-labelledby="staff-settings-readiness-title" data-testid="registration-settings-readiness">
      <h2 id="staff-settings-readiness-title">{text.readiness}</h2><dl className="staff-settings-readiness">{readiness.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="field-hint">{text.readinessHint}</p>
    </section>
    <SettingsEditor locale={locale} data={data ?? emptyView} available={checked} busy={busy} act={act} onResult={onResult} />
    {checked ? <section className="staff-panel" aria-labelledby="staff-settings-history-title" data-testid="registration-settings-history">
      <h2 id="staff-settings-history-title">{text.history}</h2><p className="field-hint">{text.historyHint}</p>
      {data.history.length ? <ol className="staff-settings-history">{data.history.slice(0, 20).map((entry) => <li key={entry.id} data-testid="registration-settings-history-entry">
        <p><time dateTime={entry.at}>{formatStaffDate(entry.at, locale, text.unknown)}</time><span className="staff-muted">{text.by}: <bdi>{entry.performerName ?? text.unknown}</bdi></span></p>
        {Object.keys(entry.changes).length ? <ChangeList rows={auditChanges(entry)} locale={locale} /> : <p>{text.noFieldChanges}</p>}
      </li>)}</ol> : <p>{text.emptyHistory}</p>}
    </section> : null}
  </>;
}
