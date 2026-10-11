# Approved design: release asset audit

11 October 2026. Read-only inspection of the accepted ENG-026 design in the
`msrc-design-engineering` worktree. Requirements: MED-01/02/03/04, CFG-12,
DSN-01/02, ACC-01, LOC-01/03. Only this report was written by the asset audit.

## Publication authority and provenance

The requester now explicitly says: **“I approve of the Demo, bring it into the
live version.”** This authorizes publishing the accepted design and its selected
assets, superseding the earlier manifests' local-demo-only task scope. Preserve
the approved photographs, cropped Jeddah footage and venue image; this audit
does not substitute media, request another approval or change any workflow.

This current publication instruction is distinct from third-party license
verification. The historical editorial manifest records that the 4k Explore
World source description prohibited copying/re-uploading and included licensed
stock; no independent creator clearance is in the repository. The venue image
comes from KAU's official facilities page, with no separate reuse license
recorded. Those observations remain factual limitations, not a claim that the
organizer's new publication approval proves a license. User-supplied MSRC archive
photos, the exact requested photos and their source IDs retain their existing
provenance. No new names or confirmed 2027 roster identities are assigned.

The generated sculpture/grain retain their generation provenance. Venue maps
retain embedded OpenStreetMap/ODbL provenance and the component's visible
OpenStreetMap contributors attribution. No third-party map request is needed to
render the static maps.

## Minimal new public asset set

Include these **26 files / 8,543,976 bytes** under `public/media/msrc-demo/`.
Their names remain unchanged, so existing source-relative URLs keep working.

| File | Bytes | Used by |
|---|---:|---|
| archive-2023-posters.jpg | 167,110 | Previous-editions homepage gallery |
| archive-2024-talk.jpg | 88,778 | Previous-editions homepage gallery |
| archive-2025-conversation.jpg | 58,447 | Previous-editions homepage gallery |
| attend-audience.jpg | 305,818 | Attend pathway and archive gallery |
| attend-majed-9744.jpg | 326,328 | Attend header |
| build-idea-majed-9846.jpg | 303,937 | Build an idea pathway and Hackathon header |
| community-majed-9804.jpg | 492,610 | Growing community background |
| film-grain.jpg | 65,042 | Shared surface and navigation texture |
| gallery-awards.jpg | 270,283 | Homepage and archive galleries |
| gallery-community.jpg | 349,630 | Homepage and archive galleries |
| gallery-msrc2026.jpg | 270,309 | Homepage and archive galleries |
| gallery-presentation.jpg | 267,017 | Galleries and 3MT header |
| gallery-stage.jpg | 260,439 | Homepage and archive galleries |
| jeddah-opening-cropped-poster.jpg | 137,335 | Jeddah still fallback |
| jeddah-opening-cropped.mp4 | 2,253,549 | Accepted cropped Jeddah loop |
| king-faisal-venue.jpg | 144,477 | Homepage venue and Venue header |
| learn-doing-manar-2529.jpg | 237,855 | Learn by doing pathway |
| programme-panel.jpg | 251,258 | Program header; filename is not visible copy |
| research-sculpture.jpg | 133,022 | Benefits artwork |
| share-research-manar-2560.jpg | 349,670 | Research pathway; Abstract submission and Workshops headers |
| speakers-rania-9801.jpg | 568,257 | Speakers header |
| three-minute-talk.jpg | 218,896 | 3MT pathway |
| venue-map-ar-landscape.svg | 322,362 | Arabic desktop venue map |
| venue-map-ar-portrait.svg | 189,647 | Arabic narrow venue map |
| venue-map-en-landscape.svg | 322,294 | English desktop venue map |
| venue-map-en-portrait.svg | 189,606 | English narrow venue map |

Reference trace: `src/content/cinematic-demo.ts`, `homepage.tsx`,
`conference-experiences.tsx`, `research-artwork.tsx`, `venue-geographic-map.tsx`,
the Venue page, `editorial-motion.css` and `axiom-navigation.css`.

The existing four approved `public/media/msrc2026/` hero files remain needed.
Both tracked JPEG posters have only metadata changes: their decoded raw pixels
are byte-identical to HEAD. Their added source comments do not alter the accepted
visuals. Existing MP4s are unchanged by this design lane.

## Exclude from the new commit; retain locally

These ten superseded/unused derivatives total **7,557,182 bytes**:

- `archive-portrait-one.jpg`
- `archive-portrait-two.jpg`
- `research-presentation.jpg`
- `build-an-idea.jpg`
- `hackathon-collaboration.jpg`
- `workshops-discussion.jpg`
- `jeddah-corniche-fast.mp4`
- `jeddah-corniche-poster.jpg`
- `jeddah-user-opening-fast.mp4`
- `jeddah-user-opening-poster.jpg`

The first three remain in the unused `demoImages.speakers` data property; no
rendered component reads that property. `demoImages.programme` is also unused,
but its photograph is independently needed by the Program header. The Pexels
pair is a separately licensed fallback, not the selected current design. Keep
all these local files for provenance and prior receipts; do not delete originals
or rewrite historical manifests.

All source downloads, original HEIC/DNG/JPEG/MP4 files, contact sheets, extracted
PDF materials and build tooling stay under ignored `.tools/` directories.
`git check-ignore` confirms that boundary. A clean Git-based deployment includes
only committed files; an upload from the dirty local checkout must separately
exclude unused public files, because public-directory files can otherwise be
served even when no page references them.

## Observed technical checks

- **PASS:** all 26 selected files exist; byte counts and SHA-256 values were read
  from disk. The six explicitly selected ENG-024/025 photographs and cropped
  Jeddah video/poster match their recorded current source hashes. No selected
  asset exceeds 2,253,549 bytes; the largest raster is 568,257 bytes. No large
  original video or photograph is in the public media tree.
- **PASS:** current FFprobe readback: the cropped Jeddah asset is H.264,
  yuv420p, 1600x900, 30 fps, 8.2 seconds, one video stream, no audio stream.
  Current MP4 box inspection confirms `moov` at byte 32 before `mdat` at 4,185.
- **PASS:** Sharp metadata inspection of all 29 local demo JPEGs reports no EXIF
  or XMP payloads. Each has a provenance comment; no inspected comment matched
  local Windows paths, bearer/access/refresh tokens, passwords or secret markers.
  Only the selected subset is needed for release.
- **PASS:** no HEIC, DNG, PDF, ZIP, JSONL, CSV, EML, log, environment or spreadsheet
  file exists under `public/`. Git tracks no `.tools`, `.env` or `.vercel` files.
  Environment/hosting metadata and original download locations are ignored.
- **PASS:** all selected media URLs are same-origin `/media/msrc-demo/...`
  paths. There is no Google Drive playback URL, YouTube embed, credential URL or
  dependence on a local filesystem path in the rendered media references.
- **PASS:** the closing video is mounted on approach, uses a poster, and respects
  reduced motion, Save-Data and slow-connection preferences. Existing controls
  and behavior were not changed by this audit.
- **NOT TESTED in this read-only audit:** final deployed asset responses/range
  requests, CDN cache, playback on production, platform upload acceptance or
  production rendered image crops. The release owner performs those checks
  against the actual deployed commit.

The initial metadata probe could not resolve Sharp as a direct dependency; the
read-only retry used Next's installed Sharp dependency and completed. No package
was installed and no runtime dependency was added.
