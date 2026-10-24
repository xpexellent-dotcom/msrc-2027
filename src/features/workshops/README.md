# Workshop booking — ENG-074

WKS-01–07 and CHK-03 have a separate closed workshop boundary. Operational values
are nullable rather than seeded. Runtime `WORKSHOP_BOOKING_ENABLED` and the private
database policy independently gate participant actions; mock payment additionally
requires `WORKSHOP_MOCK_PAYMENT_ENABLED` and its database switch. No paid adapter,
hosted settings, migration application, scheduler or real email is introduced.

The participant `/api/workshops` handler reuses registration's native identity,
session-cookie, verified claims, privacy/readiness and rate-limit patterns. Only
the server secret can call participant RPCs. Workshop-specific signed action
tokens bind the origin, actor and exact session; mutation input excludes actor,
eligibility, approval, discount and status authority. Uncertain browser retries
retain their operation ID until a definite result. Missing RPCs return
`area-not-ready` and retain the account session.

My MSRC lists actual holds, approvals, bookings, offers, waitlist entries and
terminal history in EN/AR. It shows workshop check-in and completion evidence,
with no personal schedule builder. Held and offered places are explicitly
distinct from confirmed bookings. Free places and validated full discounts still
require a separate staff approval before confirmation.

Public workshop pages retain their existing static unannounced rendering. After
hydration, `/api/workshops/public` reads uncached allocation counts through the
safe published-only RPC, independently of participant login. A complete strict
allowlist rejects private or over-returned fields before they reach the browser.
Removed and unpublished records are rejected. Published fields may remain unset;
they do not imply booking readiness. The programme CMS's workshop-type sessions
remain editorial programme records; they do not allocate seats or grant booking
authority. No participant names are exposed on public pages.

The database owns request ordering, capacity, expiry, waitlist offers, eligibility,
overlap checks and immutable evidence. Browser clocks and buttons never decide
allocation or confirmation. See the task receipt at
`docs/progress/2026-10-24-claude-workshop-booking.md` for checks actually run and
the separate release gates.
