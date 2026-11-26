import "server-only";

import { siteOrigin } from "@/lib/metadata";
import { emailBrand } from "./brand-layout";

/** ORG-062 plain branded PLACEHOLDER PNG; no remote fonts or tracking. */
export const participantEmailBanner = Object.freeze({
  src: `${siteOrigin}/brand/email-banner.png`, alt: "MSRC 2027", width: 600, height: 338,
});

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export type ParticipantEmailLayout = "brand-preview";

function renderBrandPreview(english: string, arabic: string): string {
  const { seal, wordmark } = emailBrand;
  // Inline equivalents of the MSRC site tokens for mail clients without a stylesheet.
  return `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MSRC 2027</title></head>`
    + `<body style="margin:0;background-color:#eee8f7;color:#1f1930;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65">`
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:16px 8px">`
    + `<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #d9d2df;border-radius:12px">`
    + `<tr><td align="left" dir="ltr" lang="en" bgcolor="#3b1e6d" style="padding:20px 24px;border-bottom:3px solid #e8d5a5;border-radius:11px 11px 0 0">`
    + `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>`
    + `<td valign="middle" style="padding-right:12px"><img src="${siteOrigin}${seal.src}" alt="MSRC seal" width="${seal.displaySize}" height="${seal.displaySize}" style="display:block;border:0;color:#f8f6f0;font:12px Arial,Helvetica,sans-serif"></td>`
    + `<td valign="middle" style="color:#f8f6f0;font:700 24px/1.2 Arial,Helvetica,sans-serif;letter-spacing:-.02em">${wordmark}</td>`
    + `</tr></table></td></tr><tr><td style="padding:24px;color:#1f1930;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65"><div dir="ltr" lang="en" style="text-align:left">${english}</div>`
    + `<hr style="border:0;border-top:1px solid #d9d2df;margin:24px 0">`
    + `<div dir="rtl" lang="ar" style="font-family:'Noto Sans Arabic',Tahoma,Arial,sans-serif;text-align:right">${arabic}</div>`
    + `</td></tr></table></td></tr></table></body></html>`;
}

/** Only fixed site destinations are linked. Participant/staff text is always escaped. */
export function renderParticipantBody(english: string[], arabic: string[], links: string[], layout?: ParticipantEmailLayout): { text: string; html: string } {
  const isBrandPreview = layout === "brand-preview";
  const paragraphs = (values: string[]) => values.map((paragraph, index) => {
    const link = links.find((url) => paragraph.endsWith(url));
    const content = link ? escapeEmailHtml(paragraph.slice(0, -link.length))
      + `<a dir="ltr" href="${escapeEmailHtml(link)}" style="color:${isBrandPreview ? "#3b1e6d" : "#563681"};overflow-wrap:anywhere">${escapeEmailHtml(link)}</a>`
      : escapeEmailHtml(paragraph);
    const margin = isBrandPreview ? (index === values.length - 1 ? "0" : "0 0 16px") : "0 0 20px";
    return `<p style="margin:${margin};white-space:pre-wrap;overflow-wrap:anywhere">${content}</p>`;
  }).join("");
  // Branding belongs to the HTML part. Plain text starts with the message.
  const text = `${english.join("\n\n")}\n\n---\n\n${arabic.join("\n\n")}`;
  if (isBrandPreview) {
    return { text, html: renderBrandPreview(paragraphs(english), paragraphs(arabic)) };
  }
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
