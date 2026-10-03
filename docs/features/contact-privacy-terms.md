# Contact and policy draft foundations

BL-PUB-06 / BL-PUB-08; SUP-01–03, EML-01/04, PRV-01–08, MED-03, LOC-01/03,
ACC-01, SCP-02 and REL-01. Baseline: main 7361164, merged PR25. Organizer amendments
ORG-021–026 dated 4 October 2026 supersede the affected source assumptions; original
Development Specification v0.5 remains unchanged. This is a closed development preview,
not an effective legal policy or permission to collect data.

## Contact

`/{en|ar}/contact` exposes the approved mailto recipient and a disabled native form:
topic, name, email, optional related reference and message. The nine ordered topics/
subject tags live in `src/config/contact.ts`; every topic uses contact@msrc2027.com,
planned sender no-reply@msrc2027.com, validated visitor Reply-To and tag plus a short
summary derived from the message. There is no caller-controlled recipient/subject.
Platform delivery remains English-only, preserving the original message if a later
approved delivery adapter is implemented. No provider/secrets/dependencies are added.

The server-rendered disabled fieldset and disabled non-submit button are closed even
without JavaScript. `/api/contact` rejects GET/POST/PUT/PATCH/DELETE/OPTIONS with
503 CONTACT_CLOSED and no-store; HEAD has no body. It never accesses/parses a request's
body, headers or URL. There is no logging, queue, database/storage write or sending.
An environment flag cannot enable it. The existing generic support workflow stays closed.

The separate server-only validator is exercised with synthetic values. It enforces
topic and field allowlists, strict strings, email/header safety, duplicate-field/file/
accessor rejection, Unicode/control/length checks and an empty hidden honeypot. Input
bounds are defensive engineering limits, not approved live anti-spam quotas. No third-
party CAPTCHA, challenge or browser storage is added. Account/IP rates, CSRF/origin
protection, minimal delivery metadata/retention, concurrency/deduplication, failure and
retry handling remain a separate live-delivery design/release gate. No successful
submission, delivery receipt or production-ready abuse protection is claimed here.

## Privacy and Terms

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
remain placeholders. No automated deletion or database migration is introduced.

## Review, release and rollback

Footer links replace the Contact/Privacy/Terms Soon chips. The other unpublished chips
remain unchanged. English/Arabic RTL, keyboard, native no-JS closure, no writes/storage,
axe, narrow screens, enlarged text, version navigation/404s, API denial and validator
boundaries are covered. Exact executed commands/counts and failed/corrected checks
belong in PROGRESS; full database/auth regressions run in disposable CI without hosted
fixtures. Real-human bilingual/accessibility/legal review and actual provider delivery
are not demonstrated by synthetic tests or the organizer's forwarding report.

Next smallest task: Emad reviews the displayed facts, supplies/approves final EN/AR
Privacy/Terms and resolves the marked processing/publication questions with the
responsible institutional/privacy owner. Separately approve an email provider and live
abuse/retention/delivery requirements before changing the permanently closed handler.
Neither draft publication nor provider selection opens authentication or operational
workflows. No role/grant/session-policy/readiness or production settings change here.

Rollback is a code/route/footer revert of this branch; no migration, provider account,
stored inquiries or data rollback exists. Preserve the dated decision/source history.
