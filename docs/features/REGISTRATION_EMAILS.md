# Registration emails — approved v1 wording and confirmation drafts

ORG-057 (22 October 2026) **approves the original six templates below as worded**. Delivery
remains off until the separate activation gates pass.
The two ENG-064 confirm-your-seat templates are **DRAFT for owner approval**;
they are not covered by ORG-057. Their wording is documented separately below.
This is the complete plain-text content of the implemented v1 templates. Simple
HTML repeats the same paragraphs in `<html lang="en">`, escapes text and makes
the registration/ticket URL clickable. There are no images, attachments or QR
credentials in email. EN/AR applies to the destination page; every email is in
English (EML-01/04, LOC-03). The participant must sign in to see their own ticket.

Facts come from the existing published site configuration: the name from
`homepageCopy.en.kicker`, the 27–28 January 2027 dates from `conferenceConfig`,
the support address and sender from `contactConfig`, and `siteOrigin` for links.
No prices, capacities, room times or new legal wording are introduced.
The sender is the incumbent `MSRC 2027 <no-reply@msrc2027.com>`; sender verification,
monitored reply handling and inbox delivery remain release checks, not claims
made by these templates. Support is explicitly included in each body.

`{locale}` is `en` or `ar` only. The current DB producer uses `en` because the
registration record does not persist a preferred language. `{offer_deadline}`
is the stored `offer_expires_at`, formatted in English with `Asia/Riyadh` shown;
it is never recalculated as 24 hours from the email's send time. For example,
the synthetic test instant `2026-11-19T17:00:00+00:00` renders as
`19 November 2026 at 20:00 (Asia/Riyadh)`.

## Seat request received

Key/version: `registration_received` / `1`; payload: `{}`.

Subject: **Seat request received**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

We have received your seat request. Your request is awaiting review. This email does not confirm a seat.

Sign in to My registration: https://www.msrc2027.com/{locale}/registration

Support: contact@msrc2027.com
```

## Seat approved

Key/version: `registration_approved` / `1`; payload: `{}`.

Subject: **You have a seat**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

You have a seat at the conference.

Sign in to view your ticket: https://www.msrc2027.com/{locale}/registration/ticket

Support: contact@msrc2027.com
```

## Seat offered

Key/version: `registration_offered` / `1`;
payload: `{"offer_expires_at":"<database timestamptz>"}`.
ORG-056 approves a 24-hour offer; the owner must configure that value. Offer
acceptance is implemented in Task 4 and still requires database and release checks
before this email can be activated.

Subject: **A seat is offered to you: reply within 24 hours**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

A seat is offered to you. Accept the offer on My registration before the deadline below.

Offer deadline: {offer_deadline}.

Sign in to My registration: https://www.msrc2027.com/{locale}/registration

Support: contact@msrc2027.com
```

## Waitlisted

Key/version: `registration_waitlisted` / `1`; payload: `{}`.

Subject: **You are on the waitlist**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

You are on the conference waitlist. This email does not confirm a seat.

Sign in to My registration: https://www.msrc2027.com/{locale}/registration

Support: contact@msrc2027.com
```

## Offer expired

Key/version: `registration_expired` / `1`; payload: `{}`.

Subject: **Your offer expired**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

Your seat offer has expired.

Sign in to My registration: https://www.msrc2027.com/{locale}/registration

Support: contact@msrc2027.com
```

## Registration cancelled

Key/version: `registration_cancelled` / `1`; payload: `{}`.

Subject: **Your registration was cancelled**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

Your conference registration was cancelled. Any ticket for this registration is no longer valid.

Sign in to My registration: https://www.msrc2027.com/{locale}/registration

Support: contact@msrc2027.com
```

Self-cancellation and declining an offer enqueue this template atomically with
the cancellation, ticket revocation and any automatic offer to the next waitlisted
participant. Operation retries do not enqueue another copy. ORG-057 approves
this wording; neither adding the template nor creating its queued event
authorizes delivery.

## DRAFT — Please confirm your seat

Key/version: `registration_confirm_seat` / `1`; payload:
`{"confirm_expires_at":"<database timestamptz>","nonresponse_policy":"release_unconfirmed|keep_unconfirmed"}`.
The policy is explicitly selected by the Super Admin at send time, with no
default. `{confirmation_deadline}` is the stored deadline formatted in English
with `Asia/Riyadh`; it is never extended by delayed email delivery.

Subject: **Please confirm your seat by {confirmation_deadline}**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

Please confirm that you can attend on My registration. If you cannot attend, you can release your seat there.

Confirmation deadline: {confirmation_deadline}.

{nonresponse_sentence}

Sign in to My registration: https://www.msrc2027.com/{locale}/registration

Support: contact@msrc2027.com
```

For `release_unconfirmed`, `{nonresponse_sentence}` is:
“If you do not respond by this deadline, your seat will be released and your
ticket will no longer be valid.” For `keep_unconfirmed`, it is:
“If you do not respond by this deadline, your seat and ticket will be kept.”

## DRAFT — Your seat was released

Key/version: `registration_seat_released` / `1`; payload: `{}`.

Subject: **Your seat was released**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

Your conference seat was released. Your registration is cancelled and your ticket is no longer valid.

Sign in to My registration: https://www.msrc2027.com/{locale}/registration

Support: contact@msrc2027.com
```

Confirmation-window opening and seat release enqueue transactionally with audit
and ticket changes. Repeating an action never sends another event. Confirming
preserves the existing ticket and does not enqueue another approval email.
Confirmation release emits this new message instead of a second cancellation
message. The original six approved subjects and bodies remain unchanged.

## Atomic producers and delivery gates

Registration database events enqueue through the private outbox function in
the same transaction as the business transition. No HTTP enqueue follows a
committed registration. Recipients come from the participant's verified Auth
identity; payloads contain no name, identity number, registration ID or ticket
secret. The service-only generic enqueue API stays limited to `synthetic_notice`
so registration messages must originate in the guarded business transaction.
The table accepts the necessary participant email address for later delivery;
this does not send email. Console/test senders accept `@example.invalid` only.

Preserve the existing off switches: `OUTBOX_ENABLED`, `OUTBOX_RESEND_ENABLED`,
SQL `delivery_enabled` and SQL `sweeps_enabled`. Both daily caps remain zero
by default. No environment values, hosted migrations, settings or delivery
activation are part of this task. Template previews are snapshot-tested with
synthetic addresses; test-send approval, provider capacity,
sender/DNS, monitoring and the other [outbox gates](EMAIL_OUTBOX.md) still apply.
Provider acceptance is not proof of inbox delivery (EML-02–05).

## O10 GET bridge and cron constraints

GET and POST `/api/jobs/outbox/drain` call the same drain boundary. It accepts
only the exact `Authorization: Bearer ${CRON_SECRET}` credential using
fixed-length SHA-256 digests and `timingSafeEqual`. Missing, malformed or unset
secrets fail closed; there is no query-string secret, alternate header or
redirect. HEAD never runs work. The off flag returns 404 before storage/provider
access; invalid authentication returns 401; invalid delivery configuration
returns 503. A zero cap performs no claim or send. Responses contain counts only
and are `no-store`.

The repository records Vercel plan approval as unresolved (CFG-10); no current
paid plan was assumed or changed. Official Vercel documentation checked on
20 October 2026 says Hobby schedules must run at most daily with hourly timing
precision; Pro/Enterprise permit once per minute. More frequent Hobby schedules
fail deployment. The conservative source entry is therefore `0 0 * * *` (UTC),
which is compatible with every plan and inert while delivery is off. This is
not a suitable live delivery target for a 24-hour offer: before activation,
confirm Pro/Enterprise and review changing it to `*/5 * * * *` alongside the
approved delivery budget. No plan upgrade or scheduler activation is performed.
[Vercel cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Vercel sends the secret in its Bearer header. Set the privately generated
`CRON_SECRET` as a server-only Production Secret only when activation is
authorized; this application requires 32–256 ASCII letters/digits/underscore/
hyphen. `.env.example` lists the required names with blank values.
Existing leases, per-message provider idempotency and bounded retry behavior
handle overlapping cron invocations; cron execution alone is not proof that
any email was delivered.
[Vercel cron authentication and behavior](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Staff email previews (ENG-057)

The Super Admin-only EN/AR staff area at `/[locale]/staff/email-previews` shows
all eight registration templates through the same server-side outbox renderer.
Each card labels its own wording status: six approved and two DRAFT.
Recipient `sample@example.invalid` and the offer deadline are fixed SYNTHETIC
examples; no recipient, deadline, or payload can be supplied by the browser.
Email content stays English, while page controls and notices support EN/AR/RTL.
Subject, plain text and HTML source are escaped text, with one Copy text control
per template and a manual-copy message if clipboard access is refused.

The page and its GET area independently reuse existing staff authority; the GET
requires a Super Admin role and completed exact-session TOTP before rendering.
Authenticated server-page rendering supplies the same preview data. There is no
preview data RPC, migration, outbox claim, enqueue, or send; missing registration
migrations cannot block these previews. Existing staff authentication and
readiness still apply. Delivery and every operational switch remain off.

### ENG-064 confirmation maintenance

The existing authenticated GET/POST drain invokes
`msrc_registration_confirmation_maintenance(edition_key text)` before claiming
email only when runtime registration/accounts, outbox configuration and a
positive application cap permit it. The database independently requires its
registration/account gates and outbox `sweeps_enabled`. An explicitly started
round is required; the cron cannot select a policy or create one. Missing new
RPCs report aggregate `confirmation.state: area-not-ready` while existing outbox
delivery retains its behavior. No participant details enter this response.

Explicit database expiry on participant reads/actions and staff actions enforces
the deadline even between cron invocations. The cron handles inactive accounts'
windows and later approvals in an active round. No pg_cron schedule or additional
Vercel schedule is installed; `vercel.json` is unchanged. Vercel's current
[plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), checked
23 October 2026, still restrict Hobby to daily execution. Before activation the
owner must review plan/cadence, delivery budget and these two draft messages.
