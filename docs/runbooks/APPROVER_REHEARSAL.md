# Approver rehearsal — synthetic staging only

ENG-056; ORG-055/056; REG-01–08, ROL-07/10/12, LOC-01/03, SEC-01/06.
Owner-facilitated practice, not permission to activate hosted workflows or send
real mail. Use [STAGING_SETUP](STAGING_SETUP.md). Record date, source SHA,
synthetic run ID, facilitator and each result privately. Names/rota remain TBD.

**Current prerequisite:** the shipped staff/participant resolvers accept only
the designated Production project/origins or fixed local mock providers. Hosted
Preview sign-in and a synthetic email sink require a separate reviewed staging
runtime implementation. Until that exists, this rehearsal is BLOCKED on hosted
staging. Local mock browser tests rehearse UI, not native Auth or real inboxes.
Do not set Vercel to Production, copy live keys, bypass email assurance or use
test-mode switches on Vercel to get a pass.

## Prepare the room

1. Facilitator confirms isolated Tokyo project, protected staging app and
   synthetic `@example.invalid` accounts; outbox delivery and real email remain
   off. The staged email-check adapter must capture synthetic codes privately
   in a test sink. These addresses cannot receive real email. A later real-staff
   inbox test is a separate authorized release gate.
2. Use two distinct synthetic Super Admin identities, each with its own TOTP
   factor, plus individually identified synthetic approvers. Grant approvers
   **Registration and workshops administrator** (`registrationWorkshopAdministrator`)
   for the staging edition. Do not grant `superAdmin` just to expose export or
   settings. Seed grants are development fixtures, not invitation-delivery proof.
3. Super Admin reviews settings in both EN and AR: free registration, staging
   times, explicit capacity, age 18, terms version and 24-hour offer duration.
   Confirm the linked early/priority windows and all legacy required timings.
   Saving cannot open registration. Any eventual staging activation is a
   separately recorded owner step after runtime support exists.
4. Prepare distinct synthetic requests: pending, eligible early-list email,
   ineligible email, approved, waitlisted in known creation order, offered and
   elapsed offer. Submit through the application after the authorized staging
   window opens. For expiry, wait the real 24h or use a **separate disposable,
   reviewed time-boundary fixture**; never shorten the approved live window or
   alter live deadlines to speed up practice. Decline provides an immediate
   hand-on exercise without rewriting timestamps.

## Facilitated practice (about 60 minutes; planning duration)

| Exercise | Steps | Expected evidence |
| --- | --- | --- |
| Sign-in and scope | Open `/en/staff/sign-in`, enter own synthetic password, request the email check, read newest six-digit code from the private test sink and complete it in the same session. Repeat Arabic at `/ar/staff/sign-in`. Sign out and start another session. | Each new regular-staff session needs its own check; a code from the first session cannot authorize the second. No TOTP requirement is substituted for regular staff. Wrong/expired/reused codes deny. Super Admins use password plus native TOTP. |
| Role boundaries | Open registration queue. Try direct settings/early-access/export URLs using an approver session. | Approver sees only allowed controls; direct server calls deny too. Super Admin can reach settings/list and masked export. A missing migration displays `area-not-ready`, retains the session and blocks the exercise. |
| Early access | Super Admin adds a synthetic email before its participant account exists, normalizes a case/space variant and removes another. Eligible and ineligible participants attempt submission before general opening. | List grants early submission only; no admission or workshop priority. At general opening, eligibility no longer depends on the list. Audit shows actual changes. |
| One approval | Filter pending requests, open detail, inspect synthetic request and approve once. Refresh. | Free request becomes approved, one ticket is issued and one approval event is queued. Repeating approval does not issue a second ticket. Queued email is not delivered email. |
| Bulk and collision | Select a small recorded batch and approve; two approvers simultaneously act on overlapping IDs, then near the seat limit. | Review actual approved/skipped results, not selected count. Refresh both screens; held seats never exceed capacity. No duplicate ticket/event. Keep the conflict result in the receipt. |
| Waitlist and offer | Move pending request to waitlist, then offer to a waitlisted request with room available. | Offer holds a seat, displays a database-time deadline 24h later, and creates an offered event. Waitlisting alone holds no seat. No payment step. |
| Auto-pass on expiry | For an actually elapsed offer, refresh the authorized staff queue (or affected participant status). | Old request becomes expired; only its released seat passes to the next waitlisted request ordered by `created_at,id`. History shows **Automatic**, not the reading staff member. New offer gets a fresh 24h deadline. Repeated refresh cannot pass the same seat twice. No background scheduler is claimed. |
| Participant acceptance / decline | Offered synthetic participant opens My registration, accepts once; another declines. | Accept gives approved status and one ticket; decline cancels and passes only the released seat onward. Repeated action is idempotent; an elapsed offer cannot be accepted. |
| CSV | Super Admin exports the current edition; approver attempts the same route. Inspect the synthetic CSV in a protected location. | Only Super Admin succeeds. CSV has masked identifiers, safe spreadsheet cells and expected rows; no decrypted national ID/passport, QR token or secret. An error response is shown, not saved as CSV. Delete private exports after the exercise. |
| Session and recovery | Sign out, revisit a saved link; exercise cooldown with a dedicated account, not the active facilitator. The second synthetic Super Admin rehearses authenticator reset of the first. | Stale sessions deny, sign-out clears cookies. Recovery hold remains on failure. No shared accounts or bypass. Record native Auth recovery separately from mocked UI tests. |

Repeat the working queue/detail/batch paths on phone widths and in Arabic RTL;
read timestamps and button states aloud. Confirm that action failure, partial
success and capacity warnings remain understandable. This task adds no UI.

## Mistakes and stop conditions

- Wrong selection before submission: clear selection and recheck detail.
- Wrong waitlist decision: review authority and current status; an eligible
  waitlisted request can be approved or offered under the existing capacity
  rules. Keep both audit entries; never edit history to hide the mistake.
- Wrong approval/offer: stop that batch and report request reference privately.
  There is **no staff undo/cancel button** in this slice. Do not edit table state
  or revoke a ticket manually. The synthetic participant can decline/cancel in
  rehearsal; a real correction needs owner-reviewed policy and an audited
  supported path. Cancellation can automatically pass a released seat onward.
- Timeout/unknown result: refresh status and audit before repeating. Reuse the
  same supported operation identity for an exact retry; do not invent a new
  request to overcome uncertainty.
- Capacity, missing RPC, failed email check, wrong edition or unexpected data:
  stop and record FAIL/BLOCKED. Do not broaden roles or change configuration
  merely to complete the exercise.

Each approver signs off only the paths they personally completed. The facilitator
records PASS/FAIL/BLOCKED per row, aggregate counts, conflicts, bugs and retest
evidence. Open issues and missing native-mail/staging-runtime proof carry into
the [opening-night go/no-go](OPENING_NIGHT.md). Keep scripts' synthetic manifests
and credentials out of receipts; revoke rehearsal sessions and tear down as
described in the setup guide.
