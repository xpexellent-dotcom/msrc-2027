"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { FileUpload } from "@/components/forms/file-upload";
import { FieldMessages, FormField } from "@/components/forms/form-field";
import { Select } from "@/components/forms/select";
import { Button } from "@/components/ui/button";
import { ContactPhoneField, phoneCountries } from "./contact-phone-field";
import { DashboardIcon } from "./dashboard-icon";
import { COUNTRIES } from "@/content/countries";
import type { Locale } from "@/lib/i18n";
import { InstitutionCombobox } from "./institution-combobox";
import { ProfileAvatar } from "./profile-avatar";
import { publishParticipantProfileAvatar, requestParticipantProfile } from "./profile-client";
import { profileCopy } from "./profile-copy";
import { PROFILE_FIELDS, PROFILE_STATUSES, isProfessionalProfileStatus, profileCompletion, profileCompletionTotal, profileNamesFromAccount, isAdultProfileDate, isArabicProfileName, isLatinProfileName, isProfileIdentityNumber, isProfilePhone,
  type OptionalParticipantProfile, type ParticipantProfileResponse, type ProfileSpecialty, type ProfileField, type ProfileErrors, type ProfileIdentityType } from "./profile-contract";
import { clearProfileEditorDraft, readProfileEditorDraft, saveProfileEditorDraft } from "./profile-editor-draft";

export { profileCompletion } from "./profile-contract";
type EditorValues = { institutionId: string | null; institutionOther: string; status: OptionalParticipantProfile["status"]; arabicName: string; latinName: string; nationality: string;
  gender: "male" | "female" | ""; dateOfBirth: string; city: string; phone: string; identityType: ProfileIdentityType | ""; identityNumber: string };
const emptyValues: EditorValues = { institutionId: null, institutionOther: "", status: null, arabicName: "", latinName: "", nationality: "", gender: "", dateOfBirth: "", city: "", phone: "", identityType: "", identityNumber: "" };
const identityExamples = { national_id: "1XXXXXXXXX", iqama: "2XXXXXXXXX", passport: "A1234567" } satisfies Record<ProfileIdentityType, string>;
function valuesFromProfile(profile: OptionalParticipantProfile, accountName: string, latinNameAvailable: boolean): EditorValues {
  const accountNames = profileNamesFromAccount(accountName);
  return { institutionId: profile.institutionId, institutionOther: profile.institutionOther ?? "", status: profile.status,
    arabicName: profile.arabicName ?? accountNames.arabicName,
    latinName: latinNameAvailable ? profile.latinName ?? accountNames.latinName : "",
    nationality: profile.nationality ?? "", gender: profile.gender ?? "", dateOfBirth: profile.dateOfBirth ?? "", city: profile.city ?? "", phone: profile.phone ?? "", identityType: profile.identityType ?? "", identityNumber: "" };
}

/** ENG-087 / ORG-067: saving progress is independent of submission eligibility. */
export function ParticipantProfileCard({ locale, name, identity }: { locale: Locale; name: string; identity: string }) {
  const copy = profileCopy[locale];
  const [restoredDraft] = useState(() => readProfileEditorDraft(identity));
  const [profile, setProfile] = useState<OptionalParticipantProfile | null>(null);
  const [latinNameAvailable, setLatinNameAvailable] = useState(true);
  const [professionalStatusesAvailable, setProfessionalStatusesAvailable] = useState(false);
  const [specialties, setSpecialties] = useState<ProfileSpecialty[]>([]);
  const [state, setState] = useState<ParticipantProfileResponse["state"] | "loading">("loading");
  const [formToken, setFormToken] = useState<string | null>(null);
  const [editing, setEditing] = useState(!!restoredDraft);
  const [editorVersion, setEditorVersion] = useState<number | null>(restoredDraft?.version ?? null);
  const [values, setValues] = useState<EditorValues>(() => ({ ...emptyValues, institutionId: restoredDraft?.institutionId ?? null, institutionOther: restoredDraft?.institutionOther ?? "", status: restoredDraft?.status ?? null }));
  const [otherInstitution, setOtherInstitution] = useState(!!restoredDraft?.institutionOther);
  const [phoneCountry, setPhoneCountry] = useState("+966");
  const [removeIdentity, setRemoveIdentity] = useState(false);
  const [interests, setInterests] = useState<string[]>(restoredDraft?.interests ?? []);
  const [avatar, setAvatar] = useState<File | null>(restoredDraft?.avatar ?? null);
  const [removeAvatar, setRemoveAvatar] = useState(restoredDraft?.removeAvatar ?? false);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [pending, setPending] = useState(false), [saved, setSaved] = useState(false), [refresh, setRefresh] = useState(0);
  const summary = useRef<HTMLDivElement>(null), editorHeading = useRef<HTMLHeadingElement>(null);
  const editButton = useRef<HTMLButtonElement>(null), restoreEditFocus = useRef(false);
  const previewReader = useRef<FileReader | null>(null), active = useRef(true), submitting = useRef(false);
  const actionController = useRef<AbortController | null>(null);
  const editor = useRef({ editing: !!restoredDraft, version: restoredDraft?.version ?? null as number | null });
  const clearPreview = useCallback(() => {
    previewReader.current?.abort(); previewReader.current = null; setPreview(null); setAvatar(null);
  }, []);
  const beginEditing = useCallback((currentProfile: OptionalParticipantProfile, canEditLatinName: boolean) => {
    setValues(valuesFromProfile(currentProfile, name, canEditLatinName));
    setOtherInstitution(!!currentProfile.institutionOther);
    setPhoneCountry(currentProfile.phone ? phoneCountries.find((item) => currentProfile.phone!.startsWith(item.prefix))?.prefix ?? "" : "+966");
    setInterests(currentProfile.interests);
    editor.current = { editing: true, version: currentProfile.version };
    clearPreview(); setRemoveAvatar(false); setRemoveIdentity(false); setErrors({}); setSaved(false);
    setEditorVersion(currentProfile.version); setEditing(true);
  }, [clearPreview, name]);
  const clearSessionData = useCallback(() => {
    clearProfileEditorDraft(identity); previewReader.current?.abort(); previewReader.current = null;
    editor.current = { editing: false, version: null };
    setProfile(null); setEditing(false); setEditorVersion(null); setValues({ ...emptyValues }); setInterests([]); setAvatar(null); setPreview(null); setRemoveAvatar(false); setRemoveIdentity(false); setFormToken(null);
  }, [identity]);
  useEffect(() => { active.current = true; return () => { active.current = false; actionController.current?.abort(); previewReader.current?.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const result = await requestParticipantProfile(undefined, controller.signal);
      if (controller.signal.aborted) return;
      publishParticipantProfileAvatar(result.state === "ready" ? result.profile.avatarUrl : null);
      setState(result.state);
      // A click on the loading card requests the editor without inventing a version or draft.
      const wantsEditor = editor.current.editing && editor.current.version === null;
      if (result.state === "ready") {
        const canEditLatinName = result.latinNameAvailable !== false;
        setProfile(result.profile); setSpecialties(result.specialties); setFormToken(result.formToken); setLatinNameAvailable(canEditLatinName);
        setProfessionalStatusesAvailable(result.professionalStatusesAvailable === true);
        if (wantsEditor) { beginEditing(result.profile, canEditLatinName); return; }
        if (editor.current.editing && editor.current.version !== null && editor.current.version !== result.profile.version) setState("conflict");
        if (restoredDraft) setValues((current) => ({ ...valuesFromProfile(result.profile, name, canEditLatinName), institutionId: current.institutionId, institutionOther: current.institutionOther, status: current.status }));
      } else if (result.state === "denied" || result.state === "closed") clearSessionData();
      else if (wantsEditor) { editor.current.editing = false; setEditing(false); }
    })();
    return () => controller.abort();
  }, [refresh, beginEditing, clearSessionData, locale, name, restoredDraft]);
  useEffect(() => {
    if (!profile) return;
    if (editing && editorVersion !== null) saveProfileEditorDraft({ owner: identity, version: editorVersion, institutionId: values.institutionId, institutionOther: values.institutionOther, status: values.status, interests, avatar, removeAvatar });
    else clearProfileEditorDraft(identity);
  }, [identity, profile, editing, editorVersion, values.institutionId, values.institutionOther, values.status, interests, avatar, removeAvatar]);
  useEffect(() => {
    if (!restoredDraft?.avatar) return;
    const reader = new FileReader(); previewReader.current = reader;
    reader.onload = () => { if (active.current && previewReader.current === reader && typeof reader.result === "string") setPreview(reader.result); };
    reader.readAsDataURL(restoredDraft.avatar); return () => reader.abort();
  }, [restoredDraft]);
  const profileLoaded = profile !== null;
  useEffect(() => { if (editing && profileLoaded) editorHeading.current?.focus(); }, [editing, profileLoaded]);
  useEffect(() => {
    if (!editing && restoreEditFocus.current) {
      restoreEditFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing]);
  useEffect(() => { if (Object.values(errors).some(Boolean) || ["invalid_input", "limited", "conflict", "unavailable", "area-not-ready"].includes(state) && editing) summary.current?.focus(); }, [errors, state, editing]);
  function update<Key extends keyof EditorValues>(field: Key, value: EditorValues[Key]) { setValues((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })); }
  function openEditor() {
    if (profile) beginEditing(profile, latinNameAvailable);
    else if (state === "loading" && !editor.current.editing) {
      editor.current = { editing: true, version: null };
      setEditing(true);
    }
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
    return field === "avatar" ? copy.invalidImage : field === "interests" ? copy.tooMany : errors[field] === "required" ? copy.required : errors[field] === "too_long" ? copy.tooLong
      : field === "dateOfBirth" ? copy.invalidAge : field === "phone" ? copy.invalidPhone : field === "arabicName" ? copy.invalidArabicName : field === "latinName" ? copy.invalidLatinName : copy.invalid;
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !formToken || editorVersion === null || submitting.current || state === "conflict") return;
    const checked: ProfileErrors = {};
    if (Array.from(values.institutionOther.trim()).length > 160) checked.institutionOther = "too_long";
    if (values.arabicName.trim() && !isArabicProfileName(values.arabicName.trim())) checked.arabicName = "invalid";
    if (latinNameAvailable && values.latinName.trim() && !isLatinProfileName(values.latinName.trim())) checked.latinName = "invalid";
    if (values.dateOfBirth && !isAdultProfileDate(values.dateOfBirth)) checked.dateOfBirth = "invalid";
    if (Array.from(values.city.trim()).length > 80) checked.city = "too_long";
    if (values.phone && !isProfilePhone(values.phone)) checked.phone = "invalid";
    if (values.identityNumber && (!values.identityType || !isProfileIdentityNumber(values.identityType, values.identityNumber.trim()))) checked.identityNumber = "invalid";
    if (values.identityType && !values.identityNumber && (removeIdentity || values.identityType !== profile.identityType || !profile.identityLast4)) checked.identityNumber = "required";
    if (interests.length > 5) checked.interests = "invalid";
    if (errors.avatar) checked.avatar = errors.avatar;
    if (Object.keys(checked).length) { setErrors(checked); return; }
    submitting.current = true; setPending(true); setSaved(false); setErrors({});
    const payload = new FormData();
    payload.set("action", "save"); payload.set("formToken", formToken); payload.set("version", String(editorVersion));
    for (const [key, value] of Object.entries(values)) {
      if (key !== "latinName" || latinNameAvailable) payload.set(key, value ?? "");
    }
    payload.set("interests", JSON.stringify(interests)); payload.set("website", String(new FormData(event.currentTarget).get("website") ?? ""));
    if (avatar) payload.set("avatar", avatar); if (removeAvatar) payload.set("removeAvatar", "true"); if (removeIdentity) payload.set("removeIdentity", "true");
    actionController.current = new AbortController();
    const result = await requestParticipantProfile(payload, actionController.current.signal);
    submitting.current = false; if (!active.current) return;
    setPending(false); setState(result.state); setFormToken("formToken" in result ? result.formToken ?? null : null);
    if (result.state === "ready") {
      restoreEditFocus.current = true;
      editor.current = { editing: false, version: result.profile.version };
      setProfile(result.profile); setLatinNameAvailable(result.latinNameAvailable !== false);
      setProfessionalStatusesAvailable(result.professionalStatusesAvailable === true);
      setEditorVersion(result.profile.version); setSpecialties(result.specialties); setValues({ ...emptyValues }); clearPreview(); setRemoveAvatar(false); setRemoveIdentity(false); setEditing(false); setSaved(true); clearProfileEditorDraft(identity);
      publishParticipantProfileAvatar(result.profile.avatarUrl);
      window.dispatchEvent(new Event("msrc-participant-profile"));
    } else if (result.state === "invalid_input") setErrors(result.fieldErrors ?? {});
    else if (result.state === "denied" || result.state === "closed") {
      publishParticipantProfileAvatar(null);
      clearSessionData();
    }
  }
  function reload() { clearProfileEditorDraft(identity); editor.current = { editing: false, version: null }; setEditing(false); setValues({ ...emptyValues }); clearPreview(); setErrors({}); setProfile(null); setState("loading"); setRefresh((value) => value + 1); }
  function cancelEdit() {
    clearPreview();
    clearProfileEditorDraft(identity);
    editor.current.editing = false;
    restoreEditFocus.current = true;
    setValues({ ...emptyValues });
    setErrors({});
    setEditing(false);
  }
  const accountNames = profileNamesFromAccount(name);
  const canShowProfile = profile !== null && state !== "closed" && state !== "denied";
  const editorOpen = editing && canShowProfile;
  const completedItems = profile ? profileCompletion(profile, specialties) : 0;
  const availableStatuses = PROFILE_STATUSES.filter(status => professionalStatusesAvailable || !isProfessionalProfileStatus(status));
  const total = profileCompletionTotal(specialties, latinNameAvailable);
  const isComplete = completedItems === total;
  const hasError = editing && (Object.values(errors).some(Boolean) || !["loading", "ready"].includes(state));
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB");
  const progressText = isComplete ? copy.complete : copy.filled.replace("{count}", number.format(completedItems)).replace("{total}", number.format(total));
  const identityFormat = values.identityType ? copy.identityFormats[values.identityType] : undefined;
  const invalidIdentityFormat = errors.identityNumber === "invalid" ? identityFormat : undefined;
  return <section id="profile" className="participant-profile-card" tabIndex={-1} aria-labelledby="participant-profile-heading" data-testid="participant-profile-card">
    <header className="participant-profile-overview">
      <div className="participant-profile-identity">
        {canShowProfile ? <ProfileAvatar name={name} url={profile.avatarUrl} /> : null}
        <div className="participant-profile-overview-copy">
          <h2 id="participant-profile-heading">{copy.title}</h2>
          {canShowProfile && !isComplete ? <p>{copy.lead}</p> : null}
        </div>
      </div>
      {canShowProfile || state === "loading" ? <Button
        id="participant-profile-edit"
        ref={editButton}
        className="participant-profile-edit"
        variant={editorOpen ? "secondary" : "primary"}
        size="small"
        onClick={editorOpen ? cancelEdit : openEditor}
        disabled={pending}
        aria-expanded={editorOpen}
        aria-controls={editorOpen ? "participant-profile-editor" : undefined}
      >
        <DashboardIcon name={editorOpen ? "close" : "pencil"} />
        <span>{editorOpen ? copy.cancelEditing : copy.edit}</span>
      </Button> : null}
    </header>
    {canShowProfile ? <div className="participant-profile-progress">
      <div className="participant-profile-progress-label">
        <label htmlFor="participant-profile-progress">{copy.progress}</label>
        <span>{progressText}</span>
      </div>
      <progress id="participant-profile-progress" value={completedItems} max={total} aria-valuetext={progressText} />
    </div> : <div className="participant-profile-availability">
      <p role="status">{state === "loading" ? editing ? copy.openingEditor : copy.loading : copy.unavailable}</p>
      {state !== "loading" ? <Button variant="secondary" size="small" onClick={reload}>{copy.retry}</Button> : null}
    </div>}
    <p role="status" className="participant-profile-feedback">{canShowProfile ? pending ? copy.saving : saved ? copy.saved : "" : ""}</p>
    {canShowProfile ? <p className="participant-profile-privacy"><DashboardIcon name="lock" /><span>{copy.privacy}</span></p> : null}
    {editorOpen ? <form id="participant-profile-editor" onSubmit={(event) => void save(event)} noValidate aria-busy={pending} aria-labelledby="participant-profile-editor-title">
      <header className="participant-profile-editor-intro">
        <h3 id="participant-profile-editor-title" ref={editorHeading} tabIndex={-1}>{copy.edit}</h3>
        <p className="field-hint">{copy.partial}</p>
      </header>
      {hasError ? <div ref={summary} className="participant-account-error" role="alert" tabIndex={-1}>
        <h4>{copy.errorsTitle}</h4><p>{state === "conflict" ? copy.conflict : state === "limited" ? copy.limited : copy.error}</p>
        {PROFILE_FIELDS.some((field) => errors[field]) ? <ul>{PROFILE_FIELDS.filter((field) => errors[field]).map((field) => <li key={field}><a href={`#profile-${field}`} onClick={(event) => { event.preventDefault(); document.getElementById(`profile-${field}`)?.focus(); }}>{label(field)}</a></li>)}</ul> : null}
        {state === "conflict" ? <Button variant="secondary" onClick={reload}>{copy.reload}</Button> : null}
        {state !== "conflict" && (state === "unavailable" || !formToken) ? <Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>{copy.retry}</Button> : null}
      </div> : null}
      <fieldset className="participant-account-fields" disabled={pending || state === "conflict"}>
        <div className="participant-profile-picture">
          <ProfileAvatar name={name} url={preview ?? (removeAvatar ? null : profile.avatarUrl)} previewLabel={copy.preview} />
          <div className="participant-profile-picture-controls">
            <FileUpload key={removeAvatar ? "removed" : "picture"} id="profile-avatar" name="avatar" label={copy.picture} hint={copy.imageHint} accept="image/jpeg,image/png,image/webp" error={errorText("avatar")} clearLabel={copy.clear} selectionLabel={copy.selected} onSelectionChange={selectFile} />
            {avatar || profile.avatarUrl && !removeAvatar ? <Button variant="secondary" size="small" onClick={() => { clearPreview(); setRemoveAvatar(true); setErrors((value) => ({ ...value, avatar: undefined })); }}>{copy.remove}</Button> : null}
          </div>
        </div>
        <fieldset className="participant-profile-group">
          <legend className="participant-profile-group-title">{copy.groups.studies}</legend>
          <InstitutionCombobox locale={locale} value={values.institutionId} other={otherInstitution} error={errorText("institution")} onChange={(id, other) => { update("institutionId", id); setOtherInstitution(other); if (!other) update("institutionOther", ""); setErrors((current) => ({ ...current, institution: undefined })); }} />
          {otherInstitution ? <FormField id="profile-institutionOther" name="institutionOther" label={copy.institutionOther} value={values.institutionOther} dir="auto" autoComplete="organization" maxLength={160} error={errorText("institutionOther")} onChange={(event) => update("institutionOther", event.target.value)} /> : null}
          <Select id="profile-status" name="status" label={copy.status} value={values.status ?? ""} error={errorText("status")} onChange={(event) => update("status", event.target.value as OptionalParticipantProfile["status"] || null)}><option value="">{copy.choose}</option>{availableStatuses.map(status => <option key={status} value={status}>{copy.statuses[status]}</option>)}</Select>
          <fieldset className="participant-profile-interests" id="profile-interests" tabIndex={-1} aria-describedby={`profile-interests-hint${errors.interests ? " profile-interests-error" : ""}`}>
            <legend className="field-label">{copy.interests}</legend><p id="profile-interests-hint" className="field-hint">{copy.interestsHint}</p>
            {specialties.length ? <div className="participant-profile-chips">{specialties.map((option) => <button key={option.id} type="button" lang="en" dir="ltr" aria-pressed={interests.includes(option.id)} disabled={!interests.includes(option.id) && interests.length >= 5} onClick={() => { setInterests((current) => current.includes(option.id) ? current.filter((value) => value !== option.id) : [...current, option.id]); setErrors((value) => ({ ...value, interests: undefined })); }}>{option.label}</button>)}</div> : <p>{copy.interestsUnavailable}</p>}
            {interests.length ? <Button variant="secondary" size="small" onClick={() => { setInterests([]); setErrors((value) => ({ ...value, interests: undefined })); }}>{copy.clearInterests}</Button> : null}
            <FieldMessages id="profile-interests" label={copy.interests} error={errorText("interests")} />
          </fieldset>
        </fieldset>
        <fieldset className="participant-profile-group">
          <legend className="participant-profile-group-title">{copy.groups.about}</legend>
          <div className="participant-profile-group-grid">
            <FormField id="profile-arabicName" name="arabicName" label={copy.arabicName} value={values.arabicName}
              hint={!profile.arabicName && values.arabicName && values.arabicName === accountNames.arabicName ? copy.nameFromSignup : undefined}
              dir="rtl" lang="ar" autoComplete="off" maxLength={160} error={errorText("arabicName")} onChange={(event) => update("arabicName", event.target.value)} />
            {latinNameAvailable ? <FormField id="profile-latinName" name="latinName" label={copy.latinName} value={values.latinName}
              hint={!profile.latinName && values.latinName && values.latinName === accountNames.latinName ? copy.nameFromSignup : undefined}
              dir="ltr" lang="en" autoComplete="off" maxLength={160} error={errorText("latinName")} onChange={(event) => update("latinName", event.target.value)} /> : null}
            <Select id="profile-nationality" name="nationality" label={copy.nationality} value={values.nationality} error={errorText("nationality")} onChange={(event) => update("nationality", event.target.value)}><option value="">{copy.choose}</option>{COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country[locale === "ar" ? "nameAr" : "nameEn"]}</option>)}</Select>
            <Select id="profile-gender" name="gender" label={copy.gender} value={values.gender} error={errorText("gender")} onChange={(event) => update("gender", event.target.value as EditorValues["gender"])}><option value="">{copy.choose}</option>{Object.entries(copy.genders).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</Select>
            <FormField id="profile-dateOfBirth" name="dateOfBirth" type="date" label={copy.dateOfBirth} hint={copy.ageHint} value={values.dateOfBirth} dir="ltr" autoComplete="bday" error={errorText("dateOfBirth")} onChange={(event) => update("dateOfBirth", event.target.value)} />
          </div>
        </fieldset>
        <fieldset className="participant-profile-group">
          <legend className="participant-profile-group-title">{copy.groups.contact}</legend>
          <FormField id="profile-city" name="city" label={copy.city} hint={copy.cityHint} value={values.city} dir="auto" autoComplete="address-level2" maxLength={80} error={errorText("city")} onChange={(event) => update("city", event.target.value)} />
          <ContactPhoneField id="profile-phone" name="phone" locale={locale} country={phoneCountry} onCountryChange={setPhoneCountry} value={values.phone} onChange={(value) => update("phone", value)}
            labels={{ country: copy.phoneCountry, phone: copy.phone, international: copy.internationalPhone }} error={errorText("phone")} />
        </fieldset>
        <fieldset className="participant-profile-group">
          <legend className="participant-profile-group-title">{copy.groups.identity}</legend>
          <div className="participant-profile-group-grid">
            <Select id="profile-identityType" name="identityType" label={copy.identityType} value={values.identityType} error={errorText("identityType")} onChange={(event) => { update("identityType", event.target.value as EditorValues["identityType"]); update("identityNumber", ""); setRemoveIdentity(!event.target.value && !!profile.identityLast4); }}><option value="">{copy.choose}</option>{Object.entries(copy.identityTypes).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</Select>
            <FormField
              id="profile-identityNumber" name="identityNumber" label={copy.identityNumber}
              hint={profile.identityLast4 && !removeIdentity && values.identityType === profile.identityType ? copy.savedIdentity.replace("{last4}", profile.identityLast4) : undefined}
              placeholder={values.identityType ? identityExamples[values.identityType] : undefined}
              aria-describedby={identityFormat && !invalidIdentityFormat ? "profile-identity-format" : undefined}
              value={values.identityNumber} dir="ltr" inputMode={values.identityType === "passport" ? "text" : "numeric"}
              autoComplete="off" maxLength={20} error={invalidIdentityFormat ?? errorText("identityNumber")}
              onChange={(event) => { update("identityNumber", event.target.value); setRemoveIdentity(false); }}
            />
            {identityFormat && !invalidIdentityFormat ? <span id="profile-identity-format" className="sr-only">{identityFormat}</span> : null}
            {profile.identityLast4 && !removeIdentity ? <Button variant="secondary" size="small" onClick={() => { update("identityType", ""); update("identityNumber", ""); setRemoveIdentity(true); }}>{copy.removeIdentity}</Button> : null}
          </div>
        </fieldset>
        <div className="participant-account-trap" aria-hidden="true"><label htmlFor="profile-website">Website</label><input id="profile-website" name="website" autoComplete="off" tabIndex={-1} /></div>
      </fieldset>
      <div className="participant-account-actions">
        <Button type="submit" disabled={pending || !formToken || state === "conflict"}>{copy.save}</Button>
        <Button variant="secondary" disabled={pending} onClick={cancelEdit}>{copy.cancel}</Button>
      </div>
    </form> : null}
  </section>;
}
