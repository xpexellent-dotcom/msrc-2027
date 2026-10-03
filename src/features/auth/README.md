# Authentication feature boundary

This directory contains the closed synthetic authentication preview, managed
authenticator-TOTP contract and ORG-015 regular-staff application email-check adapter.
ORG-016 participants use email/password plus verified email without phone or MFA;
Super Admins require password plus authenticator TOTP. Regular-staff email receipts
are user/session-bound and do not establish native MFA or AAL2.

Live adapters and every operational workflow remain disabled. See
`docs/features/regular-staff-email-check.md` and the AUTH-04/05 release gates.
