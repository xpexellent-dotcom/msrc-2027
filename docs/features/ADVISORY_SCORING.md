# Closed advisory scoring and calibration

Night-3 Task 6, ENG-068; AI-01–06, REV-01–09, ROL-03/05/10/12,
SEC-01/02/06, LOC-01–03, ACC-01 and ORG-040. Implementation and test evidence:
[O9 receipt](../progress/2026-10-23-codex-night3-advisory.md).

Science → Advisory scoring is available to Scientific Administrators and Super
Admins. The interface is EN/AR with RTL; scientific rubric text and results stay
English/LTR. It labels every result **AI advisory, not a decision** and identifies
processing in the **People's Republic of China**. Authors cannot read advisory
records, including when an author also has a staff role. Advice never changes
human scorecards, review averages, decisions, participant status or publication.

## Gates and configuration

Runtime activation requires server-only `AI_ASSESSMENT_ENABLED=true`, an approved
`DEEPSEEK_API_KEY` and separate worker database credentials
`AI_ASSESSMENT_SUPABASE_URL` / `AI_ASSESSMENT_SUPABASE_SECRET_KEY`. They are blank
in `.env.example`. Database enablement is separately off by default. Only a Super
Admin can change enablement, reviewer visibility, model/token/retry settings and
the data-handling, evaluation and operating evidence references. Scientific
Administrators may enter budgets. Existing session assurance and persisted roles
are checked again by every RPC; navigation grants no authority.

No operational values are seeded or prefilled. Staff must enter the maximum
abstracts per run/day, estimated cost per attempt, daily estimated cost cap,
currency, retry limit and token limit. The run estimate reserves the selected
abstract count × per-attempt estimate × maximum attempts. Enqueue reservations
and actual dispatch estimates have separate UTC-day ledgers. Retry dispatches
consume the daily dispatch count too. Uncertain failures are not refunded.
Currency cannot change after a run exists. These are conservative estimates,
not a guarantee of provider billing: the owner must approve a current worst-case
estimate and provider account spend controls before activation.

The evidence fields are private approval references, not new approved legal
text. Entering a reference alone is not proof of scientific or privacy readiness.
An initial evaluation can use the existing offline synthetic harness and
committee-scored examples before any live activation. A later calibration view
supports continued evaluation. No automatic acceptance threshold or go/no-go
verdict is implemented.

## Durable processing and minimization

Only current finalized submissions in the submitted/scientific-review states,
with staff-attested sanitized packets, can enter a run. Each job freezes the
submission and Task 5 rubric version. A unique tuple of submission ID, submission
version and rubric version prevents duplicate scoring across runs. An operation
UUID makes the staff start request idempotent; different input under the same
operation conflicts. Separate advisory tables have forced RLS and no client
table grants. Runs and result records are append-only.

The authenticated cron endpoint `/api/jobs/advisory/drain` uses `CRON_SECRET`,
returns 404 while disabled, and processes two jobs per invocation with bounded
provider calls. The source-only Vercel cron entry reuses the existing five-minute
cadence; it is not a hosted change. Service-role-only claim/finish RPCs fence each
five-minute lease with worker ID and a random token. Stale acknowledgements cannot
write. Retryable 429/network/5xx failures use durable exponential backoff from
30 seconds, bounded at 900 seconds and by the staff-entered attempt limit.
Malformed, identifying, incomplete or out-of-range outputs are discarded whole.
Changed configuration or stale submissions prevent result persistence. Manual
human review remains available after every AI failure.

The provider receives only the sanitized title and five body fields, together
with the rubric and fixed system rules. No IDs, author/account names, contacts,
affiliations, keywords, attachments or identity documents enter the request.
Frozen source names and institutions are private **local screening context**;
the worker checks them against transmitted text and returned rationales without
copying them to provider metadata, result provenance or logs. Email/phone/licence/
IRB canaries supplement that check. This does not prove free text is anonymous;
staff packet inspection and approved data handling remain mandatory.

The worker reuses the existing DeepSeek transport, request builder and strict
local response validator. Thinking, streaming, tools and redirect following are
disabled. The provider's JSON mode is not a schema guarantee: exactly the frozen
criteria, finite in-range scores and bounded rationales must pass local validation
before the database validates the reduced result again. Reasoning content is
ignored. Logs expose counts and allowlisted error categories, with no prompts,
raw outputs, manuscript excerpts, credentials or provider exception text.

## Reviewer visibility and calibration

Reviewer visibility is default OFF and Super Admin controlled. Reveal also
requires a current assignment, eligibility/no conflict, the current submission
version and an independently completed human review. Author and coauthor checks
apply independently. Reviewers cannot enable the setting or write advisory
records. Their existing assessment workspace remains English/LTR.

Calibration is staff-only and pairs AI with the mean of eligible completed human
scores for exactly the same abstract version, rubric version and criterion.
Missing human data is excluded, not replaced by zero. Correlation, exact agreement,
mean absolute difference and signed difference are descriptive only. Differences
are normalized by each criterion's range; a single pair or constant scores have
undefined correlation. Per-criterion/rubric-version rows expose scale changes.
The overall correlation pools normalized pairs and is not a scientific validation
verdict. No metric enters a review average or changes activation.
The comparison includes the complete eligible cohort within the response bound;
overflow returns unavailable rather than metrics for a silently truncated subset.

## Migration and contracts

Pending source migration: `20261023051815_advisory_scoring.sql`. Adds
`msrc_abstracts.advisory_settings`, `advisory_runs`, `advisory_jobs`,
`advisory_records` and `advisory_daily_usage`.

| Caller | RPC signature → JSONB |
| --- | --- |
| Scientific Administrator / Super Admin | `msrc_staff_advisory_workspace(edition_key text)` |
| Scientific Administrator budget / Super Admin settings | `msrc_staff_advisory_save_settings(edition_key text, expected_version integer, configuration jsonb)` |
| Scientific Administrator / Super Admin | `msrc_staff_advisory_start(edition_key text, operation_id uuid, submission_ids uuid[])` |
| Scientific Administrator / Super Admin | `msrc_staff_advisory_calibration(edition_key text)` |
| Assigned, eligible reviewer | `msrc_staff_advisory_reviewer(edition_key text, assignment_id uuid)` |
| Service role worker only | `msrc_advisory_worker_claim(p_worker_id uuid, p_batch_size integer)` |
| Service role worker only | `msrc_advisory_worker_finish(p_worker_id uuid, p_job_id uuid, p_lease_token uuid, p_result jsonb, p_error_code text)` |

`/api/staff-portal/advisory` GET accepts `area=workspace`, `area=calibration`, or
`area=reviewer&assignmentId=…`. Same-origin/CSRF-protected POST actions are
`save-settings` and `start`. The decoder allowlists settings, candidates, run
counts/errors, validated records and computed calibration summaries. Missing
RPCs produce `area-not-ready` without clearing the staff session. The private
drain returns only claimed/completed/retry/failed/stale counts.

## Official API verification, 23 October 2026

No real API request was made. The official
[Chat Completions reference](https://api-docs.deepseek.com/api/create-chat-completion/)
still documents `POST /chat/completions`, `deepseek-flash` / `deepseek-v4-pro`,
`response_format: {type: "json_object"}` and explicit thinking control. Only Flash
with thinking disabled is supported here. The
[JSON Output guide](https://api-docs.deepseek.com/guides/json_mode/)
requires a JSON instruction and example and warns about empty/truncated results.
The [model page](https://api-docs.deepseek.com/quick_start/pricing/) currently maps
the Flash alias to DeepSeek-V4.1-Flash-1017; this is not an immutable version pin.
No model prices are copied into settings.

[Rate Limit & Isolation](https://api-docs.deepseek.com/quick_start/rate_limit/)
documents account-level concurrency and HTTP 429 on excess load. Application
chunks remain two calls, independently of provider ceilings. The
[error reference](https://api-docs.deepseek.com/quick_start/error_codes/)
distinguishes rate/server overload from request/authentication/balance errors.
Only rate/network/server failures are retried; no provider error body is exposed.
Approved retention/training/transfer terms and actual account capacity remain
owner activation gates, not claims established by the API reference.
