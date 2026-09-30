# Deployment

Managed Vercel and managed Supabase are selected. These issues do not constitute permission to provision paid services, change DNS or open production workflows now. Production execution requires the named approvals and verified configuration. Existing local work and its actual evidence must be preserved.

Status reconciled in the [1 October 2026 checklist audit](../reviews/checklist-audit-2026-10-01.md). The public draft is deployed; deployment success does not establish organizational release approval or complete provider settings verification.

<a id="bl-dep-01"></a>

## BL-DEP-01 — Validate separated environment configuration

- **Source IDs:** INF-01, INF-02, INF-04, SEC-06, PRV-07, AT-18.
- **Status:** Partial: guarded local/hosted configuration and public production deployment exist; one Preview denies unauthenticated access, but authenticated showcase, provider settings and full environment/data separation remain unverified.
- **Purpose:** Prevent preview or development activity from reaching production data, payments or recipients.
- **Scope:** Typed environment manifest and validation for local/staging/production; independent keys/data/access; staging test-recipient restriction and mock-payment enforcement; private preview controls.
- **Exclusions:** Purchasing plans, selecting unresolved regions, copying live data, treating noindex as access control, enabling operational flags.
- **Dependencies:** Foundation configuration; BL-SEC-09; organizational provider ownership approval.
- **Roles:** Delegated developer, technical owner, authorized release approver; environment access is separate from website roles.
- **States/transitions:** Missing/invalid required configuration → closed failure; validated environment → eligible for its separately approved deployment; no automatic production promotion.
- **Data touched:** Secret-free configuration schema, environment names, key references, synthetic fixtures, recipient allowlist policy.
- **Acceptance criteria:** Production credentials cannot silently fall back into local/staging; staging outgoing email rejects non-test recipients; public preview access cannot expose private content; all unknown business values remain unset/closed.
- **English/Arabic:** Safe unavailable states bilingual; environment identifiers and internal configuration not exposed as product copy.
- **Accessibility:** Closed/error pages retain readable headings, focus and support navigation.
- **Security/RLS:** Validate separate service identities and least privilege; exercise direct API/storage access under each environment; no secrets bundled client-side.
- **Audit/email:** Record configuration changes and deployment environment; tests use console/allowlisted sink, not real participant email.
- **Automated tests:** Missing secret, mixed environment references, production showcase denial, disallowed recipient and mock-only staging guard.
- **Manual UAT:** Technical owner inspects provider/project identities and denied cross-environment access using synthetic records.
- **Release gate:** Before any remote preview with sensitive functionality; INF-04 and REL-06.
- **Owner type:** Platform/full-stack engineer.
- **TBD blocked:** Local schema/guards unblocked; provider environment creation requires [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10), [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).

<a id="bl-dep-02"></a>

## BL-DEP-02 — Run reviewed pull requests and protected preview CI

- **Source IDs:** INF-03, INF-04, INF-05, SEC-06, REL-06, AT-18.
- **Status:** Partial: private GitHub remote, merged PRs and successful PR CI 36734074148 at 9e018ae verified; separate main run cancelled. Branch API reports protected=false, not a full ruleset audit; required merge-check enforcement and organizational custody remain unverified.
- **Purpose:** Give reviewers reproducible, access-controlled evidence before a change reaches a release environment.
- **Scope:** Once organizational repository access is approved, configure protected PR review and preview pipeline; run frozen dependency install, lint/type/build, unit/browser and actual database policy checks where relevant; retain artifacts.
- **Exclusions:** Personal repository ownership; claiming local checks prove hosted CI; automatic production promotion; unrelated dependency upgrades.
- **Dependencies:** BL-DEP-01; foundation CI definition; approved organizational repository/preview access; usable container runner for database tests.
- **Roles:** Delegated contributor, independent reviewer, named release approver, continuing repository custodian.
- **States/transitions:** Branch → PR checks/review → approved merge candidate; failing/blocked required check → no release promotion.
- **Data touched:** Source/migrations, lockfile, synthetic fixtures, CI logs, sanitized preview artifacts and review evidence.
- **Acceptance criteria:** Required checks fail closed; untrusted PRs cannot read production secrets; preview auth and noindex both verified; migration files reviewed; blocked database execution cannot be labeled PASS.
- **English/Arabic:** Preview exercises both locales; bilingual screenshots/content checks attached when UI changes.
- **Accessibility:** UI PR evidence includes scoped keyboard/contrast/RTL checks and automated scan caveats.
- **Security/RLS:** Least-privilege CI tokens; no broad service key in browser/test artifacts; enforce RLS tests as required checks for policy changes.
- **Audit/email:** PR/reviewer/build provenance retained; CI sends only approved operational notifications; preview test email isolated.
- **Automated tests:** Run the defined pipeline in hosted CI with a deliberately failing fixture/check to confirm merge protection.
- **Manual UAT:** Reviewer opens protected preview, verifies unauthenticated denial and traces commit → artifact → approval.
- **Release gate:** INF-05; required before first production deployment.
- **Owner type:** Platform engineer and organizational repository custodian.
- **TBD blocked:** Local CI maintenance unblocked; hosted setup requires [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11), provider plan/access [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10).

<a id="bl-dep-03"></a>

## BL-DEP-03 — Manage secrets and redact operational diagnostics

- **Source IDs:** SEC-06, SEC-02, PRV-03, PRV-06, CRT-02, INF-04, AT-18.
- **Status:** Partial: safe example environment documentation exists; production secret custody and diagnostic redaction not verified.
- **Purpose:** Keep credentials and confidential participant/scientific data out of source, bundles and logs.
- **Scope:** Secret inventory by environment/purpose with provider-managed storage, delegated access and rotation runbook; one centralized diagnostic redaction boundary; synthetic leak tests.
- **Exclusions:** Writing real secrets into documentation; blanket sensitive request-body logging; retaining feedback identity correlations; choosing unapproved monitoring services.
- **Dependencies:** BL-DEP-01; BL-SEC-01; BL-SEC-09; approved logging retention policy.
- **Roles:** Technical custodian and authorized backup; developer delegated only necessary environment access; privacy/security reviewer.
- **States/transitions:** Secret issued → active → rotated/revoked; diagnostics accepted only after redaction; revoked credentials fail.
- **Data touched:** Secret references/owners, rotation evidence, redacted error/security events; no secret values in inventory.
- **Acceptance criteria:** Service keys remain server-only; canary credentials/PII disappear from logs and browser bundles; feedback payloads and precise correlated identity metadata never enter shared diagnostics; old keys fail after tested rotation.
- **English/Arabic:** User-safe error references bilingual; diagnostic codes locale-independent and kept out of public copy.
- **Accessibility:** Generic safe error pages still provide readable explanation and keyboard recovery, not silent failure.
- **Security/RLS:** Log access is restricted; service credentials cannot be inferred from public variables; secret rotation preserves least privilege.
- **Audit/email:** Record actor/time/secret reference for changes, never values; emailed alerts contain minimal references, not sensitive payloads.
- **Automated tests:** Canary leakage in build/log/error paths, malformed payload redaction, survey metadata omission and expired credential rejection with mock keys.
- **Manual UAT:** Custodian rehearses environment-specific rotation and inspects generated artifacts/diagnostics.
- **Release gate:** Before remote sensitive previews and every production integration; SEC-06 and REL-06.
- **Owner type:** Platform/security engineer.
- **TBD blocked:** Synthetic redaction and runbook unblocked; actual custody/providers/log retention require [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09), [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10), [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).

<a id="bl-dep-04"></a>

## BL-DEP-04 — Back up database records and storage objects separately

- **Source IDs:** INF-06, INF-07, PRV-06, SEC-07, AT-17.
- **Status:** Planned; no tested database or object backup exists in current evidence.
- **Purpose:** Recover both records and their confidential files after loss.
- **Scope:** Approved backup configuration and one object-copy/manifest process with integrity checks, access controls and expiry; document database/object restore order and independently specified file targets.
- **Exclusions:** Assuming managed database backup includes file bytes; choosing paid recovery plan without approval; treating engineering objectives as provider guarantees.
- **Dependencies:** BL-DEP-01; BL-DEP-03; BL-SEC-07; approved plan/storage and file recovery policy.
- **Roles:** Infrastructure custodian, recovery operator, privacy owner; access distinct from ordinary website administration.
- **States/transitions:** Backup scheduled → captured → integrity verified or failed; expired copies removed under approved policy; restoration stays isolated pending verification.
- **Data touched:** Database snapshots, private object copies, encrypted manifests where appropriate, integrity/expiry evidence and minimal reconciliation records.
- **Acceptance criteria:** A deleted synthetic object can be recovered from its own backup; manifests match database references; compare demonstrated recovery with ordinary 24h loss/4h restore and critical database 15min/1h objectives; file objective remains unset until approved.
- **English/Arabic:** Runbook readable by designated operators; preserve Unicode filenames/content through restore.
- **Accessibility:** Backup status clearly conveys failure and next action without color-only signaling.
- **Security/RLS:** Backups never public; least-privilege copy/restore credentials; access and retention cover copied objects as sensitive data.
- **Audit/email:** Record job outcomes/access; failed backup/verification emails designated operators without attachment contents.
- **Automated tests:** Synthetic object checksum, missing-copy detection, retry/idempotency, expiry boundaries and restore manifest consistency.
- **Manual UAT:** BL-TST-07 rehearses complete restore and measures targets before any live release.
- **Release gate:** REL-01 backup requirement and critical operational release gates; configuration alone is insufficient.
- **Owner type:** SRE/data engineer with privacy review.
- **TBD blocked:** Synthetic process design unblocked; approved provider plan, backup location, budget and file targets require [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10), retention [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09).

<a id="bl-dep-05"></a>

## BL-DEP-05 — Route actionable monitoring failures to named owners

- **Source IDs:** INF-08, NFR-03, API-03, EML-03, EML-05, SEC-07, REL-06.
- **Status:** Planned; no running external monitoring or incident coverage verified.
- **Purpose:** Detect a failed accepted workflow and give an accountable operator a recoverable action.
- **Scope:** Minimal monitoring for public availability and one durable job queue, with an extensible event catalog for finalization, payment, email, scan, unauthorized access and check-in failures; email alert routing and runbook links.
- **Exclusions:** Chat-based production monitoring; SMS/WhatsApp/push; invented alert thresholds, delivery targets or 24/7 staffing promise.
- **Dependencies:** BL-DEP-03; durable jobs; approved monitoring/email provider; named primary/backup coverage.
- **Roles:** Technical operations owner; domain owner for payment/scientific/check-in exceptions; privacy owner for incident escalation.
- **States/transitions:** Healthy → detected failure/backlog → acknowledged → recovered/escalated; accepted, queued, provider-delivered and exhausted remain distinct.
- **Data touched:** Redacted service metrics, job states, alert acknowledgements and incident references.
- **Acceptance criteria:** Synthetic failed job alerts the correct test recipient with useful replay/reference; exhausted work stays visible; no successful-queue status is represented as delivery; monitoring coverage grows with each opened workflow.
- **English/Arabic:** Bilingual staff recovery/status interface where applicable; operational email English.
- **Accessibility:** Status severity expressed in text; keyboard-accessible queue details and replay controls.
- **Security/RLS:** Monitoring payloads omit manuscript/feedback/PII/secrets; authorized replay rechecks permissions and deduplication.
- **Audit/email:** Email-only operational alerts to approved owners; record acknowledgement/replay without sensitive content; daily/critical-window check responsibility documented.
- **Automated tests:** Queue backlog/failure detection, deduplicated alerts, unauthorized replay, redaction and recovered-state behavior using fake services.
- **Manual UAT:** Primary/backup owners acknowledge injected failure and recover a synthetic job; confirm event-window escalation coverage.
- **Release gate:** Minimal monitoring before REL-01; domain alerts before each operational REL gate.
- **Owner type:** SRE/backend engineer with operational owners.
- **TBD blocked:** Local fake monitoring unblocked; provider thresholds/quotas/budget and response ownership require [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10), [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).

<a id="bl-dep-06"></a>

## BL-DEP-06 — Package a release with reversible migration evidence

- **Source IDs:** INF-05, REL-01, REL-02, REL-03, REL-04, REL-05, REL-06, DAT-04, AT-18.
- **Status:** Partial evidence: production deployment 6762942669 succeeded at 9e018ae and public route checks passed; complete gate approval, monitoring and tested recovery evidence remain outstanding.
- **Purpose:** Open only the specific workflow whose evidence and business settings are complete.
- **Scope:** Versioned release manifest listing commit, reviewed migrations/config, gate evidence, owner sign-off, rollout checks and rollback/recovery procedure; rehearse one additive schema release in isolated staging.
- **Exclusions:** Opening all features with one global approval; destructive rollback that loses post-release submissions/orders; automatic resolution of TBDs.
- **Dependencies:** BL-DEP-01, BL-DEP-02, BL-DEP-04, BL-DEP-05; corresponding feature tests/UAT and exact gate decisions.
- **Roles:** Named release approver, delegated release engineer, domain owner, recovery operator.
- **States/transitions:** Candidate → checks/review/UAT approved → scoped release → verified or paused/recovered; unrelated workflows stay closed.
- **Data touched:** Migration history, configuration snapshots without secret values, gate approvals, post-release reconciliation references.
- **Acceptance criteria:** Missing gate evidence blocks promotion; public launch does not open registration/submission; app rollback compatibility and forward recovery are rehearsed; newly accepted records are accounted for before any data rollback.
- **English/Arabic:** Release evidence includes impacted bilingual routes; safe maintenance/unavailable notices match approved language behavior.
- **Accessibility:** Smoke checks cover keyboard/focus/errors for changed paths; rollback retains usable status information.
- **Security/RLS:** Policy migrations reviewed and tested both directions of access; reopening requires current grants/keys and private storage checks.
- **Audit/email:** Record approver, commit, config/migration versions and workflow openings; no participant notification on an abandoned release without an approved event.
- **Automated tests:** Missing-gate manifest failure, migration-on-fixtures, old/new app compatibility as needed and closed-flag regression.
- **Manual UAT:** Release approver runs staged promotion/rollback exercise, preserving an order/submission created after the initial snapshot.
- **Release gate:** INF-05 and each REL gate independently.
- **Owner type:** Release/platform engineer with accountable domain approver.
- **TBD blocked:** Manifest/rehearsal unblocked with synthetic data; live opening requires applicable DR-CFG decisions and [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11) approver.

<a id="bl-dep-07"></a>

## BL-DEP-07 — Isolate public caching and protect critical windows

- **Source IDs:** NFR-02, NFR-03, TIM-01, INF-08, SEC-01, AT-16.
- **Status:** Partial public static foundation; authenticated cache boundaries and operational window procedures pending.
- **Purpose:** Keep public pages fast without leaking personalized data or scheduling disruptive maintenance during openings/deadlines/events.
- **Scope:** Explicit public/private response caching policy and regression tests; documented maintenance-window check against published operational windows; measure one public route against agreed mobile conditions.
- **Exclusions:** Caching private dashboards/API responses in a shared public cache; declaring measured 99.9% availability without telemetry; inventing event dates or network assumptions.
- **Dependencies:** BL-DEP-01; authenticated routes when available; audited deadline configuration; BL-TST-06 performance method.
- **Roles:** Visitor, authenticated participant/staff, release/operations owner.
- **States/transitions:** Approved public publication → cacheable representation; private or draft response → private/uncacheable; active critical window → no planned maintenance.
- **Data touched:** Cache headers/invalidation configuration, synthetic personalized responses, maintenance schedule and performance evidence.
- **Acceptance criteria:** Alternating users never receive another user's content from cache; unpublication invalidates controlled public delivery as designed; UTC windows display Asia/Riyadh; 99.9% remains objective, not guarantee.
- **English/Arabic:** Cache variants preserve correct locale; no English private response reused for another user's Arabic page.
- **Accessibility:** Performance work retains readable fallback, native scrolling, reduced motion and media controls.
- **Security/RLS:** Authentication and authorization precede private response generation; no private result saved in public cache or CDN artifacts.
- **Audit/email:** Audit configuration/maintenance approval; operational notice only through approved email route when required.
- **Automated tests:** Two-user cache isolation, locale variants, draft denial, unpublication invalidation and critical-window maintenance guard/check.
- **Manual UAT:** Inspect response/cache behavior in preview and review maintenance blackout plan with operations.
- **Release gate:** REL-01 for public delivery; relevant operational gate for private responses/windows.
- **Owner type:** Frontend/platform engineer and operations owner.
- **TBD blocked:** Synthetic cache tests unblocked; final windows require relevant event/deadline decisions, measurement/budget [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10).

<a id="bl-dep-08"></a>

## BL-DEP-08 — Integrate the approved transactional sender and verify delivery

- **Source IDs:** EML-01, EML-02, EML-03, EML-04, EML-05, INF-03, INF-04, SEC-06, LOC-03, REL-01, REL-02.
- **Status:** Planned; console/test outbox work does not establish a functioning live sender.
- **Purpose:** Send authorized account and participation messages through a verified organizational sender with observable delivery failures.
- **Scope:** After provider/ownership approval, implement its transactional adapter and delivery-event verification; configure approved From/monitored Reply-To, verify actual SPF/DKIM/DMARC records under authorized DNS custody, and exercise allowlisted delivery/bounce tests before a separately approved live activation.
- **Exclusions:** DNS changes or real email in this backlog-authoring task; assuming a domain purchase creates a mailbox; choosing an unapproved provider/address; bulk campaigns, SMS, WhatsApp or push.
- **Dependencies:** BL-FND-05; BL-DEP-01; BL-DEP-03; BL-SEC-09; approved provider contract, sender/DNS custody and delivery target.
- **Roles:** Email/platform engineer, domain custodian, authorized operations owner and release approver; named individuals remain unassigned.
- **States/transitions:** Console/mock only → configured adapter → sender/domain verification → allowlisted test accepted/delivered/bounced → separately authorized live activation; failed verification keeps live sending closed.
- **Data touched:** Secret references, sender/Reply-To configuration, verified DNS evidence, template versions, minimal delivery/bounce metadata and quota/target evidence.
- **Acceptance criteria:** Actual approved sender authenticates; Reply-To is monitored and tested; provider acceptance differs from delivery; callbacks/events follow the provider's documented contract and cannot forge recipient state; staging cannot send outside its allowlist; staff preview/test templates before activation.
- **English/Arabic:** Platform transactional emails English-only; links retain intended interface locale; staff delivery/error controls bilingual.
- **Accessibility:** Verify semantic HTML and plain-text alternative, descriptive links and readable OTP/recovery content in representative mail clients.
- **Security/RLS:** Provider credentials server-only and environment-separated; validate callback authenticity/replays using the actual contract; restrict email metadata and redact message bodies/secrets from diagnostic logs.
- **Audit/email:** Audit sender/configuration changes and activation approval; record bounded attempts/delivery/bounce outcomes; duplicate callbacks cannot duplicate email or business effects.
- **Automated tests:** Mock contract tests, invalid callback/replay, recipient isolation, missing template variables, bounce/retry/exhaustion and staging allowlist; batch tests retain approved quotas/targets as configuration.
- **Manual UAT:** Authorized custodian verifies DNS/sender/Reply-To evidence; staff sends approved allowlisted template tests and confirms inbox arrival, bounce handling and dashboard fallback without contacting participants.
- **Release gate:** EML-02/04 before any live email-dependent flow; corresponding REL gate controls actual activation.
- **Owner type:** Platform/email engineer with organizational domain custodian and operations owner.
- **TBD blocked:** Console fixtures and adapter contract scaffold unblocked; real provider integration, DNS configuration and activation require [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10), [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11) and privacy approval [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09).
