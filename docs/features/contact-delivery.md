# Contact delivery: review and activation

BL-PUB-06; SUP-01–03, EML-01/04, PRV-03, SEC-01/06, ACC-01 and LOC-01.
Baseline: main `9971534`, after PR30 and PR32. Authority: ORG-028/029, 4 October 2026.
The adapter is implemented for review, with delivery **off by default**. No production
settings, hosted migrations or real emails are changed by this task. Authentication,
role grants, session policies and other operational workflows remain closed/unchanged.

## Behavior and data

Off or unset `CONTACT_DELIVERY_ENABLED` preserves the previous disabled EN/AR form and
`503 CONTACT_CLOSED` API before reading visitor headers, URL or body. The mailto link
always remains. An enabled but incomplete/untrusted environment fails unavailable.
Real delivery is restricted to Vercel Production at `msrc2027.com` or
`www.msrc2027.com`. Preview cannot deliver. No-JavaScript visitors use the mailto fallback.

Enabled requests require a same-origin POST, bounded uncompressed JSON, strict existing
field validation/honeypot, Vercel's trusted IP header and a signed locale/origin-bound
token. The token has a 30-minute engineering lifetime and minimum fill time. A new
attempt requires a new token. Token, IP and normalized-email HMACs use distinct contexts;
the secret never reaches the browser. Lowercasing the email for throttling prevents
case variations evading the same-address limit; delivery preserves its validated value.
These controls reduce abuse; they cannot prove a human or prevent distributed abuse.

The server reserves five fixed UTC quota buckets (IP hour/day, email hour/day, global
day) and a single-use nonce atomically before making one Resend request. Global Contact
admission is capped at 60/day; provider failures and uncertain responses consume quota,
with no refund, automatic retry or background queue. This preserves budget headroom;
it does not implement future authentication email quotas. Hour/day windows reset at UTC
boundaries rather than sliding continuously. Used tokens cannot make a second provider
attempt. A unique provider idempotency key adds defense without replaying requests.

All nine existing tags keep the fixed recipient `contact@msrc2027.com`. From is
`MSRC 2027 <no-reply@msrc2027.com>`; Reply-To is the validated visitor email. Subject is
the tag plus the short derived summary. Only an escaped `text` body is sent, with English
labels and the visitor's EN/AR language/original content. No HTML, attachments or visitor
acknowledgment. Provider acceptance shows "Thanks, we'll reply by email"; it is not proof
of inbox delivery. Errors retain the visitor's form in memory and offer explicit recovery.
An uncertain send warns about possible duplicates and requires a separate fresh-attempt
action and send click. There is no automatic resend or browser persistence.

The app retains no message, name, email, reference or raw IP. Supabase stores only bucket
names, HMAC values, counts and time windows. Forced RLS and revoked browser privileges
protect a private schema; no table is exposed through a browser SDK. Submission logs
contain only `{outcome, topic}` with allowed outcomes `sent`, `rejected`, `limited`.
Contact remains excluded from analytics/Speed Insights. Infrastructure request/security
logs and database backups have independent retention; no raw query values are logged by
the adapter. Do not add body inspection, request capture or inquiry analytics.

Resend and the receiving inbox necessarily process/retain the delivered message.
[Resend documents](https://resend.com/security) US storage and 30-day email/log retention
on Free/Pro/Scale, plus seven-day backup retention. Sending-region selection does not
establish storage location. Provider/inbox retention, location/transfer approval and the
requested external-storage exception remain unresolved. Public drafts describe conditional
Contact processing factually; final legal wording, Terms and photography-publication
placeholders remain pending. Staff authentication email is a separate release gate.

## Configuration

All values are **server-only, Production only**, entered in Vercel secret/configuration
storage. Never use `NEXT_PUBLIC_`, Preview secrets, public documents or screenshots.

| Variable | Required value |
| --- | --- |
| `CONTACT_DELIVERY_ENABLED` | `false` until all steps below pass, then exactly `true` |
| `RESEND_API_KEY` | Existing organizer-reported Sending-only domain-restricted key |
| `CONTACT_SUPABASE_URL` | `https://ecemjggwlzqpjcwmchrl.supabase.co` |
| `CONTACT_SUPABASE_SECRET_KEY` | A backend `sb_secret_...` key, preferably separately named for Contact custody/rotation |
| `CONTACT_SECURITY_SECRET` | Stable 32 random bytes encoded as 64 hexadecimal characters |
| `CONTACT_MINIMUM_FILL_SECONDS` | Proposed `3`, pending organizer confirmation |
| `CONTACT_IP_HOUR_LIMIT`, `CONTACT_EMAIL_HOUR_LIMIT` | Proposed `3` each, pending confirmation |
| `CONTACT_IP_DAY_LIMIT`, `CONTACT_EMAIL_DAY_LIMIT` | Proposed `10` each, pending confirmation |

Quota settings are positive integers up to 60, with hour no greater than day. Minimum
fill time is 3–300 seconds. Invalid settings fail unavailable; blank settings use the
reviewable proposals, so confirm them before opening. The database hard-codes global 60.
Generate the security secret privately with a cryptographically secure generator and
save directly to Vercel; do not paste it into chat/source/output. Keep it stable across
deployments so per-identity quotas continue to match. Rotation invalidates outstanding
tokens and changes per-IP/email hashes; global quota still holds. Rotate while closed.

The Supabase secret is broader than a per-RPC credential: its service_role privilege
bypasses RLS ([Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)).
This adapter uses only the counter RPC, with `apikey` and no Bearer header. Never reuse
it in client code. This task does not inspect/create/rotate any real credential.

## Apply exactly one reviewed hosted migration — owner action only

No Docker is needed on the owner's computer. Review the green disposable CI results and
`supabase/migrations/20261004114603_contact_abuse_counters.sql` before doing these steps.
It adds only `msrc_contact.attempt_buckets`, its live-counter protection trigger, the
service-role-only `public.msrc_contact_reserve_attempt` RPC, private expiry cleanup,
pg_cron if absent and the `msrc-contact-expiry` job every five minutes. It depends on no
pending staff/session/auth migration. Do not reapply persisted authorization or push the
historical migration directory.

1. Keep `CONTACT_DELIVERY_ENABLED` off. In Supabase Dashboard select Production project
   **ecemjggwlzqpjcwmchrl**, then SQL Editor with the native **postgres** role selected.
   The cron job must run as that administrative owner, matching the check below.
2. Execute **only that complete migration file**, inside a transaction (`BEGIN;`, file,
   `COMMIT;`). If it fails, roll back and leave delivery off; do not repair history yet.
3. After successful SQL application, record only this version in migration history.
   With the pinned repository CLI, log in privately and run from the repository:

   ```powershell
   pnpm exec supabase link --project-ref ecemjggwlzqpjcwmchrl
   pnpm exec supabase migration repair 20261004114603 --status applied --linked
   pnpm exec supabase migration list --linked
   ```

   Use native credential prompts; never put passwords/tokens in command arguments,
   screenshots or chat. `repair` records history and does not execute the SQL. Leave
   every unrelated pending migration untouched. **Do not run `db:push`, `db:reset` or seeds.**
4. Verify the metadata with read-only SQL below. No hosted synthetic fixtures are needed.

   ```sql
   select relrowsecurity, relforcerowsecurity
   from pg_class where oid = 'msrc_contact.attempt_buckets'::regclass;
   -- Both must be true.
   select
     has_schema_privilege('anon', 'msrc_contact', 'usage') as anon_schema,
     has_schema_privilege('authenticated', 'msrc_contact', 'usage') as authenticated_schema,
     has_function_privilege('anon',
       'public.msrc_contact_reserve_attempt(text,text,text,timestamptz,integer,integer,integer,integer)',
       'execute') as anon_rpc,
     has_function_privilege('authenticated',
       'public.msrc_contact_reserve_attempt(text,text,text,timestamptz,integer,integer,integer,integer)',
       'execute') as authenticated_rpc,
     has_function_privilege('service_role',
       'public.msrc_contact_reserve_attempt(text,text,text,timestamptz,integer,integer,integer,integer)',
       'execute') as service_rpc;
   -- First four false; service_rpc true.
   select jobname, schedule, active, username
   from cron.job where jobname = 'msrc-contact-expiry';
   -- One active postgres-owner job, schedule */5 * * * *.
   select status, start_time, end_time
   from cron.job_run_details where jobid in
     (select jobid from cron.job where jobname = 'msrc-contact-expiry')
   order by start_time desc limit 3;
   -- After the first scheduled interval, recent runs should succeed.
   ```

Expiry is enforced in quota admission even before cleanup. Physical deletion is scheduled
every five minutes, subject to job health; the owner must monitor pg_cron. Database backup
retention is separate and remains a privacy decision. Do not reset live counters to evade
the daily cap. Actual concurrency/ACL/cron execution is verified only in disposable CI.

## Turn on — owner action only

1. Review/approve the proposed per-IP/email rates and fill time, the provider/inbox storage
   interpretation and required processing/location/retention wording. Confirm shared-inbox
   custody and forwarding. Review the PR and green CI; merge/deploy only under the normal
   project workflow, with delivery still off.
2. Apply/verify only the migration above. Add the Production-only server configuration
   from the table; keep the approved Resend secret private. Deploy with the flag off and
   confirm EN/AR disabled forms plus `503 CONTACT_CLOSED`.
3. Set `CONTACT_DELIVERY_ENABLED=true` for Production and **redeploy**. Vercel applies
   environment changes to the next deployment, not running deployments
   ([Vercel documentation](https://vercel.com/docs/environment-variables)). Check EN/AR
   rendering and the mailto fallback. Never add the real secrets to a Preview deployment.
4. Perform an owner-authorized small human test: wait the minimum fill time, submit to
   the fixed inbox, verify tag/summary, plaintext/language, From and Reply-To and no
   automatic visitor acknowledgment. Confirm actual inbox receipt and replying, not just
   an accepted API result. Verify an intentional invalid request and safe retry state;
   do not intentionally exhaust the shared daily budget. Check only outcome/topic logs.
5. Watch provider delivery/bounces, available quota and cron health. Human EN/AR, mobile,
   keyboard and screen-reader UAT remains distinct from automated axe/Playwright tests.

An environment flag is a redeploy switch and cannot satisfy "off instantly" literally.
For emergency interruption before redeploy completes, a credential custodian can revoke
the dedicated Sending key, considering any other consumers. Already accepted email cannot
be recalled. A truly dynamic kill switch would require an additional reviewed design.

## Verification, preview and rollback

`pnpm check` covers lint/types/unit/build. `pnpm exec playwright test --config
playwright.contact.config.ts` starts enabled/closed loopback builds and a mock Resend/
counter service with dummy keys; no real email or hosted DB call is possible. Coverage
includes EN/AR/RTL/axe/no-JS, validation/escaping/routing, flag/config boundaries, byte
bounds, signed token timing/binding/replacement/replay, quotas/global cap, safe provider
errors/timeouts and explicit retry. Unit mocks assert exact requests and privacy logs.
Disposable GitHub CI runs the real migration, forced-RLS/ACL assertions, simultaneous
quota admission, locking failures, expiry and actual scheduled cleanup alongside existing
Auth/database regressions. A protected development Preview shows the closed state only.
Executed counts/receipts belong in PROGRESS and the draft PR. No hosted test or real inbox
receipt is claimed by these automated tests.

To disable, set the flag false and redeploy; keep counters and expiry job running. Code
rollback restores the former closed form/handler. No inquiry content requires database
recovery. If schema removal is later desired, first close delivery, wait for expired
counters, then review a separate removal migration that unschedules **only** the Contact
job and removes its RPC/schema. Never drop pg_cron or other jobs. Preserve decision and
migration history. Next smallest task: review/apply the Contact-only migration and finish
the above configuration/privacy/human-delivery checks; final Privacy/Terms approval and
staff authentication delivery/recovery remain separate work.
