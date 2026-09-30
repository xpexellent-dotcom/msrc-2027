# Foundation

Reuse the existing M1 baseline; do not scaffold a replacement. [Evidence](../features/foundation.md) and [progress](../PROGRESS.md).

Status reconciled in the [1 October 2026 checklist audit](../reviews/checklist-audit-2026-10-01.md); original M1 checkpoints remain valid historical records.

<a id="bl-fnd-01"></a>

## BL-FND-01 — Preserve and reproduce the pinned local application baseline
- **Source IDs:** INF-01, INF-04, INF-05, SEC-06, LOC-01, ERR-01.
- **Status:** Baseline implemented — preserved M1 plus application CI at 9e018ae and deployed public shell; production governance and operational configuration remain separate gates.
- **Purpose:** Give engineers a reproducible Next.js App Router, TypeScript, Tailwind and pnpm starting point.
- **Scope:** Retain pinned runtime/dependencies and lockfile, bilingual shell, safe environment example, separated browser/server clients, error/loading/not-found conventions and setup commands; fresh-machine replay when environment changes.
- **Exclusions:** Dependency upgrades without need; live service provisioning; registration or CMS opening.
- **Dependencies:** Existing ENG-001 decision and repository files.
- **Roles:** Engineer; anonymous public visitor.
- **States/transitions:** Clean checkout → frozen dependency install → runnable local preview; configuration failures remain explicit.
- **Data touched:** Source, lockfile, synthetic fixtures and local environment variable names only.
- **Acceptance criteria:** Documented commands reproduce the app; no real secrets required for public browsing; secret client boundary cannot import into browser output; existing work preserved.
- **English/Arabic:** English default; Arabic document language/direction and localized errors.
- **Accessibility:** Semantic landmarks, focusable recovery actions and accessible loading status.
- **Security/RLS:** Closed operations stay server-denied; client configuration never contains service-role secrets.
- **Audit/email:** Engineering Git history; no real emails or business audit mutations.
- **Automated tests:** Existing lint, typecheck, unit, build and smoke checks; rerun after relevant changes.
- **Manual UAT:** Fresh-machine README replay; unknown route and unavailable optional database.
- **Release gate:** M1 local baseline only; REL-01 still requires separate approval.
- **Owner type:** Full-stack/platform engineer.
- **TBD blocked:** No local blocker; production plan/region/custody depend on DR-CFG-10/11.

<a id="bl-fnd-02"></a>

## BL-FND-02 — Execute the prepared local database migration and permission tests
- **Source IDs:** SEC-02, DAT-04, INF-04, INF-05.
- **Status:** Verified in isolated Linux CI — fresh job success at 9e018ae; prior database evidence records 20 pgTAP and 10 client integration checks passing. Optional Windows local replay remains unverified.
- **Purpose:** Verify database behavior rather than treating committed SQL as proof it ran.
- **Scope:** Start an authorized Docker-compatible local runtime, replay local Supabase migration/seed and pgTAP suite, document reset/replay results and preserve loopback isolation.
- **Exclusions:** Remote Supabase linking, production data, operational schema expansion.
- **Dependencies:** BL-FND-01; Docker-compatible Linux container runtime.
- **Roles:** Developer; synthetic anonymous/authenticated test actors.
- **States/transitions:** Unexecuted SQL → migrated synthetic database → permitted and denied queries verified.
- **Data touched:** Local foundation sample table, grants, RLS policies, synthetic seed only.
- **Acceptance criteria:** Clean reset is repeatable; all prepared tests execute; denied actors cannot bypass grants/RLS; any failing result is recorded and fixed within foundation scope.
- **English/Arabic:** Fixture text covers both languages; commands remain technical English.
- **Accessibility:** No new UI; ensure database failure does not remove accessible public fallback.
- **Security/RLS:** Execute direct anonymous/authenticated grant and row-policy denial cases; no broad service-role use in browser.
- **Audit/email:** Log test outcomes without tokens; no outbound participant messages.
- **Automated tests:** Existing 20 pgTAP checks plus migration replay; hosted CI remains separate evidence.
- **Manual UAT:** Start/stop local services and follow database README without a cloud account.
- **Release gate:** M1 database verification; required before claiming database-dependent slices verified.
- **Owner type:** Database/platform engineer.
- **TBD blocked:** No business TBD; isolated CI verification is available. Optional Windows replay requires a working local engine; ENG-006 permits daily hosted development without it.

<a id="bl-fnd-03"></a>

## BL-FND-03 — Extend closed configuration with server-authoritative windows
- **Source IDs:** TIM-01, TIM-02, API-02, ERR-01, CFG-01, CFG-03, CFG-05, CFG-06, CFG-07.
- **Status:** Partial — typed unknown values and closed flags exist; scoped window extension workflow planned.
- **Purpose:** Give every workflow honest opening/closing behavior without fabricated business values.
- **Scope:** Typed per-edition windows and server-time validation; UTC persistence/Asia-Riyadh display; auditable scoped extensions with actor/reason/notification choice; null configuration denies live opening.
- **Exclusions:** Choosing dates, changing global deadlines from a client, treating an opened form as submission before cutoff.
- **Dependencies:** BL-FND-01; BL-AUTH-01 for privileged changes; BL-SEC-01.
- **Roles:** Participant; authorized domain administrator.
- **States/transitions:** Unconfigured/closed → configured and explicitly opened → cutoff closed; authorized scoped extension does not silently reopen unrelated work.
- **Data touched:** Window/configuration versions, extension evidence and audit events.
- **Acceptance criteria:** Finalization after cutoff is denied while saved drafts survive; exact timezone shown; missing configuration and tampered client clock cannot bypass closure.
- **English/Arabic:** Bilingual window explanations/errors; scientific fields stay LTR.
- **Accessibility:** Deadlines are readable text, not countdown-only; expiry announced without discarding input.
- **Security/RLS:** Only scoped administrators alter settings; database operation enforces authoritative cutoff.
- **Audit/email:** Audit before/after/reason; extension email only when selected and transaction commits.
- **Automated tests:** Cutoff boundary, timezone, stale page, null gate, wrong scope and retry tests.
- **Manual UAT:** Open before cutoff, finalize after it, then exercise an authorized single-record extension.
- **Release gate:** Relevant REL-02/03/04/05 workflow opening.
- **Owner type:** Backend engineer.
- **TBD blocked:** Synthetic implementation no; actual windows require the relevant DR-CFG-01/03/05/06/07/08 decision.

<a id="bl-fnd-04"></a>

## BL-FND-04 — Add a durable job and transactional event foundation
- **Source IDs:** API-01, API-02, API-03, ERR-02, DAT-04.
- **Status:** Planned.
- **Purpose:** Keep accepted operations recoverable across retries, process crashes and browser closure.
- **Scope:** One generic durable job/outbox contract with persisted deduplication, bounded retry, claim concurrency, failure visibility and authorized replay; prove with a synthetic worker.
- **Exclusions:** Implementing each domain worker; choosing an unapproved external queue provider; marking enqueue as completion.
- **Dependencies:** BL-FND-02; BL-SEC-01; BL-AUTH-01 for replay console.
- **Roles:** System worker; explicitly authorized operator.
- **States/transitions:** Accepted for processing → claimed → completed or retryable failure → exhausted/manual attention; technical vocabulary is an implementation proposal, not business states.
- **Data touched:** Job, deduplication key, safe error metadata and transactional event records.
- **Acceptance criteria:** Rolled-back business mutation emits no job; competing workers cannot repeat a consequential effect; crash/replay retains truthful status; retry policy is configurable.
- **English/Arabic:** Operator and participant processing/error messages bilingual where exposed.
- **Accessibility:** Processing status has text and accessible updates; replay requires deliberate keyboard-operable action.
- **Security/RLS:** Workers have minimal grants; participants cannot enumerate jobs or invoke replay; payloads exclude survey answers and secrets.
- **Audit/email:** Audit privileged replay; this PR sends only console/test output.
- **Automated tests:** Transaction rollback, duplicate enqueue, competing claims, crash/retry and unauthorized replay.
- **Manual UAT:** Stop the worker mid-job and recover without losing the accepted request.
- **Release gate:** Before any relevant durable production workflow; REL-06.
- **Owner type:** Backend/platform engineer.
- **TBD blocked:** Local implementation no; approved hosted execution/budget requires DR-CFG-10.

<a id="bl-fnd-05"></a>

## BL-FND-05 — Implement the email outbox with console and test delivery
- **Source IDs:** EML-01, EML-03, EML-04, EML-05, LOC-03, API-03.
- **Status:** Planned — console-only setting exists; durable notification behavior not implemented.
- **Purpose:** Deliver each authorized committed event once while exposing failed delivery honestly.
- **Scope:** Versioned template rendering, recipient validation, deduplication, bounded backoff, delivery/bounce event handling and scoped failure dashboard; console/test adapter and allowlisted staging recipients.
- **Exclusions:** Live sender setup, real recipients, SMS/WhatsApp/push, one PR implementing every business event.
- **Dependencies:** BL-FND-04; BL-AUTH-01; event producers added in their domain issues.
- **Roles:** System worker; authorized operations staff; participant recipient.
- **States/transitions:** Queued → provider accepted → delivered/bounced/failed when evidence exists; queued never implies delivered.
- **Data touched:** Email job/event, recipient, template version and deduplication identity; no confidential manuscript payload.
- **Acceptance criteria:** Escaped variables cannot cross recipients; missing variables fail safely; duplicate callbacks do not duplicate messages; essential outcomes remain visible in dashboard; optional announcements respect preferences.
- **English/Arabic:** Transactional templates English-only; links retain intended UI locale; bilingual failure administration.
- **Accessibility:** Semantic readable HTML/text email with meaningful links; accessible template preview.
- **Security/RLS:** Staff scope limits message metadata; headers/Reply-To validated; provider callbacks authenticated according to actual adapter.
- **Audit/email:** Store attempt/delivery evidence; test sends only; publication/retry cannot create duplicate notices.
- **Automated tests:** Template isolation/escaping, recipient allowlist, rollback, retry, callback replay, 300–400-decision and approximately 1,000-announcement synthetic batch behavior.
- **Manual UAT:** Preview templates; simulate bounce and exhausted retries; compare dashboard outcome with undelivered email.
- **Release gate:** Before any live email-dependent release; delivery target and quotas approved separately.
- **Owner type:** Backend/email engineer with content reviewer.
- **TBD blocked:** Synthetic work no; provider/sender/quotas/target require DR-CFG-10/11.

<a id="bl-fnd-06"></a>

## BL-FND-06 — Define versioned domain mutation and error contracts
- **Source IDs:** API-01, API-02, DAT-01, DAT-02, DAT-03, DAT-04, ERR-01, ERR-02, SCP-03.
- **Status:** Planned; closed API response already exists.
- **Purpose:** Give each vertical slice a consistent permission/state/failure contract without conflating records.
- **Scope:** Reusable server validation and optimistic-version conventions demonstrated with one synthetic mutation; feature-note template records actor, source/result states, data, audit, email and recovery.
- **Exclusions:** Creating every domain table upfront; merging registration/payment/submission/attendance states; generic administrator bypass.
- **Dependencies:** BL-FND-01; BL-FND-02; BL-SEC-01.
- **Roles:** Engineer; synthetic owner and unauthorized actor.
- **States/transitions:** Valid version and permitted source state → committed new version; conflict or denial → unchanged record and safe recovery.
- **Data touched:** Synthetic record versions, error codes and documented domain boundaries.
- **Acceptance criteria:** Stale writes cannot silently overwrite; permission checks run before revealing record details; response distinguishes saved, finalized and queued work; migrations are scoped to later slices.
- **English/Arabic:** Stable error codes map to bilingual messages; scientific content unaffected.
- **Accessibility:** Errors associate with fields and summary, preserve valid input and expose support reference where appropriate.
- **Security/RLS:** Direct API and database authorization agree; untrusted identifiers cannot select another owner's record.
- **Audit/email:** Only committed consequential changes audit/notify; safe diagnostics contain no sensitive payloads.
- **Automated tests:** Stale version, invalid state, duplicate request, owner/non-owner and rollback cases.
- **Manual UAT:** Competing tabs recover from a conflict without losing the saved version.
- **Release gate:** Shared contract before operational slices; REL-06.
- **Owner type:** Full-stack engineer.
- **TBD blocked:** No for engineering contract; each domain's unresolved fields remain gated separately.
