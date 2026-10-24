# Research judging, presentation allocation and awards — 25 October 2026 (ENG-078)

Spec §7 REV-06/07/10 and the related award requirements. Started by Codex (gpt-6.1-sol, ultra), which stopped at its usage limit; Claude reviewed and finished it.

## What it does
- **Oral/poster allocation (REV-06/07).** After final acceptance, the scientific administrator allocates each accepted abstract to oral or poster. Preparing an allocation and publishing it are separate events; the participant sees their format in My MSRC only after publication. Allocations are append-only.
- **Event judging (REV-10).**
  - The judging committee assigns accepted work to faculty judges and categories, checking conflicts against: declared conflicts, the existing abstract conflict rule, and having been a pre-event reviewer of that abstract.
  - Judges score independently on English-only screens. The judge packet contains only the snapshot title and body. It never includes reviewer cards, scores, assignments or author details.
  - Scorecards are versioned and close at the configured lock time.
- **Awards.**
  - Award categories, rubric, judge count, tie rule, lock time and supervisor deadline/evidence are all owner settings with **no defaults**. Judging stays closed until they are set. The owner will send the research scorecard; the hackathon rubrics are not reused.
  - The committee prepares an outcome from completed judge scorecards, with a recorded tie resolution. A corrected outcome is appended, never rewritten.
  - **Supervisor (AGENTS/ABS-08):** a supervisor is required only once a winner is selected. The winner enters supervisor name, affiliation and email and confirms. The details are private: shown only to Super Admins and scientific administrators, never to judges or the ordinary committee view.
  - The administrator then confirms with a validation reason, and publishes as a separate step.
- **Final material.** No new upload path. The existing closed abstract stage-two gate is unchanged.

## Evidence
- `tsc`: PASS
- `eslint` (repo): PASS
- `vitest`: 119 files, 5,118 tests PASS
- `pnpm build`: PASS
- Research-judging Playwright suite (EN/AR, desktop/mobile): **46 passed**
- Every abstract table and helper the migration depends on was checked against the existing migrations.
- pgTAP and `db lint`: run in CI.

The migration `20261025100000_research_judging_awards.sql` needs owner OK before it is applied to the live database.
