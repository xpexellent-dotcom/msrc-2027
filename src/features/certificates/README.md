# Surveys and certificates

ENG-075 implements CRT-01..06 behind the default-off `CERTIFICATES_ENABLED`
runtime gate and independently disabled database settings. See
[feature notes](../../../docs/features/SURVEYS_CERTIFICATES.md) and
[the task receipt](../../../docs/progress/2026-10-24-claude-surveys-certificates.md).

Participant handlers use native verified claims through service-only RPCs. Staff
handlers use the incumbent exact-session staff authority and authenticated RPCs.
Generation is server-only, leased and recoverable through the existing outbox
drain. English certificate emails are DRAFT and cannot be delivered.

Role/competition certificates remain an extension point requiring separately
approved evidence rules and release paths. There is no ordinary one-day template,
hours field, accreditation entitlement or public certificate directory.
