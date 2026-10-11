# Approved design publication

The requester approved the reviewed EN/AR demo and explicitly asked to bring it
into the live version on 11 October 2026. This approval covers the demonstrated
public design, selected event photographs and city derivative. It does not open
registration, accounts, payments, submissions, bookings or other operations.

## Runtime audit

- The historical `(preview)` route-group name does not restrict public pages.
  Its layout validates the locale only. The homepage and public information pages
  render the approved components in genuine Production without preview flags.
- The opening film already uses approved `/media/msrc2026/` derivatives. Selected
  photographs, artwork and cropped Jeddah footage live under `/media/msrc-demo/`.
  Keep these stable URLs; the directory name is not a runtime permission gate.
- No widening of `preview.server.ts`, `media-policy.ts`, private media API,
  authentication, authorization, content publication or workflow gates is needed.
  Do not enable preview flags in Production as a means of publishing this design.
- `/design-system`, localized component workshops, `/hero-preview` and unpublished
  montage delivery remain denied on Production even if preview flags are set.
  Private originals stay outside `public/`; only selected public derivatives ship.
- Approved public metadata retains canonical EN/AR links and Production-only
  indexing. Public navigation uses Program and Our Team; the removed About route
  remains absent. Workshop/speaker/catalogue records still require publication
  approval; synthetic fixtures are not introduced into public data.

## Content boundaries retained

- The graphic **7 CME** remains visibly and accessibly illustrative. The pending
  accreditation language and structured event facts are unchanged.
- Anonymous speaker/team artwork does not establish an approved 2027 roster.
  Pending names, sessions, workshops, sponsors, prices and operational dates are
  not converted into confirmed information by this design approval.
- Historical figures preserve the scopes and organizer labels in ENG-026.
  Selected photos preserve the provenance recorded in `docs/media/`.
- Ticket and brochure actions stay unavailable while their approved destinations
  or assets are missing. Contact delivery, participant accounts and operational
  workflows retain their independent server-side release gates.

## Verification

`tests/unit/approved-design-publication.test.ts` renders the actual homepage in
both locales with Production environment and no preview flags, checks selected
public asset presence, checks the illustrative CME distinction, and directly
checks denied private review pages with preview flags enabled. Existing media,
catalogue, workflow, contact and account boundary suites remain authoritative for
their separate areas. Build, deployment and live-route receipts belong in the
release entry in `docs/PROGRESS.md`; this audit itself is not deployment evidence.

Observed local checks on 11 October 2026:

- **PASS:** `pnpm exec vitest run tests/unit/approved-design-publication.test.ts
  tests/unit/media-preview.test.ts tests/unit/media-policy.test.ts
  tests/unit/design-contracts.test.ts tests/unit/public-catalogue.test.ts`:
  80 tests across five files, exit 0.
- **PASS:** targeted ESLint for the new test and two comment-only component/content
  edits, with `--max-warnings=0`, no findings.
- Build, hosted configuration, deployment and live HTTP checks are outside this
  focused route audit; no live result is inferred from these local checks.
