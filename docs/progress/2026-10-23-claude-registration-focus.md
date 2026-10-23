# 2026-10-23 · Registration form keeps keyboard focus on the result

Carried on `claude/night3-3` (PR #116) so the stacked PRs and main get it together. The same failure also occurred on main (CI run 39880106427).

## Problem
`tests/registration-e2e/registration-journey.spec.ts:61`: after an invalid identity number, the error summary must have focus. It intermittently had none ("inactive") on desktop and mobile projects, en and ar. Locally it reproduced once in 60 runs. In CI, 15 repeats per project failed 3 times in 90.

## Evidence
A temporary CI branch logged focus events. In every failure the submit button lost focus as it disabled itself, and the summary never received `focusin`.

## Cause
`.participant-account-feedback:empty { display: none; }` hides the empty summary. `submit()` focused it from `requestAnimationFrame`. On a slow runner that frame could run before React committed the error message, so it focused a `display:none` element and the browser silently dropped the call.

## Fix
`src/features/registration/registration-form.tsx`: the `finally` block bumps a counter, and a `useLayoutEffect` focuses the summary after the commit, when the message is in the DOM. A first attempt (focusing the summary at submit time) targeted the same hidden element and was removed. The test assertion is unchanged.

## Checks
- CI, 15 repeats on all three registration projects: 90 passed (before: 3 failed in 90).
- Local full registration browser suite: 336 passed.

## Also in this change
`tests/staff-e2e/media-library.spec.ts`: the upload tests set a file right after navigation, while the picker is still disabled until the library loads. They now wait for the picker to be enabled, as a user must. 96 passed locally (3 repeats, both staff projects).
