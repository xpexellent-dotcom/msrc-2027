"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { formatStaffDate } from "./console-shell";
import type { ParticipantDetail, ParticipantDetailResponse } from "./participant-detail-contract";
import { ProfileAvatar } from "@/features/participant-accounts/profile-avatar";
import { SAUDI_UNIVERSITIES } from "@/content/saudi-universities";
import { profileCopy } from "@/features/participant-accounts/profile-copy";

const detailCopy = {
  en: {
    title: "Participant details", close: "Close details", loading: "Loading participant…", account: "Account", name: "Name", email: "Email", status: "Status",
    created: "Account created", verified: "Email verified", lastSignIn: "Last sign-in", privacy: "Privacy notice accepted", age: "18+ confirmed",
    registration: "Conference registration", registrationStatus: "Request status", requested: "Requested", decided: "Decided", identity: "Identity document",
    ticket: "Ticket", attendance: "Attendance", workshops: "Workshops", submissions: "Abstract submissions", competitions: "Competitions",
    arabicName: "Full name in Arabic", nationality: "Nationality", gender: "Gender", dateOfBirth: "Date of birth", city: "City", male: "Male", female: "Female",
    hackathonProfile: "Hackathon profile", university: "University", field: "Field of study", phone: "Contact phone", enrolled: "Enrolled in Saudi Arabia",
    certificates: "Certificates", none: "None", yes: "Yes", no: "No", lead: "Lead", member: "Member", accepted: "accepted", pending: "pending acceptance",
    statuses: { verified: "Verified", unverified: "Unverified", suspended: "Suspended" },
    states: { denied: "You do not have access to participant details.", not_found: "This participant could not be found.", unavailable: "Participant details are unavailable. Try again.", invalid: "Participant details are unavailable. Try again.", "area-not-ready": "Participant details are not available yet.", closed: "The staff portal is closed." },
    kinds: { hackathon: "Hackathon", three_minute_thesis: "3MT" } as Record<string, string>,
  },
  ar: {
    arabicName: "الاسم الكامل بالعربية", nationality: "الجنسية", gender: "الجنس", dateOfBirth: "تاريخ الميلاد", city: "المدينة", male: "ذكر", female: "أنثى",
    title: "تفاصيل المشارك", close: "إغلاق التفاصيل", loading: "جارٍ تحميل بيانات المشارك…", account: "الحساب", name: "الاسم", email: "البريد الإلكتروني", status: "الحالة",
    created: "تاريخ إنشاء الحساب", verified: "تاريخ توثيق البريد", lastSignIn: "آخر تسجيل دخول", privacy: "إشعار الخصوصية المقبول", age: "تأكيد بلوغ ١٨ عامًا",
    registration: "التسجيل في المؤتمر", registrationStatus: "حالة الطلب", requested: "تاريخ الطلب", decided: "تاريخ القرار", identity: "وثيقة الهوية",
    ticket: "التذكرة", attendance: "الحضور", workshops: "ورش العمل", submissions: "الملخصات المقدمة", competitions: "المسابقات",
    hackathonProfile: "ملف الهاكاثون", university: "الجامعة", field: "التخصص الدراسي", phone: "هاتف التواصل", enrolled: "مقيد في جامعة سعودية",
    certificates: "الشهادات", none: "لا يوجد", yes: "نعم", no: "لا", lead: "قائد الفريق", member: "عضو", accepted: "مقبول", pending: "بانتظار القبول",
    statuses: { verified: "موثّق", unverified: "غير موثّق", suspended: "معلّق" },
    states: { denied: "ليست لديك صلاحية عرض تفاصيل المشاركين.", not_found: "تعذر العثور على هذا المشارك.", unavailable: "تفاصيل المشارك غير متاحة. حاول مرة أخرى.", invalid: "تفاصيل المشارك غير متاحة. حاول مرة أخرى.", "area-not-ready": "تفاصيل المشاركين غير متاحة بعد.", closed: "بوابة الموظفين مغلقة." },
    kinds: { hackathon: "الهاكاثون", three_minute_thesis: "أطروحة في ثلاث دقائق" } as Record<string, string>,
  },
} as const;

function Row({ label, children }: { label: string; children: ReactNode }) { return <div><dt>{label}</dt><dd>{children}</dd></div>; }

/** ENG-083: read-only view of one participant; identity stays masked (the audited reveal is separate). */
export function ParticipantDetailPanel({ locale, actorId, onClose }: { locale: Locale; actorId: string; onClose: () => void }) {
  const copy = detailCopy[locale];
  const profileText = profileCopy[locale];
  const [state, setState] = useState<ParticipantDetailResponse | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/staff-portal/participant-detail?${new URLSearchParams({ actorId })}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const value = await response.json() as ParticipantDetailResponse;
        if (!controller.signal.aborted) setState(value && typeof value.state === "string" ? value : { state: "unavailable" });
      } catch { if (!controller.signal.aborted) setState({ state: "unavailable" }); }
    })();
    return () => controller.abort();
  }, [actorId]);
  useEffect(() => { heading.current?.focus(); }, [state]);
  const date = (value: string | null | undefined) => value ? formatStaffDate(value, locale, copy.none) : copy.none;
  const person: ParticipantDetail | null = state?.state === "ready" ? state.participant : null;
  return <section className="staff-panel staff-participant-detail" aria-labelledby="participant-detail-title" data-testid="participant-detail">
    <div className="staff-participant-detail-header">
      <h2 id="participant-detail-title" ref={heading} tabIndex={-1}>{person ? <bdi>{person.name}</bdi> : copy.title}</h2>
      <Button variant="secondary" size="small" onClick={onClose}>{copy.close}</Button>
    </div>
    {!state ? <p role="status">{copy.loading}</p> : !person ? <p role="alert">{copy.states[state.state as keyof typeof copy.states] ?? copy.states.unavailable}</p> : <>
      <h3>{copy.account}</h3>
      <dl className="staff-detail-list">
        <Row label={copy.email}><bdi dir="ltr">{person.email}</bdi></Row>
        <Row label={copy.status}>{copy.statuses[person.status]}</Row>
        <Row label={copy.created}>{date(person.createdAt)}</Row>
        <Row label={copy.verified}>{date(person.verifiedAt)}</Row>
        <Row label={copy.lastSignIn}>{date(person.lastSignInAt)}</Row>
        <Row label={copy.privacy}><bdi dir="ltr">{person.privacyVersion ?? copy.none}</bdi></Row>
        <Row label={copy.age}>{date(person.ageConfirmedAt)}</Row>
      </dl>
      {person.optionalProfile ? <section aria-labelledby="staff-participant-optional-profile" data-testid="staff-participant-profile">
        <h3 id="staff-participant-optional-profile">{profileText.optionalProfile}</h3>
        <dl className="staff-detail-list">
          <Row label={profileText.picture}><ProfileAvatar name={person.name} url={person.optionalProfile.avatarUrl} /></Row>
          <Row label={profileText.institution}><bdi dir="auto">{(SAUDI_UNIVERSITIES.find((item) => item.id === person.optionalProfile!.institutionId)?.[locale === "ar" ? "nameAr" : "nameEn"] ?? person.optionalProfile.institutionOther) ?? copy.none}</bdi></Row>
          <Row label={profileText.status}>{person.optionalProfile.status ? profileText.statuses[person.optionalProfile.status] : copy.none}</Row>
          <Row label={copy.arabicName}><bdi dir="rtl" lang="ar">{person.optionalProfile.arabicName ?? copy.none}</bdi></Row>
          <Row label={copy.nationality}>{person.optionalProfile.nationality ? new Intl.DisplayNames([locale], { type: "region" }).of(person.optionalProfile.nationality) : copy.none}</Row>
          <Row label={copy.gender}>{person.optionalProfile.gender ? copy[person.optionalProfile.gender] : copy.none}</Row>
          <Row label={copy.dateOfBirth}><bdi dir="ltr">{person.optionalProfile.dateOfBirth ?? copy.none}</bdi></Row>
          <Row label={copy.city}><bdi dir="auto">{person.optionalProfile.city ?? copy.none}</bdi></Row>
          <Row label={copy.phone}><bdi dir="ltr">{person.optionalProfile.phone ?? copy.none}</bdi></Row>
          <Row label={copy.identity}><bdi dir="ltr">{person.optionalProfile.identityLast4 ? "••••" + person.optionalProfile.identityLast4 : copy.none}</bdi></Row>
          <Row label={profileText.interests}>{person.optionalProfile.interests.length ? person.optionalProfile.interests.map((id) => <div key={id}><bdi dir="ltr" lang="en">{person.optionalProfile!.specialties.find((option) => option.id === id)?.label ?? id}</bdi></div>) : copy.none}</Row>
        </dl>
      </section> : null}
      <h3>{copy.registration}</h3>
      {person.registration ? <dl className="staff-detail-list">
        <Row label={copy.registrationStatus}><bdi dir="ltr">{person.registration.status}</bdi></Row>
        <Row label={copy.requested}>{date(person.registration.createdAt)}</Row>
        <Row label={copy.decided}>{date(person.registration.decidedAt)}</Row>
        <Row label={copy.identity}><bdi dir="ltr">{person.registration.identityMasked ?? copy.none}</bdi></Row>
        <Row label={copy.ticket}>{person.registration.ticket ? <><bdi dir="ltr">{person.registration.ticket.reference}</bdi> · <bdi dir="ltr">{person.registration.ticket.status}</bdi></> : copy.none}</Row>
        <Row label={copy.attendance}>{person.registration.attendance.length ? person.registration.attendance.map((day) => <div key={day.day}><bdi dir="ltr">{day.day}</bdi> · {date(day.checkedInAt)}</div>) : copy.none}</Row>
      </dl> : <p>{copy.none}</p>}
      <h3>{copy.workshops}</h3>
      {person.workshops.length ? <ul>{person.workshops.map((item, index) => <li key={index}><bdi>{locale === "ar" && item.titleAr ? item.titleAr : item.title}</bdi> · <bdi dir="ltr">{item.status}</bdi>{item.startAt ? <> · {date(item.startAt)}</> : null}</li>)}</ul> : <p>{copy.none}</p>}
      <h3>{copy.submissions}</h3>
      {person.submissions.length ? <ul>{person.submissions.map((item, index) => <li key={index}><bdi dir="ltr">{item.reference ?? "—"}</bdi> · <bdi lang="en" dir="ltr">{item.title ?? "—"}</bdi> · <bdi dir="ltr">{item.status}</bdi></li>)}</ul> : <p>{copy.none}</p>}
      <h3>{copy.competitions}</h3>
      {person.competitions.length ? <ul>{person.competitions.map((item, index) => <li key={index}>{copy.kinds[item.kind] ?? item.kind} · <bdi lang="en" dir="ltr">{item.title ?? "—"}</bdi> · <bdi dir="ltr">{item.status}</bdi> · {item.isLead ? copy.lead : `${copy.member} (${item.confirmed ? copy.accepted : copy.pending})`}</li>)}</ul> : <p>{copy.none}</p>}
      {person.hackathonProfile ? <><h3>{copy.hackathonProfile}</h3><dl className="staff-detail-list">
        <Row label={copy.university}><bdi>{person.hackathonProfile.university}</bdi></Row>
        <Row label={copy.field}><bdi>{person.hackathonProfile.fieldOfStudy}</bdi></Row>
        <Row label={copy.phone}><bdi dir="ltr">{person.hackathonProfile.phone}</bdi></Row>
        <Row label={copy.enrolled}>{person.hackathonProfile.enrolled ? copy.yes : copy.no}</Row>
      </dl></> : null}
      <h3>{copy.certificates}</h3>
      {person.certificates.length ? <ul>{person.certificates.map((item, index) => <li key={index}><bdi dir="ltr">{item.kind}</bdi>{item.activity ? <> · <bdi>{item.activity}</bdi></> : null} · <bdi dir="ltr">{item.status}</bdi> · {date(item.issuedAt)}</li>)}</ul> : <p>{copy.none}</p>}
    </>}
  </section>;
}
