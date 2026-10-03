# Authentication route boundary

The staff-security-preview route is an explicitly opted-in, loopback-only synthetic lab
with English/Arabic and RTL support. It denies every deployment environment. Password
entry is simulated. Staff codes use the test inbox by default; an optional private
Windows helper sends bounded self-recipient test email without revealing the code in
UI/API. Super Admins use authenticator TOTP; participants use email/password plus
verified email, without phone or MFA. There is no live sign-in or recovery route. See
`docs/features/regular-staff-email-check.md`.

Every operational workflow and live authentication readiness remain closed.
