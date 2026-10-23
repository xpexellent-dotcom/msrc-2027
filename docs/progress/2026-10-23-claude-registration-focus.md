# 2026-10-23 · Registration form keeps keyboard focus on the result

Carried on `claude/night3-3` (PR #116) so the stacked PRs and main get it together. The same failure also occurred on main (CI run 39880106427).

## Problem
`tests/registration-e2e/registration-journey.spec.ts:61`: after an invalid identity number, the error summary must have focus. It intermittently had none ("inactive") on desktop and mobile projects, en and ar. Locally it reproduced once in 60 runs.

## Cause
The focused submit button disables itself while sending (`loading` → `disabled`). Browsers later move focus away from a disabled focused element. When that blur ran after the form's `requestAnimationFrame` focus of the summary, keyboard and screen-reader users were left on `<body>`.

## Fix
`src/features/registration/registration-form.tsx`: focus the live summary before setting `pending`, so a disabled control never holds focus. The summary is a `status`/`alert` region, so the sending and result messages are still announced. The existing focus after the result is unchanged, and so is the assertion.

## Checks
- The focus test with `--repeat-each=30` on all three registration projects: 180 passed (before: 1 failure in 60).
- The full registration browser suite: 336 passed.
