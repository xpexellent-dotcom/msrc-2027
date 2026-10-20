# Registration feature boundary

Closed registration includes participant request/identity protection, staff
allocation, early access/settings, My registration and private tickets. All runtime/database
release switches remain independent and closed. The ticket API renders local QR
data URLs only after own-account authorization; staff see status alone.

See [REGISTRATION.md](../../../docs/features/REGISTRATION.md) for the current
contracts and [REGISTRATION_EMAILS.md](../../../docs/features/REGISTRATION_EMAILS.md)
for the six DRAFT English templates. Database transitions enqueue atomically;
this feature never sends inline. Offer acceptance, decline and self-cancellation
use server-only RPCs, the existing edition lock and actor-scoped operation IDs.
Check-in validation and the later confirm-your-seat stage remain separate work.
