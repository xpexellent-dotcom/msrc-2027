# Premium refinement: requested media

Prepared 11 October 2026 for the requester's next local visual review.
Requirements: DSN-01/02, MED-01/02/03/04, CFG-12, ACC-01, LOC-01/03.
This records the selected assets and transformations; it does not establish
public reuse clearance or authorize hosted publication.

## Audit and plan before edits

- The previous pathway photographs did not match the three exact filenames
  selected in the latest request. Resolve those files inside the supplied
  MSRC 2026 collection, download complete originals and verify their scenes.
- Preserve the complete photographs as optimized web derivatives. Frame the
  Build on an idea photograph from its physical left side in the interface,
  excluding the standing person on the far right. Do not mirror it for Arabic.
- The existing city loop retains a persistent top-right `4K / Explore World`
  badge. The requester explicitly asks to crop it. Produce a separately named
  geometric crop from the unchanged original, retain the creator attribution
  in source records and file metadata, and keep the previous derivative.
- Preserve the first 23 source seconds, 2.8× playback, subtle blur, silent
  playback, 1600×900 output and a matching static poster.

## Grounded Drive photographs

Collection: [MSRC26](https://drive.google.com/drive/folders/1ly-wpEKEcHbKLuGbAGsMyaFsGX4aEY5X).
The folder chain was read through the Drive connector: Day 1
(`1B1ZXfvIn_3H135vDEm43rbqxfzx1EFVT`) → Without frame
(`1KeeMBSDk4ny7G2UqwG80UjI2RQfafg-m`) → Majed or Manar jamal.
The connector's folder response stops at 100 children, and filename search
returned no result for IMG_2529. Its visible card was located in the same Drive
folder through the browser; the card's file ID was then confirmed with connector
metadata before the complete original was fetched. No guessed IDs or thumbnails
were substituted. No Drive file, permission or organization was changed.

| Use | Exact source | Source ID | Source dimensions | Original bytes |
|---|---|---|---|---|
| Build on an idea | Day 1 / Without frame / Majed / IMG_9846.HEIC | `1S1QLckd9bGjqPAnYWymf6tPCNRFhq7np` | 5258×2958 | 1,755,414 |
| Learn by doing | Day 1 / Without frame / Manar jamal / IMG_2529.HEIC | `1jqYDMfGxgxbZRRN0im4z1QSrr60WvI6C` | 4032×3024 | 731,403 |
| Share your research | Day 1 / Without frame / Manar jamal / IMG_2560.HEIC | `1-e4D9317dKWatmMjMZh5iaU6iPxb5NM5` | 4032×3024 | 916,405 |

Verified source SHA-256 values:

- IMG_9846: `87f2cbe003927ceed9e7c1ad5dceedbd9ccb32652600139587df5990bec7cefe`
- IMG_2529: `499333c5edfb5485c0d3cee4b990f4eef5cf6206f84fe0ff5cc8aa2d2108150a`
- IMG_2560: `b0a31d71d455befe21797e797f67c4022d7d8976c33385b412a3fb0d2f1d1487`

Full HEIC originals remain in ignored `.tools/premium-assets/originals/`.
The locally installed Sharp build reads HEIC metadata but does not include a
HEVC decoder; it was not used to produce partial tiled images. The full primary
HEIC images were decoded with Pillow-Heif 1.8.0 in an isolated ignored tooling
directory, then auto-oriented and converted without creative edits. No project
runtime dependency was added. Sharp fits the resulting pixels inside 1800×1800
without upscaling, outputs JPEG quality 90, and a JPEG COM segment records the
source, local-review context and transformation. No raster crop, generated people,
retouching or invented identity/session claim is introduced.

All derivatives are in `public/media/msrc-demo/`:

| File | Dimensions | Bytes | SHA-256 |
|---|---|---|---|
| build-idea-majed-9846.jpg | 1800×1013 | 303,937 | `9efc3ac866f01e383001d9ab4cc4d9d4947c9c63659a1e304102db6950fe7a36` |
| learn-doing-manar-2529.jpg | 1800×1350 | 237,855 | `2483ce5c0235e8eb03147f0727bcce5e2a8fc11106ff466a1bfa7fe259496308` |
| share-research-manar-2560.jpg | 1800×1350 | 349,670 | `5a1ee5969982cf3d200937d1695e9f2ddc3abf2cd8d4b1d99845acbc90f0231e` |

### Visual framing

IMG_9846 depicts a classroom discussion. The standing person at the right begins
around source x=4,110 (78%). The intended visible range is approximately x=0–3,700
(0–70%), preserving the standing woman and seated discussion at the left. Use
physical `left` object positioning in both locales and sufficient cover/scale
for the actual card aspect ratio. Do not infer a specific hackathon activity
from this contextual photograph. IMG_2529 shows attendees facing a statistics
display; IMG_2560 shows conversations beside research posters in the foyer.

## Cropped Jeddah closing film

Unchanged source: [user-supplied MP4](https://drive.google.com/file/d/1zjAy11vovvsL_jXGTfo194qR-AZG7OeE/view),
`Jeddah City In Saudi Arabia - 4k Explore World (1080p).mp4`, 86,480,165 bytes,
1920×1080, 188.313832 seconds. SHA-256:
`d25867636eeeb63ffc810f2471b704d69bbe94793f016907899526d01311126b`.
Original remains `.tools/revision-assets/jeddah-user-original.mp4`.

The requester asks to crop the badge visible at the top right. The new geometric
crop keeps source x=0–1727 and y=0–971, removing the rightmost 10% and the bottom
10%. This keeps the skyline tops and removes the badge without painted or
generated pixels. A trial centered vertical crop was inspected and replaced
because keeping the source's top edge better preserves the tower silhouettes.
The final filter is:

```text
trim=start=0:end=23,setpts=(PTS-STARTPTS)/2.8,crop=1728:972:0:0,scale=1600:900:flags=lanczos,gblur=sigma=2,fps=30
```

H.264, yuv420p, CRF 23, slow preset, 30 fps, no audio, fast-start metadata.
The matching JPEG is the derivative frame at 0.4 seconds. The source's creator
**4k Explore World** remains in the MP4 artist metadata and JPEG provenance.
The previous uncropped video/poster remain in place for historical evidence.

| File | Dimensions / duration | Bytes | SHA-256 |
|---|---|---|---|
| jeddah-opening-cropped.mp4 | 1600×900 / 8.2 seconds / no audio | 2,253,549 | `e786b6cead73242b747ffaf3e6911630bc9c2d9d6dbf81d5a094823818ea8334` |
| jeddah-opening-cropped-poster.jpg | 1600×900 | 137,335 | `5353d32342156bbc888ae153d95e313ccf21748b36fbcac2f4a283488b24a868` |

The creator's source restrictions and public reuse gate recorded in
[the preceding asset manifest](editorial-revision-assets.md) remain applicable.
This local edit does not represent an original time-lapse recording or footage
of the conference venue.

## Observed verification

- **PASS:** all three exact filenames, parent folders, MIME types and complete
  downloaded byte lengths checked against Drive metadata.
- **PASS:** all three full photographs visually inspected; full decoded image
  dimensions verified, with no upscaling and no partial HEIC tile substitution.
- **PASS:** final derivative dimensions, byte lengths, hashes and embedded
  provenance read back. The media directory contains **26 JPEG rasters**, all
  with source-comment metadata; zero missing.
- **PASS:** FFmpeg decodes the complete final loop without errors; FFprobe reports
  H.264, 1600×900, 30 fps, 8.2 seconds and no audio stream. The MP4 `moov` box is
  at byte 32, ahead of `mdat` at byte 4,185, confirming fast-start layout.
- **PASS:** montage contact sheet, opening poster and final coastline frame
  inspected; the requested corner badge is outside the crop in each scene.
- **NOT TESTED by this media task:** rendered CSS crops, phone/desktop playback,
  RTL framing, contrast and reduced-motion poster behavior. The parent task
  verifies those after integrating these files.
- **NOT PERFORMED:** hosted publication, public-media registry promotion,
  original-file replacement, Drive mutation or participant communications.

Local receipts: `.tools/premium-assets/exports.json`,
`.tools/premium-assets/media-verification.json`, and inspected frames beside them.
