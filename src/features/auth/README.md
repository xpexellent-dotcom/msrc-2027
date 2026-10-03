# Authentication feature boundary

This directory contains the closed synthetic authentication preview, managed phone-MFA
adapter and ORG-015 regular-staff application email-check adapter. Participants retain
email/password plus email/phone verification without MFA; Super Admins retain separate
SMS MFA. Regular-staff email receipts are user/session-bound and do not establish AAL2.

Live adapters and every operational workflow remain disabled. See
`docs/features/regular-staff-email-check.md` and the AUTH-04/05 release gates.
