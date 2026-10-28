# ENG-087 / ORG-067 — Complete profile before submissions

28 October 2026. Worktree `C:\m\codex-profile`, existing branch
`claude/profile-complete`, starting HEAD `1f2d963`. Work remains uncommitted.
`docs/PROGRESS.md` is unchanged. No branch/commit/push, hosted SQL/settings,
feature activation, real key generation or participant communication was performed.

## Authority and implemented behavior

Owner decisions dated 27–28 October are appended as ORG-067 and ENG-087 in
`docs/DECISIONS.md`. Requirements AUTH-05/06/07/08, ABS-01/12, TRK-01,
HAC-01/03/10, TMT-01, PRV-02/03/04/05/06, SEC-01/02/06, LOC-01/03, ACC-01.
The owner pre-approved Privacy v1.2 (“Draft v1.2, I approve it”). Current explicit
instructions supersede optional-only ORG-066/ENG-086 and earlier no-DOB/profile-ID
exclusions. Contact phone is not authentication data; ORG-016 still prohibits phone
sign-in, SMS and verification. Registration's current storage remains unchanged.

- Ten baseline completion items: private picture, institution, status, full Arabic
  name, ISO alpha-2 nationality, gender, adult DOB, city, E.164 contact phone and
  saved identity document. Configured specialties add an eleventh required item;
  a missing/empty specialty list never blocks completion.
- Status choices are exactly Year 1–6, Internship, Clinical placement, Postgraduate,
  Residency, Faculty. Legacy medical-student years/intern/resident/faculty map;
  old other maps to null. Existing institution text becomes `institution_other`.
- Partial saves, removal, private avatars, metadata stripping, version conflicts,
  exact-session authority, existing durable deletion and server flags remain.
  UI provides EN/AR copy, RTL Arabic name, LTR contact/ID inputs, +966 default,
  masked saved ID and an ARIA 1.2 bilingual university combobox. New sensitive
  editor values are excluded from browser persistent and cross-language drafts.
- Abstract finalize and both competition submit paths check stored completeness
  under transaction locks, returning `profile_incomplete`. Handlers check the
  server-only completion RPC too. Submit controls become profile-completion links
  to `/{locale}/my-msrc#profile`. Drafts remain available. Conference registration
  and workshop booking receive no new gate.
- Missing new RPC/old profile projection gives `area-not-ready` without signing
  out. The identity save fails closed without its private key configuration.

## Database and identity

One migration only: `20261028120000_participant_profile_complete.sql`.
New columns remain on existing forced-RLS `msrc_participant.profile_details`;
no direct client grants/policies, table or FK is added. Existing RLS table counts
in participant account/age-retention tests remain 20. The reviewed account-erasure
cascade inventory and bounded profile retention delete the whole row, including
ciphertext, HMAC, last four and new contact/demographic values. New pgTAP assertions
exercise the inventory, actual account erasure, retention, private projections and
all three actual submission RPCs. Private image bytes retain the durable queue.

New profile identity uses AES-256-GCM with random IV, versioned server keyring and
owner/edition/type associated data. The separate HMAC supports edition/type/number
lookup and uniqueness. Numbers are validated (National ID 1+9 digits, Iqama 2+9,
passport 6–20 alphanumerics) before encryption. Plaintext never enters a profile RPC.
Participant and existing audited authorized staff detail receive only type/last4.
The private envelope/HMAC are not projected or directly readable by application
roles. The active cipher key and HMAC secret must differ. `.env.example` documents
names only: `REGISTRATION_IDENTITY_ENCRYPTION_KEYS`,
`REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION`, `REGISTRATION_IDENTITY_HMAC_SECRET`.

Independent review caught inconsistent config/profile lock order between simultaneous
abstract and 3MT submissions. The shared gate now takes the abstract settings lock
before the profile advisory/row locks, matching abstract finalization's existing
order. A deterministic two-connection CI regression exercises both submission paths.
Additional concurrency coverage checks removal while finalization waits and identity
HMAC uniqueness, retaining earlier CAS/avatar/session/isolation/retention proofs.

## Institution and country source evidence

Accessed **2026-10-28**. The Ministry directory pages and their linked data sources
were searched/retrieved; the catalog header cites them. Catalog: **58 institutions**
(29 public universities, 15 private universities and 14 private medical/health
colleges). Ministry names are retained, and city is the listed main location.
This selection aid does not assert accreditation or eligibility of every campus.
Some Ministry pages have older update labels; Other remains available for omissions.

- [Ministry university directory](https://www.moe.gov.sa/ar/education/highereducation/Pages/UniversitiesList.aspx)
- [Public universities, Arabic](https://www.moe.gov.sa/ar/education/highereducation/DataSources/GovernmentUniversities.aspx)
  and [English](https://www.moe.gov.sa/en/education/highereducation/DataSources/GovernmentUniversities.aspx)
- [Private universities, Arabic](https://www.moe.gov.sa/ar/education/highereducation/DataSources/PrivateUniversities.aspx)
  and [English](https://www.moe.gov.sa/en/education/highereducation/DataSources/PrivateUniversities.aspx)
- [Private colleges, Arabic](https://www.moe.gov.sa/ar/education/highereducation/DataSources/PrivateColleges.aspx)
- Ministry medical/health discipline and Buraidah location confirmations:
  [table 9-2](https://www.moe.gov.sa/ar/knowledgecenter/dataandstats/edustatdata/DocLib/table9-2.html),
  [table 9-03](https://www.moe.gov.sa/ar/knowledgecenter/dataandstats/edustatdata/DocLib/Table9-03_36-37.html)
- [Riyadh Elm location](https://studyinsaudi.moe.gov.sa/ShortPrograms/Details/112)
  and [Northern Border / Arar](https://www.moe.gov.sa/ar/mediacenter/MOEnews/Pages/north-border-un.aspx).
  The Arabic Ministry location takes precedence for Imam Abdulrahman bin Faisal
  University (Dammam), where the English list contradicts it.
- [ISO country code source](https://www.iso.org/obp/ui/#search/code/): 249 assigned
  alpha-2 codes; EN/AR display names use runtime CLDR via `Intl.DisplayNames`.

Excluded pending medical/health-degree evidence in the consulted Ministry sources:
Gulf Colleges, Al Asala, Onaizah, Ibn Rushd administrative, Al-Baha private sciences,
Arab East, Prince Sultan Business, AlFayha and Jeddah International. Al-Nahda
pharmacy/medical was absent from the current consulted directory and requires
follow-up. Former Sulaiman Al Rajhi Colleges duplicates the current university;
former Al-Farabi is not separately listed alongside current Vision colleges.
No university was invented; Arabic names came from the Ministry itself.

## Privacy and required hosted coordination

Privacy Policy v1.2 EN/AR changes only profile data, submission prerequisites and
purposes, contact-only phone, masked/encrypted profile identity and deletion no
later than one year after the conference. v1.0/v1.1 archives remain; Terms remains
v1.0. `currentPolicyVersion` and participant notice are v1.2; redirects follow the
existing v1.1 convention. No announcement or account email was sent.

**Hosted `msrc_participant.policy.privacy_version` must switch to `v1.2` together
with hosted migration `20261028120000`.** Deploying mismatched code/policy causes
the existing readiness check to close sign-up. This work changes neither hosted
policy nor migration state. Existing production profile activation was supplied
as task context, not independently inspected or modified here.

## Verification

Runtime observed: Node v24.21.0, pnpm 11.19.0. Synthetic data only.

| Status | Command / evidence | Observed result |
| --- | --- | --- |
| PASS | `pnpm lint` | ESLint, zero warnings. |
| PASS | `pnpm exec tsc --noEmit` | TypeScript clean. |
| PASS | `pnpm test` | 133 files, 5,392 unit tests. Includes identity formats/encryption boundary, age/leap/year-zero, E.164 short/max lengths, completeness/specialties, university EN/AR normalization, authorization/failure/conflict. |
| PASS | `pnpm build` | Next.js 16.3.8 production build, 138 generated pages. |
| PASS | `pnpm exec playwright test --config playwright.profile.config.ts` | 28 passed, exit 0; EN/AR desktop/360px, keyboard/axe/200% text, profile save/removal/conflict and gated abstract submission. |
| PASS | `pnpm exec playwright test --config playwright.staff-profile.config.ts` | 4 passed, exit 0; EN/AR desktop/320px, keyboard/axe/200% text, authorized private detail/avatar and masked ID display. |
| PASS | `pnpm exec playwright test --config playwright.participant.config.ts` | 212 passed, 4 intentional desktop/tablet skips, exit 0; EN/AR across four viewports, including 360px and enlarged text. First attempt hit occupied port 3216; after several minutes and cleanup of this run's profile helpers, the single required retry completed successfully. |
| PASS | `git diff --check` | No whitespace errors after removing an extra EOF blank line. |
| PASS (supplementary only) | `node C:/m/pglite/test.mjs C:/m/codex-profile participant_profile.test.sql participant_profile_complete.test.sql participant_accounts.test.sql abstract_review.test.sql hackathon_3mt.test.sql` | PGlite with Supabase stubs replays all migrations and passes 484 assertions (76+72+75+110+151). This is not native Supabase/CI evidence. |
| PASS (supplementary only) | `node .tools/profile-migration-check.mjs` | Ten legacy status mappings and institution text preservation; no policy setting changed. |
| BLOCKED | Native Supabase migration reset, strict SQL lint, pgTAP and integration/concurrency | No local Supabase/Docker stack; integration guard limits fixtures to disposable Linux GitHub CI. `pnpm exec supabase status` also stopped at sandbox-denied CLI telemetry write outside the workspace. No authority bypass or hosted fallback attempted. |
| BLOCKED | `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/participant-profile-concurrency.test.ts` | Config rejects execution: “Local fixture tests require a running local Supabase stack and its loopback settings.” No database test is represented as native PASS. |
| BLOCKED (supplementary only) | PGlite `participant_age_retention` suite | Stub harness lacks privileged `msrc_ci_storage` fixture; existing native suite remains a CI requirement. |
| NOT TESTED | Hosted migration/settings, actual Storage cleanup/worker, backup/restore suppression, live submissions, physical devices/screen readers and human UAT | No hosted changes or real communications authorized. |

Editor screenshots: `.tools/profile-review/{en,ar}-profile-{desktop,mobile}-editor.png`.
Representative English desktop and Arabic mobile enlarged-text captures were
visually inspected. Screenshots/fixtures contain synthetic identities only.

Windows process cleanup: installed Playwright tries `taskkill /T /F` at teardown;
process-tree enumeration is denied by this sandbox. After all test cases finished,
only the exact logged, verified helper PIDs started by each successful profile,
staff profile and participant run were stopped with `Stop-Process`. All three
runners then reported PASS and exit 0.
No unrelated process was terminated; suite retries and timeouts were not increased.

## Remaining release gates and next task

1. Claude reviews/commits the uncommitted work and obtains authoritative CI reset,
   strict SQL lint, pgTAP and real two-connection concurrency results. The profile
   integration suite has nine cases, including cross-submission deadlock prevention.
2. Owner coordinates migration and hosted privacy version v1.2, validates private
   key custody/configuration and deletion worker/storage/restore evidence, then
   performs EN/AR human UAT under the independent workflow release gates.
3. No workflow, feature flag or communications open through this receipt.
