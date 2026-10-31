# abs5 — Arabic approval, Terms v1.1 and review-mode removal

31 October 2026. Worktree `C:/m/codex-abs5`; existing branch
`claude/abstract-content-terms`; starting HEAD
`a16ab0915ef8cada26cceb7b3b020508550f0c51`. The starting worktree was clean.
Authority: owner abs5 instructions, ORG-069 and ENG-089 only. No migration.
Requirements ABS-01–04/07/08/12/13/15, REV-01/06–09, AI-01–06,
PRV-01–06, REG-01/02/05, LOC-01–03, TIM-01/02 and ACC-01.

## Result and approval boundary

- ORG-069 approves the existing ORG-068/ENG-088 Arabic, acknowledgement,
  journey/evaluation/rules and ethics/registration helpers. Removed draft markers,
  label and its CSS; the Arabic wording is unchanged. Taxonomy labels are included.
- Terms v1.1 EN/AR is **drafted for owner review and approval by merging this PR**.
  Only the research paragraph and version line change. All other clauses remain
  byte-for-byte the v1.0 text. Sources: `docs/policies/terms-v1.1.{en,ar}.md`;
  the embedded snapshots follow the incumbent Privacy version pattern.
- Unversioned `/en/terms` and `/ar/terms` render v1.1. Original v1.0 stays at
  `/{locale}/terms/v1.0`; new snapshot at `/{locale}/terms/v1.1`. Bare
  `/{locale}/terms/1.0` and `/1.1` redirect permanently to these snapshots.
  Locale-free current/version URLs use the existing language-preference redirects.
- Preserved the Privacy v1.1/v1.2 pattern: source wording remains effective from
  publication; the shared displayed effective date remains **6 October 2026**
  (`2026-10-06`), exactly as ORG-066 preserved it. No new publication date is
  inferred. Existing v1.0 registrations/acceptances are not rewritten, and no
  forced re-acceptance mechanism is introduced. Existing registration checks use
  current Terms v1.1 and close on an old configured version. A unit test verifies
  existing requests are returned without an acceptance mutation.
- Sign-up has an age declaration and versioned Privacy notice, not a separate
  Terms acceptance field. Added a read link to Terms v1.1; retained Privacy v1.2
  and the existing sign-up payload/records. No new consent record is invented.
- Sitemap already lists unversioned current Terms, Privacy and abstracts routes;
  it needed no production-code change. Added assertions for that behavior and
  exclusion of dated/private routes. Archive metadata remains noindex/canonical.
- Deleted `review-mode.server.ts`, its unit tests, query/CTA plumbing,
  `reviewAllowed`, synthetic workspace save/finalize logic, banner and CSS,
  separate review projects/server and port 3217. Ordinary signed-in submission
  uses the real handler/API flow. Submission rules still render above the form.
  Dialog coverage now shares the existing encrypted synthetic signed-in fixture
  on the incumbent 3216/3218 servers; no runtime bypass remains.
- AGENTS.md changes only its Research bullet. ORG-069/ENG-089 were appended at
  the end of DECISIONS.md; no earlier entries were rewritten or renumbered.
  ORG-068's Terms conflict is resolved by v1.1 **pending merge**, recorded in the
  new decision. Active feature notes and superseded review instructions are updated.
- Internal PR 2 authority: seven gates, internal weights/formula, provisional
  pilot-dependent decision bands, no-default similarity threshold, DeepSeek and
  the human-confirmed supervisor email trigger are recorded. Exact extracted
  criterion anchors and verbatim email template are retained in
  [the internal authority note](../features/abstract-rubric-authority.md).
  No scoring behavior, public weight, AI activation or email sending is added.
  ORG-039/064 identity collection is already implemented by ENG-073; unchanged.

## Every changed Terms sentence for owner review

The following tables exhaust the research-paragraph changes. “Added” means there
was no corresponding sentence in v1.0. The paragraph label is unchanged in both
languages. No other Terms sentence changes, including Hackathon, payment,
certificates, privacy, AI, registration, liability and Arabic precedence.

### English

| Before (v1.0) | After (v1.1 draft) |
|---|---|
| The abstract body must be in English and must not exceed 300 words. | The abstract must be in English and must not exceed 350 words, including the six section headings: Background, Objectives, Methods, Results, Limitations and Conclusion. |
| Completed studies and work in progress are both eligible. | Only research completed within the past three years is eligible: the analysis must be finished and the manuscript written. |
| A principal investigator may have no more than two finalized applications in this edition. | Each participant may finalize only one research abstract submission per edition. |
| Added | A finalized submission cannot be edited, and withdrawal or rejection does not restore the submission chance. |
| Added | The presenter must be an undergraduate medical student or medical intern. |
| Added | A supervising physician is required at submission. |

### Arabic

| Before (v1.0) | After (v1.1 draft) |
|---|---|
| يجب أن يكون متن الملخص باللغة الإنجليزية، وألا يتجاوز ٣٠٠ كلمة. | يجب أن يكون الملخص باللغة الإنجليزية، وألا يتجاوز ٣٥٠ كلمة، بما فيها عناوين الأقسام الستة: الخلفية، والأهداف، والمنهجية، والنتائج، والقيود، والخلاصة. |
| وتُقبل الدراسات المكتملة والأعمال قيد التنفيذ على حد سواء. | لا تُقبل إلا الأبحاث المكتملة خلال السنوات الثلاث الماضية: يجب أن يكون التحليل قد انتهى وأن تكون المخطوطة قد كُتبت. |
| ولا يجوز للباحث الرئيسي أن يكون لديه أكثر من طلبَي مشاركة نهائيين في هذه الدورة. | يجوز لكل مشارك تقديم ملخص بحث واحد نهائيًا في كل دورة. |
| Added | لا يمكن تعديل الطلب بعد تقديمه نهائيًا، ولا يعيد سحبه أو رفضه فرصة التقديم. |
| Added | يجب أن يكون مقدّم العرض طالب طب في مرحلة البكالوريوس أو طبيب امتياز. |
| Added | يُشترط وجود طبيب مشرف عند التقديم. |

### Version line and effective wording

| Language | Before | After |
|---|---|---|
| EN | **Version 1.0** · Effective from the date they are published on www.msrc2027.com | **Version 1.1** · Effective from the date they are published on www.msrc2027.com |
| AR | **الإصدار ١.٠** · تسري من تاريخ نشرها على www.msrc2027.com | **الإصدار ١.١** · تسري من تاريخ نشرها على www.msrc2027.com |

## Verification

All local checks use Node 24.21.0 and pnpm 11.19.0. Evidence logs and Terms
screenshots are in `output/abs5/` (ignored, intentionally uncommitted).
All listed checks were run locally. The browser totals exclude intentional skips.

| Check | Observed result |
|---|---|
| `pnpm lint` | PASS; zero warnings |
| `pnpm typecheck` | PASS; generated route types and TypeScript |
| `pnpm test` | PASS; 5,497 tests in 134 files |
| `pnpm build` | PASS; production build, 142 generated pages |
| Abstracts Playwright | PASS; 86 passed, two intentional skips, exit 0 |
| Public policy/participation/closed-account/CSP Playwright | PASS; 74 passed, four intentional skips, exit 0 |
| Sign-up declaration/notice/link Playwright | PASS; eight passed across four device projects, exit 0 |
| Registration Terms acceptance Playwright | PASS; 30 passed across three device projects, exit 0 |
| EN/AR policy content and clause-only tests | PASS within full unit suite |
| `git diff --check` | PASS |

The browser commands are:

```text
pnpm exec playwright test --config playwright.abstracts.config.ts
pnpm exec playwright test --config playwright.config.ts tests/e2e/policies.spec.ts tests/e2e/participation-flow.spec.ts tests/e2e/participant-closed.spec.ts tests/e2e/private-csp.spec.ts
pnpm exec playwright test --config playwright.participant.config.ts tests/participant-e2e/participant-accounts.spec.ts --grep sign-up.has
pnpm exec playwright test --config playwright.registration.config.ts tests/registration-e2e/registration-request.spec.ts
```

Initial failed receipts are retained as `abstracts-playwright-initial.log` and
`public-playwright-initial.log`. One migrated dialog test clicked the closing
CTA before account hydration and followed the signed-out link (85 passed,
two skipped, one failed). It now waits for the signed-in destination and visible
dialog before enumerating checkboxes. Public tests exposed the omitted locale-free
Terms v1.1 redirect in next.config.ts (71 passed, four skipped, three failed
instances of the same redirect case); added it without changing assertions.
No retries or timeout increases. An initial typecheck caught a stale unit-test
reviewAllowed prop; an initial lint caught an unused extracted fixture import;
both were removed before the final check runs. An added acceptance test initially
put a historical Terms field into the deliberately strict public request summary;
that invalid fixture correctly failed closed. The fixture now follows the actual
summary contract and asserts that observing an existing request performs no
submission or acceptance mutation. Its failed receipt is retained in
`unit-fixture-failure.log`; the final full unit suite passes.

The final public suite exercises aliases and unknown versions. Bare-version
aliases are implemented in next.config.ts, keeping the version page on the
incumbent snapshot-only pattern. Next logs `NoFallbackError` for deliberately
unsupported static version/locale URLs even though they return the expected 404.
Direct probes in `route-probe.json` confirm the same behavior on the unchanged
Privacy version route; all valid Terms archives and bare aliases return 200/308
with zero such messages. These diagnostic messages are not 5xx responses or
errors on the valid document pages. The intermediate alias-route run is retained
in `public-playwright-alias-route.log`.

Windows Playwright's child server teardown hung after all test cases emitted.
Only exact WebServer PIDs from these runs were stopped, after verifying their
listening ports and emitted cases. The local ignored runner helper logs this
cleanup and preserves Playwright's actual exit code; no other job's server was
stopped, and checked-in configs retain fixed ports/retries. This is runner
cleanup after results, not a test retry or increased assertion timeout.

## Screenshots and visual review

`output/abs5/{en,ar}-terms-current-{chromium-desktop,chromium-tablet,chromium-mobile}.png`
and the v1.1 snapshot captures cover current/versioned Terms. Desktop/mobile
entrance captures are included: 16 Terms PNGs total. Both desktop full-page and
mobile entrance captures were visually inspected: v1.1 label, all eight sections,
research paragraph, readable layout, Arabic RTL and footer. Browser checks also
exercise 320px and enlarged text, with no horizontal overflow or axe violations.

## Remaining gates and next task

Owner review/merge approves Terms v1.1. Any announcement/email required by the
unchanged policy change clauses remains an owner release action, not performed
here. Hosted registration Terms-version reconciliation, deployments, existing
account/abstract/privacy/evidence gates, production and real inbox/device UAT
remain separate. Hosted checks and CI are **NOT TESTED**; CI remains authoritative.
Local Docker/database execution is **BLOCKED** by the environment; this task
changes no migration or database function and makes no new database test claim.

No hosted migration/settings seed, feature-flag switch, participant opening,
real submission/email, commit, push, branch or merge was performed.
`docs/PROGRESS.md` is unchanged. Leave this diff uncommitted for Claude.
Next: owner reviews the exact sentence table and merges after CI; PR 2 can cite
ORG-069 for its separately scoped screening/scoring/supervisor work.

## Claude review note (31 October 2026)

Read-only hosted check: `msrc_registration.settings` for `msrc-2027` has
`enabled=false` and `terms_version='1'`. The app now requires Terms `v1.1`, so
registration would stay closed until staff save `v1.1` in the registration
settings. That is part of the owner-controlled registration opening, not this PR.
