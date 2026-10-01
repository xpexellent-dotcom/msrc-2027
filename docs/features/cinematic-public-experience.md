# ORG-005 — Cinematic public website

1 October 2026. Actor: anonymous public visitor. Owners: frontend and bilingual content
editors. Source IDs: SCP-01/02/03/05, DSN-01/02, PRG-01, CMS-01/02/04, MED-01–04,
LOC-01–03, ACC-01, TIM-01, CFG-01/12, REG-02/03, ABS-01/04/07/08/09,
HAC-01/02/04, WKS-01/02, REL-01. Decision: [ORG-005](../DECISIONS.md).

## Result and visual system

The approved MSRC2026 film fills the opening screen behind a floating centred navigation
capsule. Identity and actions appear before the film loads. Normal muted inline playback
has a visible Pause/Play control; reduced motion/data saving, blocked autoplay and media
failure have distinct usable states. The existing responsive posters remain the fallback.
The countdown moves to a calm ivory date band below the film, retaining its labelled
Riyadh date-boundary target and confirmed 27–28 January 2027 dates.

Brand guide inspected: `sources/MSRC27_Website_Brand_Guide.pdf` and the supplied Canva
reference. Tokens: purple #3B1E6D, gold #C9A24A, ivory #F8F6F0, lilac #DCCFF0,
ink #1F1930. Existing self-hosted Manrope display, DM Sans action, Inter body and Noto
Sans Arabic fonts remain. New flowing SVG lines are decorative artwork, not official
logos or scientific diagrams. Consistent spacing, gold rules, readable borders, pill
buttons and 3:4 natural-photo portrait frames extend the system to every new page.

Reference roles inspected, without copying their assets:

- [Stripe Sessions](https://stripesessions.com/): editorial hierarchy, spacing and navigation.
- [Slush](https://slush.org/): full-screen conference atmosphere.
- [Config](https://config.figma.com/san-francisco/) and its
  [2026 identity case study](https://www.figma.com/blog/the-visual-identity-behind-config-2026/):
  recurring graphic identity and consistent speaker treatment.
- [ESC Congress](https://www.escardio.org/events/congresses/esc-congress/): scientific
  session organisation and connections to resources/recordings.

Homepage narrative: opening, purpose, four participation paths plus 3MT, programme
overview, speaker announcement, previous-edition film connection, partner announcement,
native FAQ disclosure and final participation action. No fictional roster, logos,
statistics or stock photos are presented as conference evidence.

## Routes and working behaviour

Every route below exists in English and Arabic under `/en` and `/ar`:

| Destination | Behaviour |
|---|---|
| `/` | Film, floating navigation, editorial narrative, date band, FAQs and working links |
| `/about`, `/dates-venue` | Existing information carried through the shared visual shell |
| `/program` | Day/category/room/search controls, Riyadh timezone, announcement and no-results states |
| `/program/[slug]` | Approved session detail, duration, room, objectives, linked speakers and recording state |
| `/speakers`, `/speakers/[slug]` | Approved portrait/profile/session presentation; unknown profiles404 |
| `/media` | Search by session/speaker/topic, edition/type filters, real-asset playback/access states |
| `/participate` | Distinct attendance, research, hackathon, workshops and3MT paths |
| `/registration`, `/submissions`, `/hackathon`, `/workshops`, `/3mt` | Requirements, steps and honest closed states |
| `/programme`, `/participation` | Aliases to the canonical public destinations |

Programme and media filter selections update the URL, survive locale switching and
reset when navigation returns to the unfiltered destination. Parallel approved sessions
retain room/time metadata; missing times and incomplete schedules are explicitly labelled.
Scientific session content remains English/LTR in the Arabic interface. Long names and
missing portraits have supported layouts. Mobile disclosure navigation supports Escape,
focus return and generous targets. Anchors keep meaningful focus and header clearance.

Raw catalogues live in `src/content/conference-catalogue.server.ts`; only approved
records can enter public clients or resolve profile/session detail routes. Typed records,
copy and filters are separated in `src/content/conference-experiences.ts`; homepage
editorial copy is in `homepage-narrative.ts`. These are currently empty catalogues,
not a connected CMS. Synthetic filter records exist only in tests.

## Integrations and release boundary

Working: existing approved self-hosted hero/posters, responsive public routes, bilingual
navigation, accessible interactions, local filtering and typed approved-content rendering.
Frontend preparation only: programme/speaker/workshop publishing, media library entries,
recording access and all application/booking/submission journeys. No operational form
pretends to submit. All 15 existing workflow gates remain closed. Existing private routes
and media-review boundaries remain protected.

No package/lockfile, database/schema/migration/RLS/grant, environment, secret, payment,
email, domain/DNS or hosted-resource change. No publication of new recordings/photos
or reuse of homepage-only montage as a gallery asset. No new third-party runtime embed.

## Local preview and replacement points

Open `http://127.0.0.1:3000/en` or `/ar`. On this Windows checkout:

```powershell
. ./scripts/use-local-node.ps1
pnpm dev --port 3000
```

The script normalises this checkout's local runtime path. In a standard environment,
use the pinned package/runtime versions in `package.json` and `pnpm-lock.yaml`.
Hero paths and responsive crop settings remain in `src/content/public-site.ts`.
Any replacement media requires its own approval and media-register entry. Add approved
catalogue records at the server boundary, preserving publication/access types and source
evidence. The public copy modules keep the proposed headline and supporting text easy
to review and replace without touching layout code.

## Verification

- `pnpm check`: PASS. ESLint with zero warnings, generated route/types, 258/258 unit
  tests and an optimised production build with 40 generated pages/detail route handlers.
- Unit coverage includes approved/draft filtering, simultaneous sessions, combined
  filters, stable source records and restricted/pending media without asset URLs.
- `pnpm test:e2e`: PASS, 237 browser tests / 2 intentionally skipped duplicate matrix
  cases in 3.6 minutes against the final production build. Desktop, tablet and mobile
  Chromium cover keyboard/focus, URLs/filter reset, locale/new-tab links, 200% text,
  contrast/axe scans, immediate headline/loading, film preferences/pause/denial/failure,
  true404 detail routes and unchanged closed-workflow failure/concurrency regressions.
  The desktop-only bilingual matrix itself checks320/791/1440px; its two mobile-project
  duplicates are intentionally skipped. See [PROGRESS](../PROGRESS.md) for earlier
  failures and the fixes before this passing run.
- Visual review covers EN/AR desktop 1440×900, tablet 791×1000 and mobile 390×844;
  30 route snapshots returned 200 with zero page errors and no horizontal overflow.
  Additional browser checks cover 320px and 200% text, navigation, filters, video loading,
  autoplay denial, failure fallback, preference changes, keyboard and axe scans.
- An installed Next16.3.7 cached-route canonical URL appended the initial hash twice
  on a return locale visit. Locale transitions now route pathname/query first, then
  commit the intended fragment once at arrival, preserving history, focus and rendered
  link addresses. A targeted keyboard/new-tab regression covers this behaviour.
- NOT TESTED: physical devices, Safari/Firefox, human screen-reader/Arabic editorial
  review, real content portraits/parallel schedules and approved recording playback.
  Database tests were not rerun for this public-only change; schema/server gates are
  unchanged. This local preview has not been deployed as part of ORG-005.

## Missing inputs and next task

Final official MSRC/KAU logos; approved venue/rooms/opening time; session catalogue and
speaker biographies/portraits; workshop catalogue; confirmed sponsor marks; additional
gallery/photo rights; library recording files/captions and publication/access decisions;
prices, capacities, deadlines and operational approvals; final bilingual copy/brand sign-off.
The real approved hero is available, so no substitute footage is required for this preview.

Next: review the public design and supply the approved programme/speaker/media catalogue,
then populate it through the server boundary and verify actual content. Operational
journeys require their own release gates and backend milestones. Rollback is a scoped
source revert of this public interface; approved media files and existing operational
gates/data are unaffected. Preserve earlier PROGRESS records as dated evidence.
