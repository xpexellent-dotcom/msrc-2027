# Registration feature boundary

Closed registration includes participant request/identity protection, staff
allocation, early access/settings, My registration and private tickets. All runtime/database
release switches remain independent and closed. The ticket API renders local QR
data URLs only after own-account authorization; staff see status alone.

See [REGISTRATION.md](../../../docs/features/REGISTRATION.md) for the current
contracts and [REGISTRATION_EMAILS.md](../../../docs/features/REGISTRATION_EMAILS.md)
for the six English templates approved by ORG-057 and two confirm-seat drafts;
delivery remains closed. Database transitions enqueue atomically;
this feature never sends inline. Offer acceptance, decline and self-cancellation
use server-only RPCs, the existing edition lock and actor-scoped operation IDs.
The check-in feature owns daily attendance validation; this feature displays only
the participant's own daily status. ENG-064 adds confirm-your-seat and voluntary
release using the same settings lock. Confirmation preserves the issued ticket;
release revokes it and passes the seat to the waitlist. A Super Admin explicitly
chooses the nonresponse policy when starting a round, with no default.

The pre-launch journey review preserves server-owned eligibility, transitions and
document validation. `identity-number.ts` shares the existing format rules with
the form solely to identify malformed input; valid numbers are not blamed for a
generic server rejection. Opening times, attendance dates and offer deadlines are
direction-isolated, and request/refresh completion retains keyboard focus.
The registration Playwright config covers EN/AR at desktop, 390px and 360px, with
200% text/axe checks and synthetic screenshots under `.tools/journey-review/registration/`.

ORG-064 / ENG-073 replaces identity encryption and separate reveal with an ordinary
private child record. New requests require validated, normalized identity; staff
registration details alone show its full number. Existing missing identifiers
remain valid. The registration maintenance path purges identity and legacy masks /
ciphertext one year after the last configured conference day, in bounded batches.
See docs/features/REGISTRATION.md and the Task n10 receipt. All activation gates
remain closed and the migration is review-only.
