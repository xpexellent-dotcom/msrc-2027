# Participant accounts CI headroom

29 October 2026. Branch `claude/participant-ci-headroom` from `main` at `36106e1`.
The working tree was clean before this task.

## Problem

The `browser` job ("Closed routes and synthetic EN/AR accounts browser checks") in
`.github/workflows/participant-accounts.yml` had `timeout-minutes: 25` and routinely
took 23–25 minutes. On PR #147 it was cancelled at the limit while it was partway
through `playwright.competitions.config.ts`, although every test up to that point
had passed.

Step timings from the last successful `main` run (40906350447):

| Step | Duration |
| --- | --- |
| install + build + browser setup | ~1 min 20 s |
| closed routes spec | 21 s |
| `playwright.participant.config.ts` | ~19 min 04 s |
| `playwright.profile.config.ts` | 35 s |
| `playwright.staff-profile.config.ts` | 8 s |
| `playwright.abstracts.config.ts` | 66 s |
| `playwright.competitions.config.ts` | 41 s |

The flag-on accounts config takes most of the time. Moving only the competitions
config would have saved about 40 seconds.

## Change

- `browser` keeps its job id and name and runs the closed routes spec and
  `playwright.participant.config.ts`. Its timeout is now 35 minutes, about 14
  minutes more than the observed ~21 minutes.
- The new `browser-features` job ("Profile, abstract and competition browser
  checks") repeats the same install, build and browser setup steps. It then runs
  the profile, staff-profile, abstracts and competitions configs. Its timeout is
  20 minutes for about 4–5 minutes of observed work. It uploads its evidence as
  `participant-feature-browser-results`, so that name does not clash with
  `participant-browser-results`.
- No commands, test files, Playwright configs, retries or workers changed. Each
  config starts its own web servers with `reuseExistingServer: false`, and none
  depends on output from another step. Both jobs run in parallel, so the
  workflow's overall run time drops.
- The `native` job is unchanged. `main` has no branch protection or ruleset with
  required status checks, so adding a job name breaks no required check.

## Checks

- `npx @action-validator/cli@0.6.0 .github/workflows/participant-accounts.yml`
  exited 0.
- CI timing of the split jobs: NOT TESTED locally. The PR's own workflow run
  provides that evidence.

`docs/PROGRESS.md` and `docs/DECISIONS.md` were not edited. No product decision is
involved.
