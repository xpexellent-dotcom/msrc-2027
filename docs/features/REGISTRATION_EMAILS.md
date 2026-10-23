# Registration emails — bilingual DRAFT previews

ORG-058 (23 October 2026) requires participant emails in English followed by
Arabic, with a banner at the top. **All eight bilingual compositions are DRAFT
pending owner approval before sending.** ORG-057 continues to approve only the
original English wording of the first six templates; that approval does not
approve the added translations or bilingual presentation. The two ENG-064
confirm-your-seat messages remain drafts in both languages.

HTML starts with the approved previous-edition homepage still,
`public/media/msrc2026/poster-desktop-v1.jpg` (MEDIA_REGISTER §9), resized to
`public/brand/email-banner.png` (600 × 338px) without a new crop or added artwork.
The banner URL is `https://www.msrc2027.com/brand/email-banner.png`, with English
alt text `MSRC 2026 conference audience — previous edition` and a maximum display
width of 600px. Its use in this email composition awaits owner approval with
the translation. The complete English message is followed by a divider and
the complete Arabic message in a `dir="rtl" lang="ar"`
block with a local Arabic font stack. Plain text starts with the banner's alt
text and absolute URL, then repeats both complete messages and the divider.
Subjects use `English subject | Arabic subject`. No tracking pixel, remote font,
attachment or QR credential is included. Sign-in remains necessary to see a ticket.

Facts come from the existing published site configuration: the name from
`homepageCopy.en.kicker`, the 27–28 January 2027 dates from `conferenceConfig`,
the support address and sender from `contactConfig`, and `siteOrigin` for links.
No prices, capacities, room times or new legal wording are introduced.
The sender is the incumbent `MSRC 2027 <no-reply@msrc2027.com>`; sender verification,
monitored reply handling and inbox delivery remain release checks, not claims
made by these templates. Support is explicitly included in each body.

`{locale}` is `en` or `ar` only. The DB producer continues to use `en` because
the registration record does not persist a preferred language; neither schema,
RPC signatures nor payloads change for the bilingual renderer. English keeps
the existing `{locale}` interface link; Arabic links to `/ar`. Dates and times
are rendered in both languages with Arabic month names and Riyadh time in Arabic. The stored
`offer_expires_at` and `confirm_expires_at` determine deadlines; delayed delivery
never recalculates or extends them. The synthetic instant
`2026-11-19T17:00:00+00:00` is 20:00 Riyadh time on 19 November 2026.

The previews below are exact synthetic renderer output, not live participant messages.
Their sample offer/confirmation deadlines are fixtures, not operational settings.

## DRAFT — Seat request received

Key/version: `registration_received` / `1`; payload: `{}`.

Subject (DRAFT): **Seat request received | تم استلام طلب حجز مقعد**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

We have received your seat request. Your request is awaiting review. This email does not confirm a seat.

Sign in to My registration: https://www.msrc2027.com/en/registration

Support: contact@msrc2027.com

---

المؤتمر الخامس لأبحاث طلاب الطب

موعد المؤتمر: ٢٧–٢٨ يناير ٢٠٢٧.

لقد استلمنا طلبك لحجز مقعد. طلبك بانتظار المراجعة. لا تُعد هذه الرسالة تأكيدًا لحجز مقعد.

سجّل الدخول إلى صفحة تسجيلي: https://www.msrc2027.com/ar/registration

للدعم: contact@msrc2027.com
```

## DRAFT — Seat approved

Key/version: `registration_approved` / `1`; payload: `{}`.

Subject (DRAFT): **You have a seat | لديك مقعد في المؤتمر**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

You have a seat at the conference.

Sign in to view your ticket: https://www.msrc2027.com/en/registration/ticket

Support: contact@msrc2027.com

---

المؤتمر الخامس لأبحاث طلاب الطب

موعد المؤتمر: ٢٧–٢٨ يناير ٢٠٢٧.

لديك مقعد في المؤتمر.

سجّل الدخول لعرض تذكرتك: https://www.msrc2027.com/ar/registration/ticket

للدعم: contact@msrc2027.com
```

## DRAFT — Seat offered

Key/version: `registration_offered` / `1`;
payload: `{"offer_expires_at":"<database timestamptz>"}`.
ORG-056 approves a 24-hour offer; the owner must configure that value. Offer
acceptance is implemented in Task 4 and still requires database and release checks
before this email can be activated.

Subject (DRAFT): **A seat is offered to you: reply within 24 hours | عُرض عليك مقعد: يُرجى الرد خلال ٢٤ ساعة**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

A seat is offered to you. Accept the offer on My registration before the deadline below.

Offer deadline: 19 November 2026 at 20:00 (Asia/Riyadh).

Sign in to My registration: https://www.msrc2027.com/en/registration

Support: contact@msrc2027.com

---

المؤتمر الخامس لأبحاث طلاب الطب

موعد المؤتمر: ٢٧–٢٨ يناير ٢٠٢٧.

عُرض عليك مقعد. اقبل العرض من صفحة تسجيلي قبل الموعد النهائي الموضح أدناه.

الموعد النهائي لقبول العرض: ١٩ نوفمبر ٢٠٢٦ في ٢٠:٠٠ (بتوقيت الرياض).

سجّل الدخول إلى صفحة تسجيلي: https://www.msrc2027.com/ar/registration

للدعم: contact@msrc2027.com
```

## DRAFT — Waitlisted

Key/version: `registration_waitlisted` / `1`; payload: `{}`.

Subject (DRAFT): **You are on the waitlist | أنت على قائمة الانتظار**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

You are on the conference waitlist. This email does not confirm a seat.

Sign in to My registration: https://www.msrc2027.com/en/registration

Support: contact@msrc2027.com

---

المؤتمر الخامس لأبحاث طلاب الطب

موعد المؤتمر: ٢٧–٢٨ يناير ٢٠٢٧.

أنت على قائمة انتظار المؤتمر. لا تُعد هذه الرسالة تأكيدًا لحجز مقعد.

سجّل الدخول إلى صفحة تسجيلي: https://www.msrc2027.com/ar/registration

للدعم: contact@msrc2027.com
```

## DRAFT — Offer expired

Key/version: `registration_expired` / `1`; payload: `{}`.

Subject (DRAFT): **Your offer expired | انتهت صلاحية عرض المقعد**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

Your seat offer has expired.

Sign in to My registration: https://www.msrc2027.com/en/registration

Support: contact@msrc2027.com

---

المؤتمر الخامس لأبحاث طلاب الطب

موعد المؤتمر: ٢٧–٢٨ يناير ٢٠٢٧.

انتهت صلاحية عرض المقعد المقدم لك.

سجّل الدخول إلى صفحة تسجيلي: https://www.msrc2027.com/ar/registration

للدعم: contact@msrc2027.com
```

## DRAFT — Registration cancelled

Key/version: `registration_cancelled` / `1`; payload: `{}`.

Subject (DRAFT): **Your registration was cancelled | تم إلغاء تسجيلك**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

Your conference registration was cancelled. Any ticket for this registration is no longer valid.

Sign in to My registration: https://www.msrc2027.com/en/registration

Support: contact@msrc2027.com

---

المؤتمر الخامس لأبحاث طلاب الطب

موعد المؤتمر: ٢٧–٢٨ يناير ٢٠٢٧.

تم إلغاء تسجيلك في المؤتمر. لم تعد أي تذكرة مرتبطة بهذا التسجيل صالحة.

سجّل الدخول إلى صفحة تسجيلي: https://www.msrc2027.com/ar/registration

للدعم: contact@msrc2027.com
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
default. The stored confirmation deadline is formatted in English with
`Asia/Riyadh` and in Arabic with Riyadh time; delayed delivery never extends it.

Subject (DRAFT): **Please confirm your seat by 24 January 2027 at 20:00 (Asia/Riyadh) | يُرجى تأكيد مقعدك بحلول ٢٤ يناير ٢٠٢٧ في ٢٠:٠٠ (بتوقيت الرياض)**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

Please confirm that you can attend on My registration. If you cannot attend, you can release your seat there.

Confirmation deadline: 24 January 2027 at 20:00 (Asia/Riyadh).

If you do not respond by this deadline, your seat will be released and your ticket will no longer be valid.

Sign in to My registration: https://www.msrc2027.com/en/registration

Support: contact@msrc2027.com

---

المؤتمر الخامس لأبحاث طلاب الطب

موعد المؤتمر: ٢٧–٢٨ يناير ٢٠٢٧.

يُرجى تأكيد قدرتك على الحضور من صفحة تسجيلي. إذا تعذّر عليك الحضور، فيمكنك إتاحة مقعدك لغيرك من الصفحة نفسها.

الموعد النهائي للتأكيد: ٢٤ يناير ٢٠٢٧ في ٢٠:٠٠ (بتوقيت الرياض).

إذا لم ترد بحلول هذا الموعد، فسيُتاح مقعدك لغيرك ولن تعود تذكرتك صالحة.

سجّل الدخول إلى صفحة تسجيلي: https://www.msrc2027.com/ar/registration

للدعم: contact@msrc2027.com
```

For `release_unconfirmed`, `{nonresponse_sentence}` is:
“If you do not respond by this deadline, your seat will be released and your
ticket will no longer be valid.” For `keep_unconfirmed`, it is:
“If you do not respond by this deadline, your seat and ticket will be kept.”

### DRAFT — Keep-unconfirmed alternative

The same confirmation template with synthetic `nonresponse_policy: "keep_unconfirmed"` renders:

Subject (DRAFT): **Please confirm your seat by 24 January 2027 at 20:00 (Asia/Riyadh) | يُرجى تأكيد مقعدك بحلول ٢٤ يناير ٢٠٢٧ في ٢٠:٠٠ (بتوقيت الرياض)**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

Please confirm that you can attend on My registration. If you cannot attend, you can release your seat there.

Confirmation deadline: 24 January 2027 at 20:00 (Asia/Riyadh).

If you do not respond by this deadline, your seat and ticket will be kept.

Sign in to My registration: https://www.msrc2027.com/en/registration

Support: contact@msrc2027.com

---

المؤتمر الخامس لأبحاث طلاب الطب

موعد المؤتمر: ٢٧–٢٨ يناير ٢٠٢٧.

يُرجى تأكيد قدرتك على الحضور من صفحة تسجيلي. إذا تعذّر عليك الحضور، فيمكنك إتاحة مقعدك لغيرك من الصفحة نفسها.

الموعد النهائي للتأكيد: ٢٤ يناير ٢٠٢٧ في ٢٠:٠٠ (بتوقيت الرياض).

إذا لم ترد بحلول هذا الموعد، فسيُحتفظ بمقعدك وتذكرتك.

سجّل الدخول إلى صفحة تسجيلي: https://www.msrc2027.com/ar/registration

للدعم: contact@msrc2027.com
```

## DRAFT — Your seat was released

Key/version: `registration_seat_released` / `1`; payload: `{}`.

Subject (DRAFT): **Your seat was released | تمت إتاحة مقعدك لغيرك**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The 5th Medical Students Research Conference

Conference dates: 27–28 January 2027.

Your conference seat was released. Your registration is cancelled and your ticket is no longer valid.

Sign in to My registration: https://www.msrc2027.com/en/registration

Support: contact@msrc2027.com

---

المؤتمر الخامس لأبحاث طلاب الطب

موعد المؤتمر: ٢٧–٢٨ يناير ٢٠٢٧.

تمت إتاحة مقعدك في المؤتمر لغيرك. تم إلغاء تسجيلك ولم تعد تذكرتك صالحة.

سجّل الدخول إلى صفحة تسجيلي: https://www.msrc2027.com/ar/registration

للدعم: contact@msrc2027.com
```

Confirmation-window opening and seat release enqueue transactionally with audit
and ticket changes. Repeating an action never sends another event. Confirming
preserves the existing ticket and does not enqueue another approval email.
Confirmation release emits this new message instead of a second cancellation
message. The original English wording is preserved inside each new bilingual
DRAFT composition.

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
The worker additionally refuses every participant DRAFT template, including an
older frozen English-only request for the same key. Opening outbox switches
cannot substitute for a reviewed template-approval change. Existing frozen
provider requests are not rewritten by this rendering change.

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

## Staff email previews (ENG-057/066)

The Super Admin-only EN/AR staff area at `/[locale]/staff/email-previews` shows
all eight registration templates and all three abstract decision outcomes through
the same server-side outbox renderer. Every bilingual composition is labeled
DRAFT pending owner approval; [ABSTRACT_REVIEW](ABSTRACT_REVIEW.md) contains the
three complete abstract preview texts.
Recipient `sample@example.invalid` and the offer deadline are fixed SYNTHETIC
examples; no recipient, deadline, or payload can be supplied by the browser.
Email content shows English followed by Arabic in both staff interface locales;
page controls and notices support EN/AR/RTL. The banner and formatted bilingual
HTML are previewable alongside the subject, plain text and escaped HTML source.
Copy controls retain a manual-copy message if clipboard access is refused.

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
