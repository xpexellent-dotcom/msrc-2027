"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { participantAnnouncementProjection, type ParticipantAnnouncementsResponse } from "./participant-contracts";
import { participantAnnouncementsCopy } from "./participant-copy";

function paragraphs(body: string) {
  return body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>);
}

export function ParticipantInbox({ locale, initialState }: { locale: Locale; initialState?: ParticipantAnnouncementsResponse }) {
  const copy = participantAnnouncementsCopy[locale];
  const [state, setState] = useState<ParticipantAnnouncementsResponse | null>(initialState ?? null);
  const [generation, setGeneration] = useState(0), [pending, setPending] = useState<string | null>(null), [failed, setFailed] = useState(false), [saved, setSaved] = useState(false);
  const mounted = useRef(false), requestGeneration = useRef(0);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController(), sequence = ++requestGeneration.current;
    async function read() {
      try {
        const response = await fetch("/api/announcements?locale=" + locale, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const value: ParticipantAnnouncementsResponse = await response.json();
        if (controller.signal.aborted || sequence !== requestGeneration.current) return;
        const rows = value.state === "ready" ? participantAnnouncementProjection({ state: "ready", announcements: value.announcements }) : null;
        setState(rows && typeof value.formToken === "string" ? { state: "ready", announcements: rows, formToken: value.formToken }
          : { state: value.state === "area-not-ready" || value.state === "closed" || value.state === "denied" ? value.state : "unavailable" });
      } catch { if (!controller.signal.aborted && sequence === requestGeneration.current) setState({ state: "unavailable" }); }
    }
    void read();
    return () => { mounted.current = false; controller.abort(); requestGeneration.current += 1; };
  }, [locale, generation]);

  async function markRead(id: string) {
    if (pending || !state?.formToken) return;
    const sequence = ++requestGeneration.current;
    setPending(id); setFailed(false); setSaved(false);
    try {
      const response = await fetch("/api/announcements?locale=" + locale, { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ announcementId: id, formToken: state.formToken }) });
      const value: ParticipantAnnouncementsResponse = await response.json();
      if (!mounted.current || sequence !== requestGeneration.current) return;
      const rows = response.ok && value.state === "ready" ? participantAnnouncementProjection({ state: "ready", announcements: value.announcements }) : null;
      if (rows && typeof value.formToken === "string") { setState({ state: "ready", announcements: rows, formToken: value.formToken }); setSaved(true); }
      else if (value.state === "denied" || value.state === "closed") setState({ state: value.state });
      else setFailed(true);
    } catch { if (mounted.current && sequence === requestGeneration.current) setFailed(true); }
    finally { if (mounted.current && sequence === requestGeneration.current) setPending(null); }
  }
  if (state?.state === "denied" || state?.state === "closed") return null;
  return <section className="participant-announcements" aria-labelledby="participant-announcements-heading" data-testid="participant-announcements">
    <header><h2 id="participant-announcements-heading">{copy.title}</h2><p>{copy.lead}</p></header>
    {!state ? <p role="status">{copy.loading}</p> : state.state !== "ready" ? <>
      <p role="status">{state.state === "area-not-ready" ? copy.notReady : copy.unavailable}</p>
      <Button variant="secondary" onClick={() => setGeneration((value) => value + 1)}>{copy.retry}</Button>
    </> : <>
      <p role="status" className="participant-announcements-feedback" data-error={failed}>{failed ? copy.readFailure : saved ? copy.readSaved : ""}</p>
      {!state.announcements?.length ? <p>{copy.empty}</p> : <ol className="participant-announcements-list">
        {state.announcements.map((item) => <li key={item.id}><article className="participant-announcement" aria-labelledby={"announcement-" + item.id}>
          <header><h3 id={"announcement-" + item.id} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>{locale === "ar" ? item.subjectAr : item.subjectEn}</h3>
            <div className="participant-announcement-meta"><time dateTime={item.publishedAt}>{new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", {
              day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh",
            }).format(new Date(item.publishedAt))} ({copy.riyadh})</time><span className="participant-announcement-read" data-read={Boolean(item.readAt)}>{item.readAt ? copy.read : copy.unread}</span></div>
          </header>
          <div className="participant-announcement-body" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>{paragraphs(locale === "ar" ? item.bodyAr : item.bodyEn)}</div>
          <details className="participant-announcement-translation"><summary>{copy.otherLanguage}</summary>
            <div lang={locale === "ar" ? "en" : "ar"} dir={locale === "ar" ? "ltr" : "rtl"}>
              <h4>{locale === "ar" ? item.subjectEn : item.subjectAr}</h4><div className="participant-announcement-body">{paragraphs(locale === "ar" ? item.bodyEn : item.bodyAr)}</div>
            </div>
          </details>
          {!item.readAt && state.formToken ? <Button className="participant-announcement-mark" variant="secondary" disabled={pending !== null} onClick={() => void markRead(item.id)}>{pending === item.id ? copy.markingRead : copy.markRead}</Button> : null}
        </article></li>)}
      </ol>}
    </>}
  </section>;
}
