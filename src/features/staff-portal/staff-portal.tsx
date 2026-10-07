"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { Locale } from "@/lib/i18n";
import type { Role } from "@/lib/permissions/contract";
import { staffCopy } from "./copy";
import { auditActionLabel, auditResultLabel, auditSearchQuery } from "./audit-labels";
import { canChangeOwnPassword, canRevealIdentity, STAFF_ROLES, staffMenu } from "./menu";
import { IdentityDocument } from "./identity-document";
import { PasswordChangeForm } from "./password-change-form";
import { clearStaffDraft, normalizeStaffCode, requestStaff, updateStaffDraft, useStaffDraft } from "./staff-client";
import type { StaffAction, StaffArea, StaffPayload, StaffPerson, StaffProfile, StaffResponse, StaffScreen } from "./ui-contract";

const errors = new Set(["closed", "unavailable", "invalid-input", "invalid-credentials", "invalid-code", "denied", "limited", "reauthentication-required"]);
function areaFor(screen: StaffScreen): StaffArea | undefined { return screen === "people" || screen === "audit" || screen === "participants" ? screen : undefined; }
function date(value: string | null, locale: Locale, fallback: string) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh", calendar: "gregory" }).format(parsed) : fallback;
}

function RolePicker({ locale, roles, onChange, disabled, ownSuperAdmin = false, id }: { locale: Locale; roles: Role[]; onChange: (roles: Role[]) => void; disabled: boolean; ownSuperAdmin?: boolean; id: string }) {
  const copy = staffCopy[locale];
  return <fieldset className="staff-role-picker" disabled={disabled} id={id}><legend>{copy.roles}</legend>
    {STAFF_ROLES.map((role) => <label key={role}><input type="checkbox" value={role} checked={roles.includes(role)} disabled={ownSuperAdmin && role === "superAdmin"} onChange={(event) => onChange(event.target.checked ? [...roles, role] : roles.filter((item) => item !== role))} /><span>{copy.roleLabels[role]}</span></label>)}
  </fieldset>;
}

function PersonActions({ locale, person, actorId, busy, act }: { locale: Locale; person: StaffPerson; actorId: string; busy: boolean; act: (payload: Omit<StaffPayload, "formToken">) => Promise<StaffResponse> }) {
  const copy = staffCopy[locale];
  const [roles, setRoles] = useState(person.roles);
  const own = person.actorId === actorId;
  const superAdmin = person.roles.includes("superAdmin");
  return <details className="staff-person-actions"><summary>{copy.editRoles}</summary>
    <RolePicker locale={locale} roles={roles} onChange={setRoles} disabled={busy} ownSuperAdmin={own && superAdmin} id={`roles-${person.actorId}`} />
    <div className="staff-actions">
      <Button size="small" disabled={busy} onClick={() => void act({ action: "roles", targetId: person.actorId, roles })}>{copy.saveRoles}</Button>
      {!own ? <Button size="small" variant="secondary" disabled={busy} onClick={() => void act({ action: person.status === "active" ? "suspend" : "reactivate", targetId: person.actorId })}>{person.status === "active" ? copy.suspend : copy.reactivate}</Button> : null}
      <Button size="small" variant="secondary" disabled={busy} onClick={() => void act({ action: "revoke-sessions", targetId: person.actorId })}>{copy.revokeSessions}</Button>
      {superAdmin && !own ? <><Button size="small" variant="secondary" disabled={busy} onClick={() => void act({ action: "reset-authenticator", targetId: person.actorId })}>{copy.resetAuthenticator}</Button><Button size="small" variant="secondary" disabled={busy} onClick={() => void act({ action: "reset-account", targetId: person.actorId })}>{copy.resetAccount}</Button></> : null}
    </div>
  </details>;
}

export function StaffPortal({ locale, screen, initialProfile, initialPasswordChangeAvailable = false, testMode = false }: { locale: Locale; screen: StaffScreen; initialProfile: StaffProfile | null; initialPasswordChangeAvailable?: boolean; testMode?: boolean }) {
  const copy = staffCopy[locale], router = useRouter(), draft = useStaffDraft();
  const [view, setView] = useState<StaffResponse>({ state: initialProfile ? "authenticated" : "ready", profile: initialProfile });
  const [busy, setBusy] = useState(true), [outcome, setOutcome] = useState<string>(""), [query, setQuery] = useState("");
  const [signOutFailure, setSignOutFailure] = useState(false);
  const [passwordChangeRequested, setPasswordChangeRequested] = useState(false);
  const inviteEmail = draft.inviteEmail, inviteRoles = draft.inviteRoles;
  const setInviteEmail = (value: string) => updateStaffDraft({ inviteEmail: value });
  const setInviteRoles = (value: Role[]) => updateStaffDraft({ inviteRoles: value });
  const lock = useRef(false), formToken = useRef<string | undefined>(undefined), feedback = useRef<HTMLDivElement>(null);
  const searchQuery = useRef("");
  const logoutRequested = useRef(false);
  const generation = useRef(0), alive = useRef(true), area = areaFor(screen);
  const passwordChangeAvailable = view.passwordChangeAvailable ?? initialPasswordChangeAvailable;
  const profile = view.profile ?? null, menu = profile ? staffMenu(profile.roles, { passwordChangeAvailable }) : [];
  const permitted = screen === "security" ? passwordChangeAvailable && !!profile && canChangeOwnPassword(profile.roles) : !area || menu.some((entry) => entry.key === area);
  const enrollment = view.enrollment ?? draft.enrollment;
  const verification = view.state === "pending-email" || view.state === "pending-totp" || view.state === "enroll-totp";
  const language = locale === "en" ? "ar" : "en";
  useEffect(() => { searchQuery.current = query; }, [query]);

  const restore = useCallback(async (signal?: AbortSignal, search = "") => {
    const before = generation.current;
    let response = await requestStaff(undefined, { signal });
    if (!logoutRequested.current && response.state === "authenticated" && area) response = await requestStaff(undefined, { area, query: area === "audit" ? auditSearchQuery(search, locale) : search, signal });
    if (!alive.current || signal?.aborted || lock.current || before !== generation.current) return;
    formToken.current = response.formToken;
    setView((previous) => logoutRequested.current ? { state: "ready", profile: null } : { ...response, enrollment: response.state === "pending-totp" ? previous.enrollment : undefined });
    if (errors.has(response.state)) setOutcome(response.state);
    setBusy(false);
  }, [area, locale]);

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    const startup = window.setTimeout(() => { void restore(controller.signal); }, 0);
    if (screen === "accept-invitation") {
      const parameters = new URLSearchParams(window.location.hash.slice(1));
      const invitationId = parameters.get("invitation"), token = parameters.get("token");
      if (invitationId && token) updateStaffDraft({ invitationId, token });
      if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && !lock.current) void restore(undefined, searchQuery.current); }, 60_000);
    const clearPrivate = () => { formToken.current = undefined; setView({ state: "ready", profile: null }); };
    const resume = (event: PageTransitionEvent) => { if (event.persisted) void restore(); };
    window.addEventListener("pagehide", clearPrivate); window.addEventListener("pageshow", resume);
    return () => { alive.current = false; controller.abort(); window.clearTimeout(startup); window.clearInterval(timer); window.removeEventListener("pagehide", clearPrivate); window.removeEventListener("pageshow", resume); };
  }, [restore, screen]);

  useEffect(() => { if (outcome && (errors.has(outcome) || outcome in copy.errors)) feedback.current?.focus(); }, [outcome, copy.errors]);

  async function act(payload: Omit<StaffPayload, "formToken">): Promise<StaffResponse> {
    if (lock.current || !formToken.current) return { state: "unavailable" };
    lock.current = true; generation.current += 1; setBusy(true); setOutcome("");
    setSignOutFailure(false);
    if (payload.action === "logout") {
      logoutRequested.current = true;
      setView({ state: "ready", profile: null });
      clearStaffDraft();
    }
    if (payload.action === "password-change") setPasswordChangeRequested(true);
    const response = await requestStaff({ ...payload, formToken: formToken.current });
    formToken.current = response.formToken;
    if (!alive.current) { lock.current = false; return response; }
    setOutcome(response.state);
    if (payload.action === "password-change" && ["password-changed", "reauthentication-required", "unavailable"].includes(response.state)) {
      logoutRequested.current = true;
      setView({ state: "ready", profile: null });
      clearStaffDraft();
    }
    if (["signin", "invite-accept"].includes(payload.action) && ["authenticated", "pending-email", "pending-totp", "enroll-totp"].includes(response.state)) logoutRequested.current = false;
    if (["signin", "invite-accept", "enroll-totp", "challenge-totp", "challenge-email", "verify-email", "verify-totp", "logout"].includes(payload.action)) {
      if (!errors.has(response.state)) setView((previous) => ({ ...response, enrollment: response.state === "pending-totp" ? response.enrollment ?? previous.enrollment : undefined }));
      if (!errors.has(response.state)) updateStaffDraft({ password: "", code: "", ...(payload.action === "invite-accept" ? { invitationId: "", token: "" } : {}) });
      if (response.enrollment) updateStaffDraft({ enrollment: response.enrollment });
      if (response.state === "authenticated" || response.state === "signed-out") updateStaffDraft({ enrollment: undefined });
      if (response.state === "authenticated") router.replace(`/${locale}/staff`);
      if (payload.action === "logout") {
        setView({ state: "ready", profile: null });
        clearStaffDraft();
        setSignOutFailure(response.state !== "signed-out");
        if (response.state === "signed-out") router.replace(`/${locale}/staff/sign-in`);
      }
    }
    lock.current = false; setBusy(false);
    if (!response.formToken) await restore();
    if ((["invited", "updated"].includes(response.state) && payload.action !== "reveal-identity")
      || ["reset-authenticator", "reset-account"].includes(payload.action) && response.state === "unavailable") await restore(undefined, query);
    return response;
  }

  function submit(event: FormEvent, action: StaffAction) {
    event.preventDefault();
    if (["verify-email", "verify-totp"].includes(action)) {
      if (!/^\d{6}$/.test(draft.code)) { setOutcome("code"); return; }
      void act({ action, code: draft.code, ...(action === "verify-totp" ? { factorId: view.factorId, challengeId: view.challengeId } : {}) }); return;
    }
    if (!draft.password || (action === "signin" ? !draft.email.trim() : !draft.name.trim())) { setOutcome("required"); return; }
    if (action === "invite-accept" && (Array.from(draft.password).length < 10 || new TextEncoder().encode(draft.password).length > 72)) { setOutcome("password"); return; }
    void act({ action, password: draft.password, ...(action === "signin" ? { email: draft.email } : { name: draft.name, invitationId: draft.invitationId, token: draft.token }) });
  }
  const passwordReentry = screen === "security" && passwordChangeRequested && ["password-changed", "reauthentication-required", "unavailable"].includes(outcome);
  const message = signOutFailure ? copy.signOutFailed : passwordReentry && outcome === "unavailable" ? copy.passwordChangeUnknown : outcome === "identity-unavailable" ? copy.identityPending : outcome in copy.states ? copy.states[outcome as keyof typeof copy.states] : outcome in copy.errors ? copy.errors[outcome as keyof typeof copy.errors] : "";
  const acceptedInvitation = screen === "accept-invitation" && view.state === "accepted" && !profile;
  const title = passwordReentry ? copy.security : verification ? view.state === "pending-email" ? copy.emailStep : view.state === "enroll-totp" ? copy.enroll : copy.totpStep : screen === "accept-invitation" && !profile ? copy.accept : !profile ? copy.signIn : screen === "home" || screen === "sign-in" || screen === "accept-invitation" ? copy.home : copy[screen];
  return <div className="staff-portal" data-testid="staff-portal" data-screen={screen}>
    <header className="staff-topbar"><span className="staff-wordmark" dir="ltr" lang="en">MSRC<span>2027</span></span><span>{copy.portal}</span><Link href={`/${language}/staff${screen === "home" ? "" : `/${screen}`}`} hrefLang={language} lang={language} dir={language === "ar" ? "rtl" : "ltr"} aria-label={copy.language}>{language === "ar" ? "العربية" : "English"}</Link></header>
    {testMode ? <p className="staff-test-note">{copy.testMode}</p> : null}
    <div className="staff-heading"><p className="eyebrow">{copy.private}</p><h1 tabIndex={-1}>{title}</h1>{profile ? <><p className="staff-name" data-testid="staff-name"><bdi>{profile.name}</bdi></p><p>{copy.roles}: {profile.roles.map((role) => copy.roleLabels[role]).join(locale === "ar" ? "، " : ", ")}</p><div className="staff-actions"><Link href={`/${locale}/staff`}>{copy.home}</Link><Button variant="secondary" size="small" disabled={busy} onClick={() => void act({ action: "logout" })}>{copy.signOut}</Button></div></> : null}</div>
    <div ref={feedback} tabIndex={-1} className={message ? "staff-feedback" : "staff-feedback staff-feedback--empty"} role={errors.has(outcome) || outcome in copy.errors ? "alert" : "status"} aria-live="polite">{busy ? copy.loading : message}</div>
    {signOutFailure ? <Button variant="secondary" disabled={busy} onClick={() => void act({ action: "logout" })}>{copy.retrySignOut}</Button> : null}
    {acceptedInvitation ? <section className="staff-panel staff-auth-panel"><p>{copy.inviteAcceptedFallback}</p><Link href={`/${locale}/staff/sign-in`}>{copy.signIn}</Link></section> : null}
    {passwordReentry ? <section className="staff-panel staff-auth-panel"><Link href={`/${locale}/staff/sign-in`}>{copy.signInAgain}</Link></section> : null}
    {!profile && !verification && !acceptedInvitation && !passwordReentry ? <section className="staff-panel staff-auth-panel">
      <p>{screen === "accept-invitation" ? copy.acceptIntro : copy.passwordIntro}</p>
      <p>{copy.inviteOnly}</p>
      {screen === "accept-invitation" && !draft.invitationId ? <p role="alert">{copy.inviteMissing}</p> : null}
      <form onSubmit={(event) => submit(event, screen === "accept-invitation" ? "invite-accept" : "signin")} aria-busy={busy}>
        {screen === "accept-invitation" ? <FormField id="staff-name" label={copy.name} value={draft.name} onChange={(event) => updateStaffDraft({ name: event.target.value })} autoComplete="name" required maxLength={120} disabled={busy} /> : <FormField id="staff-email" label={copy.email} type="email" value={draft.email} onChange={(event) => updateStaffDraft({ email: event.target.value })} dir="ltr" autoComplete="username" required maxLength={254} disabled={busy} />}
        <FormField id="staff-password" label={copy.password} type="password" hint={screen === "accept-invitation" ? copy.passwordHint : undefined} value={draft.password} onChange={(event) => updateStaffDraft({ password: event.target.value })} autoComplete={screen === "accept-invitation" ? "new-password" : "current-password"} required disabled={busy} />
        <Button type="submit" disabled={busy || screen === "accept-invitation" && !draft.invitationId}>{copy.next}</Button>
      </form>
    </section> : null}
    {verification ? <section className="staff-panel staff-auth-panel">
      <p>{view.state === "pending-email" ? copy.emailIntro : view.state === "enroll-totp" || enrollment ? copy.enrollIntro : copy.totpIntro}</p>
      {view.state === "enroll-totp" ? <Button disabled={busy} onClick={() => void act({ action: "enroll-totp" })}>{copy.startEnroll}</Button> : <>
        {enrollment ? <div className="staff-enrollment"><Image src={enrollment.qrCode} width={256} height={256} unoptimized alt={copy.qrAlt} /><details><summary>{copy.manual}</summary><code dir="ltr">{enrollment.secret}</code></details></div> : null}
        <form onSubmit={(event) => submit(event, view.state === "pending-email" ? "verify-email" : "verify-totp")} aria-busy={busy}>
          <FormField id="staff-code" label={view.state === "pending-email" ? copy.emailCode : copy.totpCode} hint={copy.codeHint} value={draft.code} onChange={(event) => updateStaffDraft({ code: normalizeStaffCode(event.target.value) })} dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required disabled={busy} />
          <div className="staff-actions"><Button type="submit" disabled={busy || view.state === "pending-email" && !view.challengeId}>{copy.verify}</Button><Button variant="secondary" disabled={busy} onClick={() => void act({ action: view.state === "pending-email" ? "challenge-email" : "challenge-totp" })}>{view.state === "pending-email" ? copy.requestCode : copy.newChallenge}</Button></div>
        </form>
      </>}
    </section> : null}
    {profile && !permitted ? <p role="alert">{copy.states.denied}</p> : null}
    {profile && permitted && screen !== "security" && (!area || screen === "sign-in") ? <nav aria-label={copy.menu} className="staff-menu"><h2>{copy.menu}</h2><ul>{menu.map((item) => <li key={item.key}>{item.built ? <Link href={`/${locale}/staff/${item.key}`}>{copy.areas[item.key]}</Link> : <div lang={item.englishOnly ? "en" : undefined} dir={item.englishOnly ? "ltr" : undefined}><span>{item.englishOnly ? staffCopy.en.areas[item.key] : copy.areas[item.key]}</span><span className="staff-badge">{item.englishOnly ? staffCopy.en.soon : copy.soon}</span></div>}</li>)}</ul>{!menu.length ? <p>{copy.noAreas}</p> : null}</nav> : null}
    {profile && permitted && screen === "security" ? <PasswordChangeForm locale={locale} busy={busy} act={act} /> : null}
    {profile && permitted && screen === "people" ? <>
      <section className="staff-panel" aria-labelledby="staff-invite-heading"><h2 id="staff-invite-heading">{copy.invite}</h2><p>{copy.inviteHint}</p><form onSubmit={(event) => { event.preventDefault(); if (!inviteRoles.length || !inviteEmail) { setOutcome("required"); return; } void act({ action: "invite", email: inviteEmail, roles: inviteRoles }); }} aria-busy={busy}>
        <FormField id="staff-invite-email" type="email" label={copy.email} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} dir="ltr" required maxLength={254} disabled={busy} /><RolePicker locale={locale} roles={inviteRoles} onChange={setInviteRoles} disabled={busy} id="invite-roles" /><Button type="submit" disabled={busy}>{copy.inviteSend}</Button>
      </form></section>
      <section className="staff-panel"><h2>{copy.staff}</h2><p>{copy.safeguards}</p><form className="staff-search" onSubmit={(event) => { event.preventDefault(); setBusy(true); void restore(undefined, query); }}><FormField id="staff-people-search" type="search" label={copy.searchPeople} value={query} onChange={(event) => setQuery(event.target.value)} maxLength={120} disabled={busy} /><Button type="submit" disabled={busy}>{copy.search}</Button></form><p className="staff-muted">{copy.resultLimit}</p><div className="staff-table-scroll" role="region" aria-label={copy.staff} tabIndex={0}><table><thead><tr><th scope="col">{copy.name}</th><th scope="col">{copy.roles}</th><th scope="col">{copy.status}</th><th scope="col">{copy.lastSignIn}</th><th scope="col">{copy.action}</th></tr></thead><tbody>{view.people?.map((person) => <tr key={person.actorId}><th scope="row"><bdi>{person.name}</bdi><span className="staff-email"><bdi dir="ltr">{person.email}</bdi></span></th><td>{person.roles.map((role) => copy.roleLabels[role]).join(locale === "ar" ? "، " : ", ")}</td><td><span>{copy.statuses[person.status]}</span>{person.recoveryState && person.recoveryState !== "none" ? <span className="staff-recovery-state">{copy.recoveryStates[person.recoveryState]}</span> : null}</td><td>{date(person.lastSignIn, locale, copy.unknown)}</td><td><PersonActions locale={locale} person={person} actorId={profile.actorId} busy={busy} act={act} /></td></tr>)}</tbody></table></div>{!view.people?.length ? <p>{copy.noRecords}</p> : null}</section>
      <section className="staff-panel"><h2>{copy.invitations}</h2><ul className="staff-invitations">{view.invitations?.map((invitation) => <li key={invitation.id}><bdi dir="ltr">{invitation.email}</bdi><span>{invitation.roles.map((role) => copy.roleLabels[role]).join(locale === "ar" ? "، " : ", ")} · {copy.statuses[invitation.status]}</span><span>{copy.expires}: {date(invitation.expiresAt, locale, copy.unknown)}</span>{invitation.status === "pending" || invitation.status === "expired" ? <div className="staff-actions"><Button size="small" variant="secondary" disabled={busy} onClick={() => void act({ action: "invite-resend", email: invitation.email, roles: invitation.roles })}>{copy.resend}</Button><Button size="small" variant="secondary" disabled={busy || invitation.status !== "pending"} onClick={() => void act({ action: "invite-revoke", invitationId: invitation.id })}>{copy.revokeInvite}</Button></div> : null}</li>)}</ul>{!view.invitations?.length ? <p>{copy.noRecords}</p> : null}</section>
    </> : null}
    {profile && permitted && (screen === "audit" || screen === "participants") ? <section className="staff-panel"><h2>{copy[screen]}</h2>{screen === "audit" ? <p>{copy.auditIntro}</p> : null}<form className="staff-search" onSubmit={(event) => { event.preventDefault(); setBusy(true); void restore(undefined, query); }}><FormField id="staff-search" type="search" label={screen === "audit" ? copy.searchAudit : copy.searchParticipants} value={query} onChange={(event) => setQuery(event.target.value)} maxLength={120} disabled={busy} /><Button type="submit" disabled={busy}>{copy.search}</Button></form>
      <p className="staff-muted">{copy.resultLimit}</p><div className="staff-table-scroll" role="region" aria-label={copy[screen]} tabIndex={0}>{screen === "audit" ? <table><thead><tr><th scope="col">{copy.actor}</th><th scope="col">{copy.action}</th><th scope="col">{copy.target}</th><th scope="col">{copy.when}</th><th scope="col">{copy.result}</th></tr></thead><tbody>{view.audit?.map((row) => <tr key={row.id}><td><bdi>{row.actorName ?? row.actorId ?? copy.unknown}</bdi></td><td><bdi>{auditActionLabel(row.action, locale)}</bdi></td><td><bdi>{row.targetName ?? row.targetId ?? copy.unknown}</bdi></td><td>{date(row.occurredAt, locale, copy.unknown)}</td><td><bdi>{auditResultLabel(row.result, locale)}</bdi></td></tr>)}</tbody></table> : <table><thead><tr><th scope="col">{copy.name}</th><th scope="col">{copy.email}</th><th scope="col">{copy.status}</th><th scope="col">{copy.created}</th><th scope="col">{copy.identifier}</th></tr></thead><tbody>{view.participants?.map((person) => <tr key={person.actorId}><th scope="row"><bdi>{person.name}</bdi></th><td><bdi dir="ltr">{person.email}</bdi></td><td>{copy.statuses[person.status]}</td><td>{date(person.createdAt, locale, copy.unknown)}</td><td><IdentityDocument locale={locale} masked={person.identityMasked ?? null} allowReveal={canRevealIdentity(profile.roles)} busy={busy} onReveal={() => act({ action: "reveal-identity", targetId: person.actorId })} /></td></tr>)}</tbody></table>}</div>{!(screen === "audit" ? view.audit : view.participants)?.length ? <p>{copy.noRecords}</p> : null}
    </section> : null}
    <footer className="staff-policy"><p>{copy.timeZone}</p><p>{copy.sessionPolicy}</p><p>{copy.recovery}</p></footer>
  </div>;
}
