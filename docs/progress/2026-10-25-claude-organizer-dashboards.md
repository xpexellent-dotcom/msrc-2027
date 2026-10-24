# Organizer dashboards and exports — 25 October 2026 (ENG-079)

Spec §16 ADM-01..05. Started by Codex (gpt-6.1-sol, ultra), which stopped at its usage limit; Claude reviewed and finished it.

## What it does
- **Dashboard (ADM-01).** The staff home now shows role-scoped counts from one server RPC, `msrc_staff_dashboard`:
  - registrations by state
  - verified accounts
  - mock orders/exceptions, labelled as not real payments
  - submissions by stage/specialty, and review workload
  - accepted work
  - workshop bookings
  - attendance per conference day
  - certificates and eligibility
  - announcement delivery
  - hackathon/3MT stages
  - email failures

  Each role receives only its modules. Reviewers and judges see only their own assignments.
- **Small-cell suppression.** For non-Super-Admin roles, if any cell in a partition is below 5, the whole partition is hidden, so totals can't be used to reconstruct a hidden cell.
- **Participant finder (ADM-02).** Super Admin only, by exact email or reference. Audited with the query *kind* only, never the text.
- **Exports (ADM-03)** via `msrc_staff_dashboard_export`. The CSV is UTF-8 with a BOM (Arabic opens correctly in Excel) and neutralizes formula injection (`= + - @`, including whitespace/BOM-prefixed values).
  - Aggregate exports follow the same suppression rules.
  - Operational exports contain reference and status only.
  - Personal exports (adding name and email) are Super Admin only.
  - Every export writes an immutable `msrc_staff.reporting_audit` row holding counts and filters only; no exported data.
- **Unified audit timeline (ADM-04).** Super Admin, read-only, paged at 100, filterable by module/actor/action/date. It reads the existing module audit tables and adds no identity enrichment.
- **Logging (ADM-05).** The new handlers log nothing. No request bodies, query text or export rows are written to logs.

## Evidence
- `tsc --noEmit`: PASS
- `eslint` (changed areas): PASS
- `vitest` `organizer-csv` + `organizer-dashboards`: 56 tests PASS
- Every audit-table column the timeline reads was checked against the live database schema (read-only query, 25 Oct): all match.
- pgTAP, `db lint` and staff e2e: run in CI.

The migration `20261025110000_organizer_dashboards.sql` needs owner OK before it is applied to the live database.
