import "server-only";

import { siteOrigin } from "@/lib/metadata";

/** Static PNG from the approved MSRC 2026 homepage still; no remote fonts or tracking. */
export const participantEmailBanner = Object.freeze({
  src: `${siteOrigin}/brand/email-banner.png`, alt: "MSRC 2026 conference audience — previous edition", width: 600, height: 338,
});

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

/** Only fixed site destinations are linked. Participant/staff text is always escaped. */
export function renderParticipantBody(english: string[], arabic: string[], links: string[]): { text: string; html: string } {
  const paragraphs = (values: string[]) => values.map((paragraph) => {
    const link = links.find((url) => paragraph.endsWith(url));
    const content = link ? escapeEmailHtml(paragraph.slice(0, -link.length))
      + `<a dir="ltr" href="${escapeEmailHtml(link)}" style="color:#563681;overflow-wrap:anywhere">${escapeEmailHtml(link)}</a>`
      : escapeEmailHtml(paragraph);
    return `<p style="margin:0 0 20px;white-space:pre-wrap;overflow-wrap:anywhere">${content}</p>`;
  }).join("");
  const text = `${participantEmailBanner.alt}: ${participantEmailBanner.src}\n\n${english.join("\n\n")}\n\n---\n\n${arabic.join("\n\n")}`;
  const html = `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MSRC 2027</title></head>`
    + `<body style="margin:0;background-color:#f5f3f7;color:#211a2d;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7">`
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">`
    + `<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff"><tr><td>`
    + `<img src="${participantEmailBanner.src}" alt="${participantEmailBanner.alt}" width="600" height="338" style="display:block;width:100%;max-width:600px;height:auto;border:0">`
    + `</td></tr><tr><td style="padding:28px 24px"><div dir="ltr" lang="en">${paragraphs(english)}</div>`
    + `<hr style="border:0;border-top:1px solid #d9d2e1;margin:28px 0">`
    + `<div dir="rtl" lang="ar" style="font-family:'Noto Sans Arabic',Tahoma,Arial,sans-serif;text-align:right">${paragraphs(arabic)}</div>`
    + `</td></tr></table></td></tr></table></body></html>`;
  return { text, html };
}
