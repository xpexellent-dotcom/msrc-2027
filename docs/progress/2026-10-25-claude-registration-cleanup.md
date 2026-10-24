# Registration cleanup — 24/25 October 2026 (ENG-081)

Owner request: remove the confusing legacy settings field and make sure attendees are made aware of event photography (awareness only, no opt-out).

## Change
- **Legacy `waitlist_offer_hours` retired.** It was unused (offers use `offer_window_hours`) but still required by the readiness check.
  - Migration `20261025130000_registration_cleanup.sql` redefines `msrc_registration.settings_complete` without it, which also governs the settings save RPC. The column is kept and commented as retired.
  - The staff settings form no longer shows it. The client-side completeness mirror, EN/AR hint copy and activation guide are updated, along with the unit, e2e and pgTAP expectations.
- **Photography notice.** The registration request form already showed a one-line notice. It now uses the approved Terms v1.0 section 6 sentence (EN and AR, ORG-037/041) and points to section 5 of the Privacy Policy for removal requests. There is no opt-out control, as the owner decided.

## Evidence
- `tsc --noEmit`: PASS
- `eslint` (changed areas): PASS
- `vitest` on registration settings, launch readiness and registration units: 7 files, 263 tests, PASS
- pgTAP and e2e: run in CI.

## Not in this PR
The check-in outage fallback (CHK-05) is queued as a separate task.
