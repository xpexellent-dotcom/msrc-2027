# Authentication route boundary

The staff-security-preview route is an explicitly opted-in, loopback-only synthetic lab
with English/Arabic and RTL support. It denies every deployment environment. Password
entry, email delivery and phone MFA are simulated; there is no live sign-in or recovery
route. Regular-staff email checking preserves separate Super Admin MFA and participant
verification. See `docs/features/regular-staff-email-check.md`.

Every operational workflow and live authentication readiness remain closed.
