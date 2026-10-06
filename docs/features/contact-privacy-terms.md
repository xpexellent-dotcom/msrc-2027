# Contact and approved policy publication

## Current policy publication — 6 October 2026

ORG-037–042 approve the English Privacy Policy and Terms v1.0 in
`docs/policies/privacy-policy-v1.0.en.md` and `docs/policies/terms-v1.0.en.md`, from
`docs/policy-text-v1` commit `48017fa`. Publish the English text exactly, with a
complete formal Modern Standard Arabic translation and equivalent sections, tables
and localized internal links. Organizers should have a native Arabic reader review
the translation; the Arabic Terms prevail. No review completion is claimed here.

Latest routes are `/{en|ar}/privacy` and `/{en|ar}/terms`; stable routes append
`/v1.0`. Locale-free `/privacy`, `/terms` and their `/v1.0` aliases use the site's
existing language redirect behavior. The label is "Version 1.0" and one effective
date configuration value is `2026-10-06`, the PR publication date, formatted through
the site's existing EN/AR date style. Keep the existing page design, native section
navigation and tables. The retired `/2026-10-04-draft` routes return 404 and have no
public links. Production policy metadata is indexable and sitemap entries carry
EN/AR alternates; existing preview/local noindex protection is retained.

`approvedParticipantPrivacy` references v1.0 in both languages with a short summary
and policy link. The closed sign-up screen displays that notice without a collection
form. `PARTICIPANT_ACCOUNTS_ENABLED`, hosted migrations, database readiness and
activation remain unchanged. This publishes approved notices; it does not implement
registration identifier collection, age enforcement, unverified-account cleanup,
payments, media removal or a DeepSeek adapter. Those requirements are recorded in
the linked backlog and decisions. AI stays disabled and the built Anthropic adapter
must be switched before activation.

Privacy identifies the Faculty of Medicine, KAU as controller and Research Principles
Club acting on its behalf. The national ID/Iqama/international-passport requirement
is restricted to conference registration identity verification with authorized
internal attendee access, strict controls and one-year deletion. Actual processing,
provider safeguards, cleanup/restore, finances, inbox/recovery UAT and operational
release evidence remain separate gates. Exact check commands/results and screenshots
belong in [PROGRESS](../PROGRESS.md); no check result is inferred from text approval.

## Historical foundation record

BL-PUB-06 / BL-PUB-08; SUP-01–03, EML-01/04, PRV-01–08, MED-03, LOC-01/03,
ACC-01, SCP-02 and REL-01. Baseline: main 7361164, merged PR25. Organizer amendments
ORG-021–026 dated 4 October 2026 supersede the affected source assumptions; original
Development Specification v0.5 remains unchanged. The initial closed foundation is
preserved below; ORG-028/029 add a default-off Contact adapter without approving final
legal wording. See [Contact delivery and activation](contact-delivery.md).

## Contact

`/{en|ar}/contact` exposes the approved mailto recipient and a disabled native form:
topic, name, email, optional related reference and message. The nine ordered topics/
subject tags live in `src/config/contact.ts`; every topic uses contact@msrc2027.com,
planned sender no-reply@msrc2027.com, validated visitor Reply-To and tag plus a short
summary derived from the message. There is no caller-controlled recipient/subject.
Platform delivery labels remain English-only, preserving the original visitor message.
The initial foundation added no provider/secrets/dependencies.

The server-rendered disabled fieldset and disabled non-submit button are closed even
without JavaScript. `/api/contact` rejects GET/POST/PUT/PATCH/DELETE/OPTIONS with
503 CONTACT_CLOSED and no-store; HEAD has no body. It never accesses/parses a request's
body, headers or URL. There is no logging, queue, database/storage write or sending.
That describes the original foundation with delivery off. ORG-028/029 now add a server-only
Resend fetch adapter, signed minimum-fill tokens and private expiring quota counters.
`CONTACT_DELIVERY_ENABLED=true` plus complete Production-only configuration and the
reviewed migration are required; default-off retains these exact closed behaviors.
Vercel Preview refuses live delivery. The existing generic support workflow stays closed.

The separate server-only validator is exercised with synthetic values. It enforces
topic and field allowlists, strict strings, email/header safety, duplicate-field/file/
accessor rejection, Unicode/control/length checks and an empty hidden honeypot. Input
bounds are defensive engineering limits, not approved live anti-spam quotas. No third-
party CAPTCHA or browser storage is added. The new Contact-only adapter implements
same-origin/byte/token checks, IP/email hour/day limits, global 60/day admission, atomic
single-use reservations and explicit failure/retry UI. It stores no inquiry copy; only
HMAC counters expire in Supabase. Proposed 3/hour, 10/day and 3-second fill defaults,
provider/inbox processing/retention, hosted application and human inbox UAT remain opening
checks. No real delivery or production-ready release is claimed by synthetic evidence.

## Original Privacy and Terms draft (superseded by v1.0)

Latest routes `/{en|ar}/privacy` and `/terms` and dated routes ending
`/2026-10-04-draft` read a typed source snapshot. Unknown versions/locales return 404.
The draft date is not an effective legal date. Draft metadata stays noindex in every
environment and outside the sitemap. Each organizer-decision section is still draft
wording; every unapproved section is visibly a placeholder. Contact and all policy
routes remain outside the existing analytics/Speed Insights route allowlist.

The snapshot records only organizer-approved facts: Research Principles Club participant-
data responsibility; PDPL framework and localized KAU links; registration/abstract deletion
one year after the conference; minimal certificate records retained two years;
contact@msrc2027.com data requests with the specified topic and privacy-lead response
within 30 days; photography/recording; the current cookieless anonymous Vercel visit-
analytics description. ORG-027 removes personal drafting/decision attributions from
public EN/AR text and metadata. Named internal owners remain in DECISIONS; Terms and
photography-publication wording remain placeholders for Emad. No legal rights, promises,
effective terms, processors, transfer safeguards or retention exceptions are invented.

ORG-025 explicitly records the organizer's notice-only publicity decision and supersedes
the previous backlog exclusion. The closed registration page adds the factual photography
notice in EN/AR without a consent UI. Notice alone does not establish a lawful basis;
final identifiable-publication wording and institutional/privacy review remain pending
(see the primary PDPL reference in DECISIONS). This slice publishes no identifiable
media. Legal bases/actual processing, locations/transfers/logs, verified request procedure,
certificate retention clock start, inbox/other retention and cleanup/restore behavior
remain placeholders. The new Contact counter expiry migration deletes no participant
data and does not implement these broader retention rules.

## Review, release and rollback

Footer links replace the Contact/Privacy/Terms Soon chips. The other unpublished chips
remain unchanged. English/Arabic RTL, keyboard, native no-JS closure, no writes/storage,
axe, narrow screens, enlarged text, version navigation/404s, API denial and validator
boundaries are covered. Exact executed commands/counts and failed/corrected checks
belong in PROGRESS; full database/auth regressions run in disposable CI without hosted
fixtures. Real-human bilingual/accessibility/legal review and actual provider delivery
are not demonstrated by synthetic tests or the organizer's forwarding report.

At the foundation milestone the next tasks were Contact-only migration/configuration,
processing/abuse/human delivery checks and final policy wording. ORG-037 now supersedes
the wording blocker; the current Contact runbook and participant activation guide
govern their remaining operational checks. Contact or policy approval does not open
authentication or other workflows. No role/grant/session-policy/readiness changes.

Initial foundation rollback is a code/route/footer revert. For the new adapter use the
Contact delivery runbook: flag off plus redeploy, retain counter expiry, no inquiry data
to recover, no shared-extension removal. Preserve dated decision/source history.
