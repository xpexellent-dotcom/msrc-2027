"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import type { StaffCompetitionEntry, StaffCompetitionResponse } from "./staff-contract";
import { frameworkStaffCopy, hackathonFrameworkCopy } from "./framework-copy";

export { frameworkStaffCopy };

export type HackathonStaffAction = (action: string, payload: Record<string, unknown>) => Promise<StaffCompetitionResponse | void>;

function Form({ title, busy, children, onSubmit, button }: { title: string; busy: boolean; children?: ReactNode; onSubmit: (data: FormData) => void; button: string }) {
  return <form aria-label={title} onSubmit={(event) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget)); }}><fieldset disabled={busy}><legend>{title}</legend>{children}<Button size="small" type="submit">{button}</Button></fieldset></form>;
}
function Input({ id, label, multiline = false, required = true, type = "text" }: { id: string; label: string; multiline?: boolean; required?: boolean; type?: string }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{multiline ? <textarea className="field-input" id={id} name={id} required={required} maxLength={3000} rows={3} /> : <input className="field-input" id={id} name={id} required={required} type={type} maxLength={500} />}</div>;
}

function EnrollmentProof({ locale, entryId, fileId, busy, act }: { locale: Locale; entryId: string; fileId: string; busy: boolean; act: HackathonStaffAction }) {
  const [url, setUrl] = useState<string | null>(null);
  return <div><Button size="small" variant="secondary" disabled={busy} onClick={() => { setUrl(null); void act("file_read", { entryId, fileId }).then((response) => { if (response?.fileTransfer?.fileId === fileId) setUrl(response.fileTransfer.url); }); }}>{locale === "ar" ? "طلب رابط إثبات القيد الخاص" : "Request private enrollment proof"}</Button>{url ? <p><a href={url} target="_blank" rel="noreferrer" referrerPolicy="no-referrer">{locale === "ar" ? "فتح إثبات القيد — ينتهي الرابط خلال دقيقة" : "Open enrollment proof — link expires in one minute"}</a></p> : null}</div>;
}

function ApplicationDetails({ locale, entry }: { locale: Locale; entry: StaffCompetitionEntry }) {
  const c = frameworkStaffCopy[locale], copy = hackathonFrameworkCopy[locale], application = entry.application;
  if (!application) return null;
  const d = application.declarations;
  return <details className="competition-application-declarations"><summary>{locale === "ar" ? "إقرارات الطلب ومراجعه الأصلية" : "Original application declarations and references"}</summary>
    <dl className="staff-detail-facts">{(["previouslyPresented", "competitionEntered", "prizeReceived", "fundingReceived", "commercialized", "aiUsed", "originalityPermissions", "rulesAcknowledged", "ethicsApplicable", "mediaNoticeAcknowledged", "authorityConfirmed"] as const).map((key) => <div key={key}><dt>{copy[key]}</dt><dd>{d[key] ? c.yes : c.no}</dd></div>)}</dl>
    {(["historyDetails", "aiTools", "teamContributions"] as const).map((key) => <section key={key}><h4>{copy[key]}</h4><p lang="en" dir="ltr" className="competition-application-text">{d[key] || "—"}</p></section>)}
    <section><h4>{copy.references}</h4><p lang="en" dir="ltr" className="competition-application-text">{application.references || "—"}</p></section>
    {application.links.length ? <section><h4>{copy.links}</h4><ul lang="en" dir="ltr">{application.links.map((link) => <li key={link}><a href={link} target="_blank" rel="noreferrer" referrerPolicy="no-referrer">{link}</a></li>)}</ul></section> : null}
  </details>;
}

export function HackathonStaffTools({ locale, entry, busy, act, science, committee, identities, eligibility }: { locale: Locale; entry: StaffCompetitionEntry; busy: boolean; act: HackathonStaffAction; science: boolean; committee: boolean; identities: boolean; eligibility: boolean }) {
  const c = frameworkStaffCopy[locale], base = { entryId: entry.id, expectedVersion: entry.version }, prefix = `${entry.id}-framework-`, value = (form: FormData, key: string) => String(form.get(prefix + key) ?? ""), status = entry.framework;
  return <section className="hackathon-framework-tools">
    <ApplicationDetails locale={locale} entry={entry} />
    {identities ? <section className="staff-note"><p>{c.private}</p>{entry.roster.map((member) => <article key={member.id}><h3><bdi>{member.email}</bdi></h3>{member.profile ? <dl className="staff-detail-facts"><div><dt>{c.university}</dt><dd>{member.profile.university}</dd></div><div><dt>{c.field}</dt><dd>{member.profile.fieldOfStudy}</dd></div><div><dt>{c.phone}</dt><dd><bdi>{member.profile.phone}</bdi></dd></div><div><dt>{c.declaration}</dt><dd>{member.profile.enrolledInSaudiUniversity ? c.yes : c.no}</dd></div><div><dt>{c.proof}</dt><dd>{member.profile.proofState ?? c.unset}</dd></div></dl> : <p>{c.profileMissing}</p>}{member.profile?.proofFileId && member.profile.proofState === "clean" ? <EnrollmentProof locale={locale} entryId={entry.id} fileId={member.profile.proofFileId} busy={busy} act={act} /> : null}</article>)}<p>{c.proofClosed}</p></section> : null}
    {status ? <dl className="staff-detail-facts">{([ [c.integrity, status.integrityFlag ? c.yes : c.no], [c.clear, status.committeeCleared ? c.yes : c.no], [c.third, status.thirdReviewRequired ? c.yes : c.no], [c.average, status.screeningAverage ?? "—"], [c.reserveRank, status.reserveRank ?? "—"], [c.confirmed, status.finalistConfirmed ? c.yes : c.no] ] as const).filter(([label]) => science || ![c.average, c.reserveRank].includes(label)).map(([label, val]) => <div key={label}><dt>{label}</dt><dd>{val}</dd></div>)}</dl> : null}
    <div className="competition-entry-tools">
      {eligibility ? <Form title={locale === "ar" ? "إحالة ملاحظة أهلية أو نزاهة للجنة" : "Refer eligibility or integrity concern to committee"} busy={busy} button={c.record} onSubmit={(form) => { void act("eligibility_flag", { ...base, reason: value(form, "eligibilityFlagReason") }); }}><Input id={prefix + "eligibilityFlagReason"} label={c.reason} multiline /></Form> : null}
      {science ? <Form title={c.escalate} busy={busy} button={c.record} onSubmit={(form) => { void act("third_review", { ...base, reason: value(form, "thirdReason") }); }}><Input id={prefix + "thirdReason"} label={c.reason} multiline /></Form> : null}
      {committee ? <>
        <Form title={c.committee} busy={busy} button={c.record} onSubmit={(form) => { void act("committee_review", { ...base, reason: value(form, "committeeReason"), resolution: value(form, "resolution"), integrityFlag: form.get(prefix + "integrity") === "on" }); }}><div className="field"><label htmlFor={prefix + "resolution"}>{c.resolution}</label><select className="field-input" id={prefix + "resolution"} name={prefix + "resolution"} required defaultValue=""><option value="" disabled>{c.unset}</option><option value="hold">{c.hold}</option><option value="clear">{c.cleared}</option></select></div><label className="competition-check"><input id={prefix + "integrity"} name={prefix + "integrity"} type="checkbox" defaultChecked={status?.integrityFlag} />{c.flag}</label><Input id={prefix + "committeeReason"} label={c.reason} multiline /></Form>
        <Form title={c.roster} busy={busy} button={c.record} onSubmit={(form) => { const remove = value(form, "change") === "remove"; void act("roster_change", { ...base, reason: value(form, "rosterReason"), change: remove ? "remove" : "add", ...(remove ? { memberId: value(form, "member") } : { email: value(form, "email") }) }); }}><p>{c.rosterHint}</p><div className="field"><label htmlFor={prefix + "change"}>{c.change}</label><select className="field-input" id={prefix + "change"} name={prefix + "change"}><option value="add">{c.add}</option><option value="remove">{c.remove}</option></select></div><Input id={prefix + "email"} label={c.email} type="email" required={false} /><div className="field"><label htmlFor={prefix + "member"}>{c.member}</label><select className="field-input" id={prefix + "member"} name={prefix + "member"} defaultValue=""><option value="">{c.unset}</option>{entry.roster.filter((member) => !member.isLead).map((member, index) => <option key={member.id} value={member.memberId ?? member.id}>{member.email || `${locale === "ar" ? "عضو" : "Member"} ${index + 1}`}</option>)}</select></div><Input id={prefix + "rosterReason"} label={c.reason} multiline /></Form>
        {entry.status === "accepted" ? <Form title={c.withdraw} busy={busy} button={c.record} onSubmit={(form) => { void act("withdraw", { ...base, reason: value(form, "withdrawReason") }); }}><Input id={prefix + "withdrawReason"} label={c.reason} multiline /></Form> : null}
      </> : null}
      {science && status?.reserveRank ? <Form title={c.offer} busy={busy} button={c.record} onSubmit={(form) => { void act("reserve_offer", { ...base, reason: value(form, "reserveReason") }); }}><p>{c.reserveHint}</p><Input id={prefix + "reserveReason"} label={c.reason} multiline /></Form> : null}
    </div>
    <p>{c.provisional}</p><p>{c.privacy}</p><p>{c.template}</p>
  </section>;
}
