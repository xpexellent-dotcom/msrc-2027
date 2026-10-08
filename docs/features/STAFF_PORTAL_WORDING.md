# Staff portal wording

8 October 2026. BL-AUTH-01, BL-RPT-01/03; LOC-01/03, ACC-01.

Status: **local implementation and review PASS; copy NOT YET RELEASED to
Production**. This presentation change starts from merged main
`2f677bedd9e1773508286cc5d8db79780801cc37` on `codex/staff-portal-copy`.
The branch subsequently reconciles merged main
`fbddf28ea68cea2370cf4704a6b8029566cb007c`; the public QA changes left staff
source and permissions untouched, and both shared progress records are preserved.

## What staff see

Authenticated headers show the person's actual localized roles under **Your
roles** / **أدوارك**, followed by one short sentence describing their current
tools. The sentence uses built entries returned by the existing `staffMenu`;
it does not introduce a separate role-to-permission map. Multiple roles combine
their tools without repeating an action. Anonymous, verification-pending and
empty-role views show neither the role list nor this guidance.

| Current role projection | Built tools described |
|---|---|
| Super Admin | Manage staff access, view audit records and view participant accounts. Changing their own password is included only when the existing availability projection permits that tool. |
| Registration/workshop administrator | View participant accounts. The unbuilt registration/workshop area is omitted from the action sentence. |
| Abstract, hackathon or 3MT reviewer; scientific administrator; judging committee; faculty judge; finance; check-in; content/media; sponsorship/PR | No built tool currently applies: “Your tools are coming soon.” / “ستتوفر أدواتك قريبًا.” The menu still shows only that role's permitted future areas. |
| Combined roles | Union of the existing built menu entries; no repeated tools or added permissions. |

The localized built-tool phrases are:

| Tool | English | Arabic |
|---|---|---|
| Own account security, when available | Change your password | تغيير كلمة مرورك |
| People and roles | Manage staff access | إدارة وصول أعضاء الفريق |
| Audit log | View audit records | عرض سجل التدقيق |
| Participant list | View participant accounts | عرض حسابات المشاركين |

Invitation wording is **“Invitation links expire after 72 hours and can be used
once.”** / **“تنتهي صلاحية روابط الدعوة بعد ٧٢ ساعة، ويمكن استخدام كل رابط مرة
واحدة.”** It describes the link naturally without changing the English-only
transactional email policy.

The visible timezone, idle/absolute session, peer-recovery and minimum-two/self-
protection explanation blocks and their unused EN/AR copy keys are removed.
Timestamp formatting, session expiry, recovery holds, authenticator assurance,
minimum-two and self-protection enforcement remain unchanged. Reviewer and
faculty-judge assessment menu behavior remains English/LTR. No shared CSS,
permission contract, menu rule, API, database policy, flag or operational setting
is changed. See the [staff foundation](STAFF_PORTAL.md) and
[own password-change guide](STAFF_PASSWORD_CHANGE.md) for their separate controls.

## Observed local verification

Commands ran with locked Node `24.21.0` and pnpm `11.19.0`, after
`./scripts/use-local-node.ps1`. These are local, synthetic checks.

| Command | Observed result |
|---|---|
| `npx --yes pnpm@11.19.0 exec vitest run tests/unit/staff-action-summary.test.ts tests/unit/staff-portal-menu.test.ts` | PASS: 61 tests in two files; every contract role, additive roles, built/future areas, own-security availability and empty roles. |
| `npx --yes pnpm@11.19.0 build` | PASS: TypeScript and optimized build, 79 generated pages. |
| `npx --yes pnpm@11.19.0 exec playwright test --config playwright.staff.config.ts tests/staff-e2e/staff-copy.spec.ts` | PASS: six active cases; two intentional desktop skips because enlarged narrow layouts run in the mobile project. Retries remain zero. |
| `npx --yes pnpm@11.19.0 exec eslint src/features/staff-portal/copy.ts src/features/staff-portal/staff-portal.tsx tests/unit/staff-action-summary.test.ts tests/staff-e2e/staff-copy.spec.ts` | PASS: no lint findings. |
| `git diff --check` | PASS: no whitespace errors. |

The browser cases verify EN/AR text and language/direction, role-scoped guidance,
security-link availability, disappearance before verification and after logout,
and no guidance for empty roles. Both 320px/200% text cases pass document-width
bounds, native down/up scrolling to the actual heading, keyboard Home → Tab →
Sign out, and axe WCAG 2 A/AA, 2.1 AA and 2.2 AA checks. Independent source review
and EN/AR role-guidance screenshot review PASS.

The new mobile test initially sampled scrolling before keyboard animation
completed and assumed the enlarged heading appeared at document position zero.
Retained failure traces explain these test-owned assumptions. The corrected
checks use the heading's measured document position and assert movement down,
return up and heading visibility; keyboard focus checks and axe rules remain.
No retries, longer timeouts, weaker accessibility rules or product CSS changes
were added. Six synthetic screenshots and the initial traces are retained only
in an ignored local evidence directory, outside source control.

## Release and evidence limits

These checks do not certify live axe, native Arabic-reader approval, provider
behavior or operational UAT. The local commands above were scoped; broader
exact-head staff/native CI results are recorded in PR checks. Merge and deployment
of this copy remain pending.

The separate operator record in [draft PR #45](https://github.com/xpexellent-dotcom/msrc-2027/pull/45)
holds the personal password-change evidence. Its captured 8 October
`12:01:51.918 UTC` native result was independently reviewed by the operator and
database reviewer: committed owner change, retained verified factor, old-session
revocation and fresh password/TOTP session confirmed. The earlier frozen verifier
STOP at `11:41:54.513 UTC` remains preserved. Both password-change gates are now
false; existing staff sign-in remains available for the restricted single owner.
Pairing remains false, and participant/other operational workflows remain closed.
This copy task performs no hosted action or additional password verification.
