# Account next steps and Attend step tracker — 27 October 2026

Branch `claude/account-next-steps`. Decision ENG-084.

## Changes
- The verify screen asks only for the code when the person arrives from sign-up, then signs in automatically and opens My MSRC.
- My MSRC "Your next steps" cards for attend, abstract, workshops and hackathon/3MT, following each area's real availability.
- On the Attend page, the hero "Sign up for MSRC" button jumps to Simple steps.
- Simple steps is now a clickable progress tracker that highlights the visitor's current step, in English and Arabic (RTL) and on mobile.

## Checks
- `pnpm exec tsc --noEmit`, eslint on changed files: clean.
- `pnpm exec vitest run`: 126 files, 5259 tests passed.
- `pnpm build`: OK.
- Playwright screenshots of the tracker (EN/AR, desktop/mobile, step 1 and step 2 states) and the hero were reviewed.
- Playwright: participant config 196 passed (desktop, tablet, mobile); `participation-flow` and `participant-journey` public specs 30 passed.

## Not changed
- No migration.
- Registration stays closed.
- The header "Reserve your seat" button is unchanged.
