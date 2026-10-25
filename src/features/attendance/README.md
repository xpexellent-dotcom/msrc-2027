# Attendance feature boundary

Reserve this directory for a separately authorized attendance slice. No ticket, scan, daily evidence, workshop completion or correction behavior is implemented.

This is an inert M1 structure placeholder. It contains no executable implementation;
operational workflows remain closed. See the project architecture document and the relevant v0.5 release gate.

## Outage fallback (ENG-082)

Super Admins can export a reference-and-name roster for one day and reconcile paper records afterwards (method `offline`). Entitlement is shared with online scanning; online records are never overwritten. See `docs/runbooks/CHECKIN_OUTAGE.md`.
