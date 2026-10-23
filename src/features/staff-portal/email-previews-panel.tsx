"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { emailPreviewsCopy } from "./email-previews-copy";
import type { StaffEmailPreview } from "./ui-contract";

function BilingualSubject({ value }: { value: string }) {
  const divider = value.indexOf(" | ");
  return divider < 0 ? <span lang="en" dir="ltr">{value}</span>
    : <><span lang="en" dir="ltr">{value.slice(0, divider)}</span>{" | "}<span lang="ar" dir="rtl">{value.slice(divider + 3)}</span></>;
}

function EmailPreview({ locale, preview }: { locale: Locale; preview: StaffEmailPreview }) {
  const copy = emailPreviewsCopy[locale];
  const [outcome, setOutcome] = useState<"copied" | "copyFailed" | null>(null);
  async function copyText() {
    try { await navigator.clipboard.writeText(preview.text); setOutcome("copied"); }
    catch { setOutcome("copyFailed"); }
  }
  const [englishPlainText, arabicPlainText] = preview.text.split("\n\n---\n\n");
  return <article className="staff-panel staff-email-preview" aria-labelledby={`email-${preview.previewKey}`} data-testid="email-preview">
    <div className="staff-detail-head">
      <h2 id={`email-${preview.previewKey}`} dir="ltr"><BilingualSubject value={preview.subject} /></h2>
      <Button variant="secondary" size="small" onClick={() => void copyText()}>{copy.copy}<span className="sr-only" dir="ltr">: <BilingualSubject value={preview.subject} /></span></Button>
    </div>
    <p className="staff-muted">{copy.version}: <bdi>{preview.templateVersion}</bdi> · <bdi>{preview.templateKey}</bdi></p>
    <p className="staff-note">{copy.draft}</p>
    <p>{copy.recipient}: <bdi>{preview.recipient}</bdi></p>
    <h3>{copy.subject}</h3><p dir="ltr" data-testid="email-preview-subject"><BilingualSubject value={preview.subject} /></p>
    <h3>{copy.rendered}</h3>
    <div className="staff-email-message" data-testid="email-preview-message">
      <Image src="/brand/email-banner.png" alt={preview.banner.alt} width={preview.banner.width} height={preview.banner.height} unoptimized className="staff-email-banner" />
      <div className="staff-email-message-body">
        <div lang="en" dir="ltr" data-testid="email-message-english">{preview.englishText.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <hr />
        <div lang="ar" dir="rtl" className="staff-email-arabic" data-testid="email-message-arabic">{preview.arabicText.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      </div>
    </div>
    <h3>{copy.text}</h3><pre dir="ltr" className="staff-email-text" data-testid="email-preview-text"><span lang="en" dir="ltr">{englishPlainText}</span>{"\n\n---\n\n"}<span lang="ar" dir="rtl" className="staff-email-arabic">{arabicPlainText}</span></pre>
    {preview.html ? <details className="staff-history"><summary>{copy.html}</summary><pre lang="en" dir="ltr" className="staff-email-text staff-email-source" data-testid="email-preview-html"><code>{preview.html}</code></pre></details> : null}
    <p className="staff-email-copy-status" role="status" aria-live="polite">{outcome ? copy[outcome] : ""}</p>
  </article>;
}

/** React renders structured text and the local brand asset; email HTML remains escaped source. */
export function EmailPreviewsPanel({ locale, previews }: { locale: Locale; previews?: StaffEmailPreview[] }) {
  const copy = emailPreviewsCopy[locale];
  return <div className="staff-email-previews">
    <section className="staff-panel" aria-label={copy.synthetic}>
      <p className="staff-badge">{copy.synthetic}</p>
      <p>{copy.intro}</p><p className="staff-muted">{copy.sample}</p>
    </section>
    {previews ? previews.map((preview) => <EmailPreview key={preview.previewKey} locale={locale} preview={preview} />)
      : <p role="status">{copy.loading}</p>}
  </div>;
}
