# ORG-006 — Public website refinements and authorized publication

1 October 2026. Actor: anonymous public visitor. Implementation owners: frontend and
bilingual content editors. Source IDs: SCP-01/02/03/05, DSN-01/02, ACC-01,
LOC-01/02/03, CMS-01/04, MED-01 to MED-04, PRG-01, TIM-01, CFG-01/12,
REG-02/03, ABS-04/07/08/09, HAC-01/02/04, WKS-01/02, REL-01.
Decision: [ORG-006](../DECISIONS.md#org-006--public-refinements-and-authorized-publication-1-october-2026).

## Authority and supersession

The latest explicit organizer request authorizes the visual refinements and publication
of the completed changes. It supersedes ORG-005's permanently visible hero Pause/Play
treatment and its retained display-font choice for this public presentation. The supplied
project instructions and product specification remain the baseline for factual accuracy,
publication permissions, language support and closed operational workflows. The requester
decision authorizes this scoped presentation and release; it does not settle institutional
brand approval, legal approval, media rights for other files or operational release gates.

[ORG-005's original feature note](cinematic-public-experience.md) remains a dated record
of the public website implementation and its earlier verification. This note describes the
subsequent refinements; it does not rewrite or retroactively extend those earlier results.

## Result

- The normal homepage removes its permanent visible Pause button. Its semantic background
  interaction remains keyboard/tap operable, with translated accessible names, visible
  keyboard focus and durable paused-frame behavior. Reduced-motion/data-saving defaults,
  hidden-tab pause, browser-denied autoplay recovery and actual-media-failure posters stay.
  A temporary Play recovery action can still appear when needed.
- Watch reframes the existing approved homepage film into a nearly full-screen view. It
  reuses the same hero and media element, hides the reading/navigation layers while open,
  removes the text scrim and retains previous-edition identification. It does not create
  a gallery copy or a second player, request new footage or use a third-party embed.
- The film view uses an accessible modal context, a close action, Escape and contained Tab
  navigation. The `#film` URL state supports browser Back/Forward and direct links.
  Closing restores the previous scroll position and meaningful focus. A direct film link
  does not override reduced-motion/data-saving preferences without an explicit Play action.
- A compact numbered chapter index links to the conference, participation, programme,
  speakers, previous edition and practical information. Its current chapter is indicated
  visually and with `aria-current="location"`; a passive scroll listener updates that
  indication. Desktop keeps the index available below the floating header with matching
  anchor clearance. Mobile keeps it in the normal document flow. Scrolling stays native.
- Participation now has a warm ivory surface with white cards. Public heading hierarchy
  uses the existing supplied DM Sans at stronger 600/700 weights; Arabic retains Noto Sans
  Arabic with RTL spacing and typography. Purple, gold, ivory, lilac and ink remain the
  selected palette. No new font package or official logo is introduced.
- Homepage and public-page copy is shorter, with fewer repeated paragraphs and action rows.
  Working destinations, confirmed dates, programme announcement states, useful FAQ facts,
  separate journeys, the 3MT anchor and honest unavailable states remain. Scientific content
  stays English/LTR in Arabic interfaces. No invented roster, sessions or public claims are
  added to fill empty catalogues.

## Preserved boundaries

All 15 operational workflows remain closed. Registration and workshops still require
manual approval; submission, review, payment, booking, attendance and certificates have
their own backend milestones and release gates. Public pages remain informational:
no form pretends to submit and no frontend state confirms admission or payment.

The four ORG-002-approved MSRC 2026 desktop/mobile video and poster derivatives, their
cropping/encoding and rights scope are unchanged. Watch is another view of the same
homepage placement. Originals, source recipes and private media-review routes remain
restricted. Other gallery material, session recordings, official marks and portraits
still require their own approved source and publication/access decisions.

Confirmed dates remain 27–28 January 2027 in Jeddah. Venue, conference opening time,
session timetable, prices, capacities, application windows, deadlines, sponsors and
speaker confirmations are not inferred. The existing countdown retains its explicitly
labelled Riyadh start-of-date target; it opens no workflow.

No package/lockfile, database/schema/migration/grant/RLS, secret/environment, payment,
email, domain/DNS or hosted-resource configuration change is part of this refinement.
The server-only approved-catalogue boundary, safe detail-route lookup, addressable
filters and bilingual navigation from ORG-005 remain in place.

## Verification and published release

| Check | Observed result |
|---|---|
| `pnpm check` | PASS: lint with zero warnings, generated routes/types, 258/258 unit tests and optimized production build. Supplied by the root verification run for this refinement. |
| Public-page agent targeted responsive review | PASS: `node .tools/public-page-polish-check.mjs`, exit 0. Twenty-four English/Arabic route/viewport combinations; details below. |
| Targeted cinema/public-shell | PASS: `pnpm exec playwright test tests/e2e/cinematic-film.spec.ts tests/e2e/public-shell.spec.ts`,60 passed/1 duplicate skipped in1.3minutes. |
| Mobile chapter/film restoration repeat | PASS: `pnpm exec playwright test tests/e2e/cinematic-film.spec.ts --project=chromium-mobile --grep 'participation chapter' --repeat-each=3`,6/6 in15.3seconds. |
| Final complete browser regression suite | PASS on exact c1f7273 hosted CI:264 passed/3 duplicate matrix skips/0 failures of267 in6.3minutes. Earlier local262/2 and263/1 runs are retained below; their trace-backed test setup corrections retain exact return and locale/filter assertions. |
| Visual production-build review | PASS: `node .tools/cinematic-release-review.mjs`, six EN/AR desktop/tablet/mobile homepage/chapter/cinema journeys,200 responses, zero page errors/overflow, correct ivory/700-weight heading;18 screenshots with desktop/mobile inspection. |
| Hosted d878cd8 CI | PASS: Foundation36903651165,258 units,264 browsers/3 duplicates skipped,20 pgTAP,10 integrations; both jobs succeeded. A later test-only revision must have its own recorded checks. |
| Final-head CI | PASS: [Foundation36905277026](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36905277026), exact c1f7273, both jobs successful:258 units/264 browsers/3 duplicate skips/20 pgTAP/10 integrations, lint/types/build and database security checks. |
| Production deployment | PASS: [PR11](https://github.com/xpexellent-dotcom/msrc-2027/pull/11) merged at e70bf38abd5e6567c85f33b348f3224927c46745. `git diff --exit-code c1f7273 e70bf38` passed: the entire merge tree matches the checked head. GitHub Vercel Production6791979347 succeeded at18:23:37UTC. |
| Live visual review | PASS: `MSRC_REVIEW_URL=https://www.msrc2027.com node .tools/cinematic-release-review.mjs`, six EN/AR desktop1440/tablet791/mobile390 journeys;200 responses, ivory248/246/240,700-weight headings, zero page errors/overflow, chapter/focus/film/Escape checks.18 screenshots captured; desktop EN and mobile AR participation/cinema inspected. |
| Live publication boundaries | PASS: `node .tools/cinematic-live-boundaries.mjs`,24 public routes200,14 private/unpublished paths404, health/15 closed workflows503 with no-store, four320/412px EN/AR200% text layouts, two reduced-motion media/filter/explicit-film-play journeys. No mutation requests or page errors. |
| Database checks | PASS in isolated synthetic CI:20 pgTAP/10 integration checks. Hosted Supabase was not changed or retested; schema/permissions and operational gates are unchanged. |
| Physical devices, Safari/Firefox, human screen-reader and Arabic editorial review | NOT TESTED in this slice. |

The scoped public presentation is published at [English](https://www.msrc2027.com/en)
and [Arabic](https://www.msrc2027.com/ar). The successful exact-head checks and production
receipts above supersede the earlier pending handoff. Failed checks and their repairs
remain recorded below; the broader product/institutional release gates remain separate.

Actual-click chapter restoration repeat passed12/12 desktop/mobile cases. A subsequent
local full run263 passed/1 failed/3 skipped exposed an independent test timing gap:
matching search/day values did not establish that a language return had committed.
The regression now awaits the target programme URL and `html.lang` after both switches,
then retains the original query/filter and announcement assertions. Application source
is unchanged by either test setup correction. Both the actual-click restoration and
programme language/filter regressions passed12/12 desktop/mobile repeated cases locally;
the complete exact-head hosted suite then passed264/3/0 as recorded above.

Preview6791792610 succeeded at c1f7273, but its unauthenticated browser check reached
Vercel Login. Preview application UAT was BLOCKED by existing protection; that protection
was not bypassed or changed. The public production browser checks passed independently.
Live receipts/screenshots are in ignored `deliverables/cinematic-live/` and
`deliverables/cinematic-live-visual/`. Checks used fresh Chromium contexts, not physical
devices or a human accessibility/editorial audit. The subsequent release-receipt edit is
documentation-only and must preserve the tested application, tests, configuration and
approved media tree.

The public-page agent supplied this executed command sequence:

```powershell
. ./scripts/use-local-node.ps1
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.tools/playwright"
node .tools/public-page-polish-check.mjs
```

The targeted helper visited `/program`, `/media`, `/participate` and `/registration`
in English and Arabic at 320, 791 and 1440 pixels wide, with a 1000-pixel viewport height.
It checked visible headings at weight 700 and no horizontal overflow at normal and
200% root text size. Both languages passed active-only Clear filters, reset focus and
search/day/edition state, film-link destinations and one destination link per
participation path. The first helper assertion expected `/en/#film`; Next.js normalized
that address to `/en#film`. The assertion was corrected and the full targeted run then
exited 0. This was a helper expectation correction, not a product-path failure.

The helper is in ignored `.tools/public-page-polish-check.mjs`; its receipt was stdout,
with no screenshot or JSON receipt file saved. It used the local development server on
port 3000 and Chromium. This result does not claim production verification, manual visual
layout inspection or a complete accessibility audit.

## Preview, open inputs and rollback

Use the published [website](https://www.msrc2027.com/en) or the local preview at
`http://127.0.0.1:3000/en` or `/ar`. To start a local preview in this Windows checkout:

```powershell
. ./scripts/use-local-node.ps1
pnpm dev --port 3000
```

Hero paths remain in `src/content/public-site.ts`; the film interaction is in
`src/components/cinematic-film.tsx` and `src/lib/cinematic-film.ts`. Homepage copy,
chapter navigation and public styles remain separate from approved server-side content.

Open inputs remain official MSRC/KAU marks, final bilingual copy/brand sign-off,
venue/rooms/opening time, approved session/speaker/workshop catalogues, sponsor marks,
recording files/captions/access decisions and operational settings. This visual release
does not close CFG-12 or the broader institutional REL-01 gate.

Rollback is a scoped source revert of the presentation/film changes, followed by release
verification. It does not delete operational data or alter the approved media files or
their rights record. Preserve ORG-006 and this dated evidence if the presentation is reverted.
