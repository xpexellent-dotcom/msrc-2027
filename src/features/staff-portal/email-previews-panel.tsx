"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { emailPreviewsCopy } from "./email-previews-copy";
import type { StaffEmailPreview } from "./ui-contract";

function EmailPreview({ locale, preview }: { locale: Locale; preview: StaffEmailPreview }) {
  const copy = emailPreviewsCopy[locale];
  const [outcome, setOutcome] = useState<"copied" | "copyFailed" | null>(null);
  async function copyText() {
    try { await navigator.clipboard.writeText(preview.text); setOutcome("copied"); }
    catch { setOutcome("copyFailed"); }
  }
  return <article className="staff-panel staff-email-preview" aria-labelledby={`email-${preview.templateKey}`} data-testid="email-preview">
    <div className="staff-detail-head">
      <h2 id={`email-${preview.templateKey}`} lang="en" dir="ltr">{preview.subject}</h2>
      <Button variant="secondary" size="small" onClick={() => void copyText()}>{copy.copy}<span className="sr-only" lang="en" dir="ltr">: {preview.subject}</span></Button>
    </div>
    <p className="staff-muted">{copy.version}: <bdi>{preview.templateVersion}</bdi> · <bdi>{preview.templateKey}</bdi></p>
    <p>{copy.recipient}: <bdi>{preview.recipient}</bdi></p>
    <h3>{copy.subject}</h3><p lang="en" dir="ltr" data-testid="email-preview-subject">{preview.subject}</p>
    <h3>{copy.text}</h3><pre lang="en" dir="ltr" className="staff-email-text" data-testid="email-preview-text">{preview.text}</pre>
    {preview.html ? <details className="staff-history"><summary>{copy.html}</summary><pre lang="en" dir="ltr" className="staff-email-text staff-email-source" data-testid="email-preview-html"><code>{preview.html}</code></pre></details> : null}
    <p className="staff-email-copy-status" role="status" aria-live="polite">{outcome ? copy[outcome] : ""}</p>
  </article>;
}

/** React escapes all three representations; email markup never becomes active page content. */
export function EmailPreviewsPanel({ locale, previews }: { locale: Locale; previews?: StaffEmailPreview[] }) {
  const copy = emailPreviewsCopy[locale];
  return <div className="staff-email-previews">
    <section className="staff-panel" aria-label={copy.synthetic}>
      <p className="staff-badge">{copy.synthetic}</p><p className="staff-note">{copy.approved}</p>
      <p>{copy.intro}</p><p className="staff-muted">{copy.sample}</p>
    </section>
    {previews ? previews.map((preview) => <EmailPreview key={preview.templateKey} locale={locale} preview={preview} />)
      : <p role="status">{copy.loading}</p>}
  </div>;
}
