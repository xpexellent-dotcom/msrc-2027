"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { CompetitionCriterion, HackathonTrackSettings, SettingValue } from "./staff-contract";
import { decodeTrackSettings } from "./framework-staff-contract";
import { frameworkStaffCopy } from "./framework-copy";

function JsonField({ id, label, value, onChange, locale }: { id: string; label: string; value: unknown; onChange: (next: unknown) => void; locale: Locale }) {
  const [draft, setDraft] = useState(() => JSON.stringify(value ?? [], null, 2));
  return <div className="field"><label htmlFor={id}>{label}</label><textarea id={id} className="field-input" lang="en" dir="ltr" rows={6} maxLength={40000} value={draft} onChange={(event) => {
    setDraft(event.target.value);
    try { const next: unknown = JSON.parse(event.target.value); if (!Array.isArray(next)) throw new Error("array"); event.target.setCustomValidity(""); onChange(next); } catch { event.target.setCustomValidity(frameworkStaffCopy[locale].invalidJson); }
  }} /></div>;
}

/** Metadata is part of the versioned rubric snapshot, so edits travel with assignments. */
export function RubricMetadataEditor({ row, id, locale, onChange }: { row: CompetitionCriterion; id: string; locale: Locale; onChange: (next: CompetitionCriterion) => void }) {
  const c = frameworkStaffCopy[locale];
  return <details className="competition-rubric-metadata"><summary>{c.questions} / {c.scale}</summary>
    <div className="field"><label htmlFor={id + "-version"}>{c.rubricVersion}</label><input id={id + "-version"} className="field-input" lang="en" dir="ltr" maxLength={100} value={row.rubricVersion ?? ""} onChange={(event) => { const next = { ...row }; if (event.target.value) next.rubricVersion = event.target.value; else delete next.rubricVersion; onChange(next); }} /></div>
    <div className="field"><label htmlFor={id + "-questions"}>{c.questions}</label><textarea id={id + "-questions"} className="field-input" lang="en" dir="ltr" rows={3} maxLength={12000} value={row.questions?.join("\n") ?? ""} onChange={(event) => onChange({ ...row, questions: event.target.value.split("\n").filter(Boolean) })} /></div>
    <JsonField id={id + "-scale"} label={c.scale} value={row.scale} locale={locale} onChange={(scale) => onChange({ ...row, scale: scale as CompetitionCriterion["scale"] })} />
    <JsonField id={id + "-anchors"} label={c.anchors} value={row.anchors} locale={locale} onChange={(anchors) => onChange({ ...row, anchors: anchors as CompetitionCriterion["anchors"] })} />
  </details>;
}

export function TrackSettingsEditor({ id, label, value, onChange, locale }: { id: string; label: string; value: SettingValue; onChange: (next: HackathonTrackSettings | null) => void; locale: Locale }) {
  const tracks = decodeTrackSettings(value), draft = tracks ?? { translating_research: { en: "", ar: "" }, advancing_research: { en: "", ar: "" } };
  return <fieldset className="competition-rubric"><legend>{label}</legend>{value === null ? <p>{frameworkStaffCopy[locale].unset}</p> : null}
    {(["translating_research", "advancing_research"] as const).map((key, index) => <div key={key} className="competition-settings-grid">{(["en", "ar"] as const).map((language) => <div key={language} className="field"><label htmlFor={`${id}-${key}-${language}`}>{label} · {index + 1} · {language === "en" ? "English" : "العربية"}</label><textarea className="field-input" id={`${id}-${key}-${language}`} lang={language} dir={language === "ar" ? "rtl" : "ltr"} rows={3} maxLength={4000} value={draft[key][language]} onChange={(event) => { const next = { ...draft, [key]: { ...draft[key], [language]: event.target.value } }; onChange(Object.values(next).every((item) => !item.en && !item.ar) ? null : next); }} /></div>)}</div>)}
  </fieldset>;
}
