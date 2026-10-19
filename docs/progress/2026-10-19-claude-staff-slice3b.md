# 2026-10-19 — Staff console slice 3b UI and integration (claude/staff-slice3b)

Combined with Codex's backend (`codex/registration-slice3b`, ENG-050, gpt-6-astra ultra).

## UI (Claude)
- Registration queue: "Offer a seat" (single and bulk, waitlisted only), offer end date on offered rows,
  "Offered" and "Offers expired" in the seat bar, an "Offered a seat" filter.
- Request details panel: facts plus decision history (EN "→" / AR "←"); automatic expiries show "Automatic".
- Super Admin "Download CSV": fetched first; on success it downloads the server filename, on refusal it shows the
  state message. Hidden for other roles (the server also refuses).
- Dashboard home: "Offers waiting for a reply" card when offers exist.
- EN/AR copy, including the 409 `offer-window-not-set` message.

## Review changes to the backend
- Offer expiry audit rows use a NULL performer (pgTAP asserts it).

## Checks (Node 24.21.0)
- ESLint 0 warnings, typecheck, unit 2,977 / 2,977, `git diff --check`.
- Fresh build, then the staff browser suite: 80 passed / 6 skipped / 0 failed. The new cases cover offers, details
  history, the offer-window message, the export download, a refused export, and the Super Admin-only export (EN/AR, desktop/mobile).
- pgTAP, database lint and the concurrency tests: BLOCKED locally (no Docker); they run in CI.

## Owner
- New pending migration: `20261019120000_staff_registration_offers_export` (after `20261017120000`).
- An organizer decision is needed before offers can be used: how long an offer stays open, and confirmation that an
  expired offer is not passed to the next person automatically.
