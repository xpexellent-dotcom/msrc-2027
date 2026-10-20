# Registration emails — DRAFT v1 for owner review

All five templates below are **DRAFT: owner wording approval is pending**.
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

## Seat request received — DRAFT

Key/version: `registration_received` / `1`; payload: `{}`.

Subject: **Seat request received**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

We have received your seat request. Your request is awaiting review. This email does not confirm a seat.

Sign in to My registration: https://www.msrc2027.com/{locale}/registration

Support: contact@msrc2027.com
```

## Seat approved — DRAFT

Key/version: `registration_approved` / `1`; payload: `{}`.

Subject: **You have a seat**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

You have a seat at the conference.

Sign in to view your ticket: https://www.msrc2027.com/{locale}/registration/ticket

Support: contact@msrc2027.com
```

## Seat offered — DRAFT

Key/version: `registration_offered` / `1`;
payload: `{"offer_expires_at":"<database timestamptz>"}`.
ORG-056 approves a 24-hour offer; the owner must configure that value. Offer
acceptance UI is Task 4 and must be available before this email can be activated.

Subject: **A seat is offered to you: reply within 24 hours**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

A seat is offered to you. Accept the offer on My registration before the deadline below.

Offer deadline: {offer_deadline}.

Sign in to My registration: https://www.msrc2027.com/{locale}/registration

Support: contact@msrc2027.com
```

## Waitlisted — DRAFT

Key/version: `registration_waitlisted` / `1`; payload: `{}`.

Subject: **You are on the waitlist**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

You are on the conference waitlist. This email does not confirm a seat.

Sign in to My registration: https://www.msrc2027.com/{locale}/registration

Support: contact@msrc2027.com
```

## Offer expired — DRAFT

Key/version: `registration_expired` / `1`; payload: `{}`.

Subject: **Your offer expired**

```text
The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

Your seat offer has expired.

Sign in to My registration: https://www.msrc2027.com/{locale}/registration

Support: contact@msrc2027.com
```

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
synthetic addresses; owner preview/test-send approval, provider capacity,
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
