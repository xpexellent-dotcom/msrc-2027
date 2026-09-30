# Brand/interface polish and homepage film review

Date: 1 October 2026. Milestone: M2 refinement / focused M3 local preview.
Source: v0.5 DSN-01/02, LOC-01/03, ACC-01, MED-01/02/03/04, CMS-04, CFG-12,
INF-04, REL-01. Decisions: ENG-007/008.
Backlog: BL-DSN-02/03, BL-PUB-01/09.

## Scope, actors and gates

Purpose: give the organizer a complete English/Arabic visual and real-film preview
before publication, using the current implementation palette/fonts/motion while
official brand inputs are pending. Visitors retain public static Home/About;
the organizer reviews the montage only through local development.

Included: shared tokens/button/navigation refinement, Home/About reading hierarchy,
text reflow, optional native section settling, reviewed compressed desktop/mobile
film and stills, translated pause and fallbacks, local-only media boundary, meaningful
unit/browser checks and checklist reconciliation.

Excluded: final brand/content approval, publishing/deploying/pushing, DNS, paid services,
staff/CMS/authentication, registration/payments/submissions/review/workshops/competitions,
attendance/certificates, live Supabase changes and real messages.
No dates, prices, capacities, sponsor identities, participant rosters or integrations
were added. Dependency versions/lockfile and all15 operational gates are unchanged.

Dependencies: existing M1/M2 public foundation, user-supplied MSRC2026 montage and
ENG-007 defaults. Official marks/brand guidance, final EN/AR copy, rights/consent,
scientific poster/slide clearance, media/privacy owners and organizer approval remain
unresolved release inputs. Their absence did not block the local preview.

## Behavior, data and boundaries

- Buttons use solid directional slide fills,180 ms feedback,1 px lift and98% press.
  Hover arrows/underlines mirror in RTL; disabled states remain static. Reduced motion
  removes travel; keyboard focus and44 px targets remain visible.
- Scrolling stays browser-owned. At least960×700 px viewports use optional
  `y proximity` settling; “Free scrolling” removes it. Reduced motion disables it,
  phones scroll freely, and anchors update the hash and move focus. No wheel/touch/key
  cancellation or mandatory stop is used.
- Public homepage content is shared with the isolated review route. Public assets
  remain null for real video, logos/sponsors/gallery; the synthetic poster is retained.
- The18.7-second local loop moves auditorium → audience → three research discussions →
  audience, with restrained dissolves and a continuous seam. Two device-specific files
  avoid downloading both video variants. The title/action remain live HTML over a
  direction-aware purple/ink scrim; audio is removed.
- Pause freezes the decoded frame and retains keyboard focus. A normal-flow mobile
  control slot grows with translation/text enlargement and avoids kicker/location overlap.
  Reduced motion, saveData/2g/3g and playback errors display a still; no video is fetched
  under the tested preference constraints. The Network Information API is optional;
  browsers without it still honor reduced motion and the pause control.
- `LOCAL_MEDIA_PREVIEW_ENABLED=true` is server-only and accepted only in development
  outside Vercel production. Production builds reject review pages/assets even when the
  flag is enabled. Routes require all four derivatives; absent files fail closed.
- Only four fixed filenames are readable. Realpath containment, bounded file size and
  validated single-byte ranges reject originals, manifests, traversal, escaping symlinks
  and invalid/multiple ranges. Responses are private/no-store/noindex/nosniff; GET/HEAD
  support seeking, no upload/write method is implemented.
- Data touched: read-only source copy and local encoded derivatives/verification artifacts.
  Source SHA256 remains unchanged. No participant/auth/database/storage records, migrations,
  new grants/RLS, audit events, email or payment effects apply to this read-only UI slice.
  No confidential file is exposed by a production URL.

Media source, exact cuts/properties/hash and approval status:
[MEDIA_REGISTER](../MEDIA_REGISTER.md#8-msrc2026-montage-local-review-candidate--1-october-2026).
The private manifest/encoding recipe are retained under ignored `.tools/media`.
The original Drive item is unchanged; the local copy is read-only.

## Complete file list for this slice

- `.env.example`
- `README.md`
- `docs/DECISIONS.md`
- `docs/DESIGN_GUIDE.md`
- `docs/MEDIA_REGISTER.md`
- `docs/PROGRESS.md`
- `docs/features/brand-motion-media-preview.md`
- `playwright.config.ts`
- `src/app/[locale]/(preview)/page.tsx`
- `src/app/[locale]/hero-preview/page.tsx`
- `src/app/api/preview-media/[asset]/route.ts`
- `src/app/globals.css`
- `src/components/homepage.tsx`
- `src/components/hero-media.tsx`
- `src/components/section-journey.tsx`
- `src/lib/media-policy.ts`
- `src/lib/preview-media.server.ts`
- `src/lib/preview.server.ts`
- `src/styles/about.css`
- `src/styles/components.css`
- `src/styles/homepage.css`
- `src/styles/journey.css`
- `src/styles/media.css`
- `src/styles/tokens.css`
- `tests/e2e/brand-motion.spec.ts`
- `tests/e2e/design-system.spec.ts`
- `tests/unit/media-policy.test.ts`
- `tests/unit/media-preview.test.ts`

Prior checklist-audit/backlog documentation changes were already present and are preserved;
they are not new application scope. Generated `next-env.d.ts` is restored to its existing
tracked state. No migration, package, lockfile, GitHub workflow, hosted environment,
Supabase or Vercel configuration changes.

Local files intentionally excluded from Git:
`.tools/media/source/Montage_3.mp4`,
`.tools/media/msrc2026-preview/{desktop.mp4,mobile.mp4,poster-desktop.jpg,poster-mobile.jpg,manifest.json}`,
`.tools/media/encode-preview.mjs`, portable FFmpeg and verification scripts/screenshots.
The local preview does not exist in a clean clone until private derivatives are restored.

## Commands and actual results

| Executed verification | Observed result |
|---|---|
| `. ./scripts/use-local-node.ps1` | Node24.21.0/pnpm11.19.0 selected; no system PATH mutation |
| `pnpm check` (final, dev stopped first) | PASS: ESLint zero warnings; Next route generation/TypeScript;213 unit tests in9 files; optimized production build |
| `PLAYWRIGHT_BROWSERS_PATH=.tools/playwright pnpm test:e2e` (PowerShell env assignment) | PASS:112 tests; Chromium desktop/tablet/mobile, EN/AR public/About/showcase, keyboard/focus, reduced motion, resized text, frozen frame and closed API boundaries |
| Production-build media gate within E2E, local flag explicitly true | PASS: both review pages, four derivatives and original endpoint404; no real montage served |
| `node .tools/media/encode-preview.mjs` | PASS: both18.7-second H.26430 fps silent derivatives; source hash unchanged; desktop2,762,552 B/mobile1,866,350 B |
| Portable FFmpeg `-hide_banner -loglevel error -i <derivative> -f null -`, FFprobe duration/stream probes and MP4 atom-order check | PASS for both final files: full decode, no audio stream, faststart (moov before mdat) |
| `node .tools/verification/polish/capture-review.mjs` | PASS:6 EN/AR1440/390/320 paused-film views; zero console/page errors, horizontal overflow, caption/control overlap or Axe violations; still mode on reduced motion |
| `node .tools/verification/polish/verify-reflow.mjs` | PASS:30 views at200% text, EN/AR Home/About/film preview at320/390/412/791/1440 px; no horizontal scrolling or clipped title/legacy years |
| `node .tools/verification/polish/verify-control-flow.mjs` and `node .tools/verification/polish/verify-interactions.mjs` | PASS:8 EN/AR320/390 mobile views at100/200% text; no kicker/location overlap; directional hover, disabled/reduced-motion and focus checks |
| `node .tools/media/verify-local-preview.mjs` | PASS:25 checks; correct sole desktop/mobile source, keyboard pause/resume/frozen frame, no-video preference modes, source-failure fallback, exact byte ranges, original/traversal denial |
| agent-browser0.38.1 on restarted3300 preview | PASS: HTTP/content loaded, one H1, LTR, no browser errors; final local preview remains running |
| `Get-FileHash .tools/media/source/Montage_3.mp4 -Algorithm SHA256` | PASS: equals recorded before/after SHA256 |
| `git diff --check`; `git check-ignore` source/derivatives | PASS: no whitespace errors; original and final derivatives ignored |
| Guarded native Page patches | Applied9 scoped Brand/interface/sequence updates, receipt sequence2; no unrelated feature statuses changed |

Initial full browser run was107/112: two computed-style assertions needed Chromium's
equivalent `y` serialization; two tests found reduced-motion selector precedence; one
found English mobile grid overflow at200% text. Corrected assertions and defects,
then the final full112-test run passed. The broader reflow review also fixed footer,
skip-link, About label/button and decorative legacy-year wrapping.

One intermediate targeted attempt omitted `PLAYWRIGHT_BROWSERS_PATH`: four browser
cases could not launch (setup failure; one HTTP gate passed). The final run used the
documented cache correctly. Concurrent development/build briefly produced a Turbopack
HMR panic/stale CSS; stopping development, completing checks and restarting produced
fresh successful previews. Stop the dev process before production checks on this checkout.

Database tests NOT RUN for this UI/read-only-local-media slice; no schema/RLS/data changes.
GitHub CI/remote Preview/deployment NOT RUN or created for this slice. Previous CI is
historical evidence only. Safari/WebKit/Firefox, actual devices, screen-reader UAT and
final Arabic/editorial/brand/media approval remain NOT TESTED or PENDING.

## Opening and manual review

From this checkout, with the private derivatives present:

```powershell
. ./scripts/use-local-node.ps1
$env:LOCAL_MEDIA_PREVIEW_ENABLED = 'true'
pnpm dev --port 3300
```

[English film preview](http://127.0.0.1:3300/en/hero-preview) ·
[Arabic film preview](http://127.0.0.1:3300/ar/hero-preview).
Public static drafts: [EN](http://127.0.0.1:3300/en) /
[AR](http://127.0.0.1:3300/ar). Component states remain at each locale's `/design-system`.
Only `.env.example` documents a new blank local flag; no hosted settings or credentials
are changed. No database or Docker start is needed.

Screenshots and observations are under
`.tools/verification/polish` and `.tools/verification/hero-preview-independent`.
Review the full loop, reading hierarchy, both translations, buttons/focus, section settling
on/off and phone crop/poster. A still remains usable with reduced motion or missing media.
The current real montage is labelled MSRC2026 local review; it is never approved2027 imagery
by implication.

## Release, next work and rollback

Release state: LOCAL REVIEW READY, UNPUBLISHED. Checklist/PROGRESS/ENG-008 record technical
completion separately from final brand/copy/rights approval. Official branding and organizer
film selection review are the next inputs; per-asset consent, poster/slide clearance,
captions and accountable media/removal owners precede publication. Recheck final frame
contrast/crops after any approved asset change.

Next smallest unblocked code slice remains BL-PUB-02, bilingual Dates/Venue with unset
values and closed workflows; BL-SEC-01 can proceed separately with synthetic actors.
Do not silently promote this preview or open CMS/participant workflows.

Rollback: stop the local server and remove `LOCAL_MEDIA_PREVIEW_ENABLED` (PowerShell:
`Remove-Item Env:LOCAL_MEDIA_PREVIEW_ENABLED`). This immediately closes real-media review
when restarted; public static artwork remains. To revert the interface use the scoped diff/
future PR, preserving prior audit/backlog/user edits. No database rollback, DNS restoration,
production deployment rollback or participant communication is required. Retain the private
original; delete only explicitly selected local derivatives if requested.

## Subsequent authorization — 1 October 2026

This feature record preserves the original local-review scope, file list and actually
executed checks above. A later explicit user decision, **ORG-002**, approves the current
18.7-second MSRC2026 cut for public homepage use, including its visible people and research
posters, desktop/mobile crops and still fallbacks. The user also authorized pushing and
publishing the current updates. Therefore the earlier “UNPUBLISHED/local review only”
restriction is superseded for this four-file derivative set; approval of other footage,
gallery selections, final marks, full bilingual copy or institutional REL-01 is not inferred.

The separately authorized public release copies only the approved display derivatives to
`public/media/msrc2026/{hero-desktop-v1.mp4,hero-mobile-v1.mp4,poster-desktop-v1.jpg,poster-mobile-v1.jpg}`
and keeps the previous-edition caption, pause and accessible fallback behavior. The original
remains ignored and unchanged at SHA256
`2b2b82e05c11e0eeeacfef60efed222f1cfba439003e210b9c521202ea90372c`;
source/manifest/recipe are not publicly delivered. Existing local review pages/API retain
their production 404 boundary, and removing their flag does not disable the newly authorized
public hero. No database migration, grants/RLS change, participant communication or
operational activation follows; all 15 workflows remain closed.

Publication is **AUTHORIZED / PUSH, DEPLOYMENT AND LIVE VERIFICATION PENDING** at the time
of this documentation reconciliation. Current public-build commands, final changed files,
GitHub/Vercel/live evidence and rollback notes belong to the new release feature record and
[PROGRESS](../PROGRESS.md); do not relabel the historical checks above as new release tests.
Rollback restores synthetic hero references/the preceding deployment and unpublishes the
controlled public derivatives as applicable, preserving this approval and the original.
Named removal/retention/backup responsibilities, official brand delivery and final human
accessibility/Arabic reviews remain follow-up work.
