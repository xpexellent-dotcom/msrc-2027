# 2026-10-23 · MSRC 2026 photos 10–18 in the public Media archive

Branch `claude/media-2026-day-one`. Owner request, 23 October 2026: add nine organizer-supplied Drive photographs (MED-01..04, LOC-01, ARC-01).

## What changed
- `public/media/editions/2026/photo-10.webp` … `photo-18.webp`. Converted from the supplied iPhone HEIC originals: oriented, fitted within 1800×1200, WebP quality 80, 113–164 KB each. EXIF, GPS, camera and ICC metadata removed. The originals and their Drive provenance stay outside the repository and public delivery.
- `src/content/edition-media.ts`: nine 2026 photograph entries after photo 9, with EN/AR titles and descriptions. As for the existing archive, descriptions say what is visible and name nobody.
- `src/content/edition-photo-framing.ts`: focal points for the 16:9 archive frame. Photos 10–14 are already 16:9. Photos 15–18 (4:3) keep the speakers, presenter and groups in frame.
- `tests/e2e/conference-experience.spec.ts`: archive counts updated (21 → 30 items, 2026 group 13 → 22, photographs 17 → 26, 2026 photographs 9 → 18).

## Checks
- `pnpm lint`: pass. `tsc --noEmit`: pass. `vitest run`: 88 files, 3,814 tests passed. `pnpm build`: pass.
- Playwright `conference-experience`, `premium-media-framing` and `cinematic-film` on chromium-desktop and chromium-mobile: 69 passed.
- Visual check of the 2026 archive group at 1280 px: all nine new crops keep their subjects.
- WebKit and the full visitor suites: NOT TESTED locally; CI runs them.

## Notes
- The staff media library (ENG-062) is not used here: it does not feed the public Media page until the content editor (#116) lands, and it does not accept HEIC.
- Image rights: supplied by the owner from the organizers' Drive collection for the archive, as with the 13 October selection.
