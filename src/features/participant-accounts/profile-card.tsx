"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { FileUpload } from "@/components/forms/file-upload";
import { FieldMessages, FormField } from "@/components/forms/form-field";
import { Select } from "@/components/forms/select";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { ProfileAvatar } from "./profile-avatar";
import { requestParticipantProfile } from "./profile-client";
import { profileCopy } from "./profile-copy";
import type { OptionalParticipantProfile, ParticipantProfileResponse, ProfileSpecialty } from "./profile-contract";
import { clearProfileEditorDraft, readProfileEditorDraft, saveProfileEditorDraft } from "./profile-editor-draft";

type ProfileField = "institution" | "status" | "year" | "interests" | "avatar";
type Errors = Partial<Record<ProfileField, "required" | "invalid" | "too_long">>;
const fieldOrder: ProfileField[] = ["avatar", "institution", "status", "year", "interests"];

export function profileCompletion(profile: OptionalParticipantProfile) {
  return Number(!!profile.avatarUrl) + Number(!!profile.institution?.trim())
    + Number(!!profile.status && (profile.status !== "medical_student" || profile.year !== null)) + Number(profile.interests.length > 0);
}

/** ENG-086 / ORG-066: consent is given only for the optional fields the person saves. */
export function ParticipantProfileCard({ locale, name, identity }: { locale: Locale; name: string; identity: string }) {
  const copy = profileCopy[locale];
  const [restoredDraft] = useState(() => readProfileEditorDraft(identity));
  const [profile, setProfile] = useState<OptionalParticipantProfile | null>(null);
  const [specialties, setSpecialties] = useState<ProfileSpecialty[]>([]);
  const [state, setState] = useState<ParticipantProfileResponse["state"] | "loading">("loading");
  const [formToken, setFormToken] = useState<string | null>(null);
  const [editing, setEditing] = useState(!!restoredDraft);
  const [editorVersion, setEditorVersion] = useState<number | null>(restoredDraft?.version ?? null);
  const [institution, setInstitution] = useState(restoredDraft?.institution ?? "");
  const [status, setStatus] = useState<OptionalParticipantProfile["status"]>(restoredDraft?.status ?? null);
  const [year, setYear] = useState<number | null>(restoredDraft?.year ?? null);
  const [interests, setInterests] = useState<string[]>(restoredDraft?.interests ?? []);
  const [avatar, setAvatar] = useState<File | null>(restoredDraft?.avatar ?? null);
  const [removeAvatar, setRemoveAvatar] = useState(restoredDraft?.removeAvatar ?? false);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const summary = useRef<HTMLDivElement>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const previewReader = useRef<FileReader | null>(null);
  const active = useRef(true);
  const submitting = useRef(false);
  const actionController = useRef<AbortController | null>(null);
  const editor = useRef({ editing: !!restoredDraft, version: restoredDraft?.version ?? null as number | null });

  const installToken = useCallback((value: string | undefined) => {
    setFormToken(value ?? null);
  }, []);
  const clearSessionData = useCallback(() => {
    clearProfileEditorDraft(identity); previewReader.current?.abort(); previewReader.current = null;
    editor.current = { editing: false, version: null };
    setProfile(null); setEditing(false); setEditorVersion(null); setInstitution(""); setStatus(null); setYear(null); setInterests([]); setAvatar(null); setPreview(null); setRemoveAvatar(false); setFormToken(null);
  }, [identity]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false; actionController.current?.abort();
      previewReader.current?.abort();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const result = await requestParticipantProfile(undefined, controller.signal);
      if (controller.signal.aborted) return;
      setState(result.state);
      if (result.state === "ready") {
        setProfile(result.profile); setSpecialties(result.specialties); installToken(result.formToken);
        if (editor.current.editing && editor.current.version !== null && editor.current.version !== result.profile.version) setState("conflict");
      } else if (result.state === "denied" || result.state === "closed") clearSessionData();
    })();
    return () => controller.abort();
  }, [refresh, installToken, clearSessionData, locale]);
  useEffect(() => {
    if (!profile) return;
    if (editing && editorVersion !== null) saveProfileEditorDraft({ owner: identity, version: editorVersion, institution, status, year, interests, avatar, removeAvatar });
    else clearProfileEditorDraft(identity);
  }, [identity, profile, editing, editorVersion, institution, status, year, interests, avatar, removeAvatar]);
  useEffect(() => {
    if (!restoredDraft?.avatar) return;
    const reader = new FileReader(); previewReader.current = reader;
    reader.onload = () => { if (active.current && previewReader.current === reader && typeof reader.result === "string") setPreview(reader.result); };
    reader.readAsDataURL(restoredDraft.avatar);
    return () => reader.abort();
  }, [restoredDraft]);
  const profileLoaded = profile !== null;
  useEffect(() => { if (editing && profileLoaded) editorHeading.current?.focus(); }, [editing, profileLoaded]);
  useEffect(() => { if (Object.values(errors).some(Boolean) || ["invalid_input", "limited", "conflict", "unavailable"].includes(state) && editing) summary.current?.focus(); }, [errors, state, editing]);

  function clearPreview() {
    previewReader.current?.abort(); previewReader.current = null; setPreview(null); setAvatar(null);
  }
  function openEditor() {
    if (!profile) return;
    setInstitution(profile.institution ?? ""); setStatus(profile.status); setYear(profile.year); setInterests(profile.interests);
    editor.current = { editing: true, version: profile.version };
    clearPreview(); setRemoveAvatar(false); setErrors({}); setSaved(false); setEditorVersion(profile.version); setEditing(true);
  }
  function selectFile(files: File[]) {
    clearPreview(); setErrors((value) => ({ ...value, avatar: undefined }));
    const file = files[0]; if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024 || file.size === 0) { setErrors((value) => ({ ...value, avatar: "invalid" })); return; }
    const reader = new FileReader(); previewReader.current = reader;
    reader.onload = () => { if (active.current && previewReader.current === reader && typeof reader.result === "string") setPreview(reader.result); };
    reader.readAsDataURL(file); setAvatar(file); setRemoveAvatar(false);
  }
  const label = (field: ProfileField) => field === "avatar" ? copy.picture : copy[field];
  function errorText(field: ProfileField) {
    if (!errors[field]) return undefined;
    return field === "avatar" ? copy.invalidImage : field === "interests" ? copy.tooMany : errors[field] === "required" ? copy.required : errors[field] === "too_long" ? copy.tooLong : copy.invalid;
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !formToken || editorVersion === null || submitting.current || state === "conflict") return;
    const checked: Errors = {};
    if (Array.from(institution.trim()).length > 160) checked.institution = "too_long";
    if (status === "medical_student" && (!year || year < 1 || year > 6)) checked.year = "required";
    if (interests.length > 5) checked.interests = "invalid";
    if (errors.avatar) checked.avatar = errors.avatar;
    if (Object.keys(checked).length) { setErrors(checked); return; }
    submitting.current = true; setPending(true); setSaved(false); setErrors({});
    const payload = new FormData();
    payload.set("action", "save"); payload.set("formToken", formToken); payload.set("version", String(editorVersion));
    payload.set("institution", institution); payload.set("status", status ?? ""); payload.set("year", status === "medical_student" && year ? String(year) : "");
    payload.set("interests", JSON.stringify(interests)); payload.set("website", String(new FormData(event.currentTarget).get("website") ?? ""));
    if (avatar) payload.set("avatar", avatar);
    if (removeAvatar) payload.set("removeAvatar", "true");
    actionController.current = new AbortController();
    const result = await requestParticipantProfile(payload, actionController.current.signal);
    submitting.current = false;
    if (!active.current) return;
    setPending(false); setState(result.state);
    installToken("formToken" in result ? result.formToken : undefined);
    if (result.state === "ready") {
      editor.current = { editing: false, version: result.profile.version };
      setProfile(result.profile); setEditorVersion(result.profile.version); setSpecialties(result.specialties); clearPreview(); setRemoveAvatar(false); setEditing(false); setSaved(true); clearProfileEditorDraft(identity);
      window.dispatchEvent(new Event("msrc-participant-profile")); document.getElementById("participant-profile-edit")?.focus();
    } else if (result.state === "invalid_input") setErrors(result.fieldErrors ?? {});
    else if (result.state === "denied" || result.state === "closed") clearSessionData();
  }
  function reload() { clearProfileEditorDraft(identity); editor.current = { editing: false, version: null }; setEditing(false); clearPreview(); setErrors({}); setProfile(null); setState("loading"); setRefresh((value) => value + 1); }
  if (state === "closed" || state === "denied") return null;
  const complete = profile ? profileCompletion(profile) : 0;
  const hasError = editing && (Object.keys(errors).some((key) => errors[key as ProfileField]) || !["loading", "ready"].includes(state));
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB").format(complete);
  return <section className={`participant-profile-card${complete === 4 && !editing ? " participant-profile-card--complete" : ""}`} aria-labelledby="participant-profile-heading" data-testid="participant-profile-card">
    <div className="participant-profile-overview">
      {profile ? <ProfileAvatar name={name} url={profile.avatarUrl} /> : null}
      <div className="participant-profile-overview-copy">
        <h2 id="participant-profile-heading">{complete === 4 ? copy.complete : copy.title}</h2>
        {profile && complete < 4 ? <><p>{copy.lead}</p><label className="participant-profile-progress" htmlFor="participant-profile-progress"><span>{number} {copy.filled}</span><progress id="participant-profile-progress" value={complete} max={4} aria-label={copy.progress} /></label></> : null}
      </div>
      {profile ? <Button id="participant-profile-edit" variant="secondary" size="small" onClick={openEditor} disabled={pending || state === "conflict"} aria-expanded={editing} aria-controls={editing ? "participant-profile-editor" : undefined}>{copy.edit}</Button> : null}
    </div>
    {state === "loading" ? <p role="status">{copy.loading}</p> : !profile ? <><p role="status">{copy.unavailable}</p><Button variant="secondary" size="small" onClick={reload}>{copy.retry}</Button></> : null}
    <p role="status" aria-live="polite" className="participant-profile-feedback">{pending ? copy.saving : saved ? copy.saved : ""}</p>
    {editing && profile ? <form id="participant-profile-editor" ref={form} onSubmit={(event) => void save(event)} noValidate aria-busy={pending} aria-labelledby="participant-profile-editor-title">
      <h3 id="participant-profile-editor-title" ref={editorHeading} tabIndex={-1}>{copy.edit}</h3>
      {hasError ? <div ref={summary} className="participant-account-error" role="alert" tabIndex={-1}>
        <h4>{copy.errorsTitle}</h4><p>{state === "conflict" ? copy.conflict : state === "limited" ? copy.limited : copy.error}</p>
        {fieldOrder.some((field) => errors[field]) ? <ul>{fieldOrder.filter((field) => errors[field]).map((field) => <li key={field}><a href={`#profile-${field}`} onClick={(event) => { event.preventDefault(); document.getElementById(`profile-${field}`)?.focus(); }}>{label(field)}</a></li>)}</ul> : null}
        {state === "conflict" ? <Button variant="secondary" onClick={reload}>{copy.reload}</Button> : null}
        {state !== "conflict" && (state === "unavailable" || !formToken) ? <Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>{copy.retry}</Button> : null}
      </div> : null}
      <fieldset className="participant-account-fields" disabled={pending || state === "conflict"}>
        <div className="participant-profile-picture">
          <ProfileAvatar name={name} url={preview ?? (removeAvatar ? null : profile.avatarUrl)} previewLabel={copy.preview} />
          <FileUpload key={removeAvatar ? "removed" : "picture"} id="profile-avatar" name="avatar" label={copy.picture} hint={copy.imageHint} accept="image/jpeg,image/png,image/webp" error={errorText("avatar")} clearLabel={copy.clear} selectionLabel={copy.selected} onSelectionChange={selectFile} />
          {avatar || profile.avatarUrl && !removeAvatar ? <Button variant="secondary" size="small" onClick={() => { clearPreview(); setRemoveAvatar(true); setErrors((value) => ({ ...value, avatar: undefined })); }}>{copy.remove}</Button> : null}
        </div>
        <FormField id="profile-institution" name="institution" label={copy.institution} hint={copy.institutionHint} value={institution} dir="auto" autoComplete="organization" maxLength={160} error={errorText("institution")} onChange={(event) => { setInstitution(event.target.value); setErrors((value) => ({ ...value, institution: undefined })); }} />
        <Select id="profile-status" name="status" label={copy.status} value={status ?? ""} error={errorText("status")} onChange={(event) => { setStatus(event.target.value as OptionalParticipantProfile["status"] || null); setYear(null); setErrors((value) => ({ ...value, status: undefined, year: undefined })); }}>
          <option value="">{copy.choose}</option>{Object.entries(copy.statuses).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
        </Select>
        {status === "medical_student" ? <Select id="profile-year" name="year" label={copy.year} value={year ?? ""} required error={errorText("year")} onChange={(event) => { setYear(Number(event.target.value) || null); setErrors((value) => ({ ...value, year: undefined })); }}><option value="">{copy.chooseYear}</option>{[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB").format(value)}</option>)}</Select> : null}
        <fieldset className="participant-profile-interests" id="profile-interests" tabIndex={-1} aria-describedby={`profile-interests-hint${errors.interests ? " profile-interests-error" : ""}`}>
          <legend className="field-label">{copy.interests}</legend><p id="profile-interests-hint" className="field-hint">{copy.interestsHint}</p>
          {specialties.length ? <div className="participant-profile-chips">{specialties.map((option) => <button key={option.id} type="button" lang="en" dir="ltr" aria-pressed={interests.includes(option.id)} disabled={!interests.includes(option.id) && interests.length >= 5} onClick={() => { setInterests((values) => values.includes(option.id) ? values.filter((value) => value !== option.id) : [...values, option.id]); setErrors((value) => ({ ...value, interests: undefined })); }}>{option.label}</button>)}</div> : <p>{copy.interestsUnavailable}</p>}
          {interests.length ? <Button variant="secondary" size="small" onClick={() => { setInterests([]); setErrors((value) => ({ ...value, interests: undefined })); }}>{copy.clearInterests}</Button> : null}
          <FieldMessages id="profile-interests" label={copy.interests} error={errorText("interests")} />
        </fieldset>
        <div className="participant-account-trap" aria-hidden="true"><label htmlFor="profile-website">Website</label><input id="profile-website" name="website" autoComplete="off" tabIndex={-1} /></div>
      </fieldset>
      <div className="participant-account-actions"><Button type="submit" disabled={pending || !formToken || state === "conflict"}>{copy.save}</Button><Button variant="secondary" disabled={pending} onClick={() => { clearPreview(); clearProfileEditorDraft(identity); editor.current.editing = false; setErrors({}); setEditing(false); document.getElementById("participant-profile-edit")?.focus(); }}>{copy.cancel}</Button></div>
    </form> : null}
  </section>;
}
