# Fluid refinement: selected photographs

Prepared 11 October 2026 for ENG-025's local approval demo.
Requirements: DSN-01/02, MED-01/02/03/04, CFG-12, ACC-01, LOC-01/03.

## Selection and source verification

The requester selects three exact photographs from the supplied
[MSRC26 collection](https://drive.google.com/drive/folders/1ly-wpEKEcHbKLuGbAGsMyaFsGX4aEY5X).
Drive folder metadata establishes the original hierarchy and filenames before
raw download. All three were found in connector folder listings; no guessed
file IDs, browser thumbnails, public-download fallback or substitute images
were needed. Filename search returned no match, but the supplied folder tree
provided the exact matches.

- Day 1 (`1B1ZXfvIn_3H135vDEm43rbqxfzx1EFVT`) → Without frame
  (`1KeeMBSDk4ny7G2UqwG80UjI2RQfafg-m`) → Majed
  (`1c67I1eiZSini1wpg6Ee5uFBWPJP3w1kg`).
- Day 2 (`1ad7Ato1Fuv38Iq9A3hxLHUHk0y_t4G01`) → Without frame
  (`1wkez3zex5RiTc3dM85s9QLO07rpLrsEu`) → Rania Al alshaikh
  (`1-F6IOCi_i8KSvjqPYQjCzmwZccXq43Do`).

Raw fetch readback confirms each immediate parent ID, MIME type and byte length.
Complete original downloads remain in ignored `.tools/fluid-assets/originals/`.
Contributor folder labels record provenance, not independently verified credits.

| Placement | Exact source | Dimensions | Original bytes |
|---|---|---|---|
| Growing community half-panel | [Day 1 / Without frame / Majed / IMG_9804.HEIC](https://drive.google.com/file/d/10iIT5cVYIPy-t-Y93S0Snt7lcXyLqr8b/view) | 8064×4536 | 3,985,148 |
| Attend page header | [Day 1 / Without frame / Majed / IMG_9744.DNG](https://drive.google.com/file/d/1pB8bEoCe2otmUmHzZ-C8njclzEJblCU8/view) | 8064×4536 | 3,677,573 |
| Speakers page header | [Day 2 / Without frame / Rania Al alshaikh / IMG_9801.HEIC](https://drive.google.com/file/d/1oEucGktmeDbS5S_p2BA2sLnDKOaCD-Ws/view) | 5712×4284 | 2,351,569 |

IMG_9744 has a DNG filename but Drive reports image/jpeg and Pillow identifies
its bytes as MPO (a JPEG-based multi-picture container). Its complete primary
photograph is decoded; this is not a RAW-developed or thumbnail substitution.
HEIC originals use the existing isolated Pillow-Heif decoder from ENG-024.
No runtime dependency was added.

Original SHA-256:

- IMG_9804: `4c108f478df6d16f8bbc3fd3ba08d517b0953a3f2291c83f64adc5453b356a50`
- IMG_9744: `266ebe1f56123f76b12b36155a9f43fad528aa90c3aba1ed89fcd748c3c4fd0c`
- IMG_9801: `d540a9206946d6e02df0f39176a0eb4fb3c4997e7cfeab0b5c68f60dbe05fcb1`

## Web derivatives

Full photographs are auto-oriented, converted to RGB, fit inside 2200×2200
without upscaling and encoded as quality-90 JPEGs. No raster crop, retouching,
compositing or generated pixels are introduced. A JPEG COM segment records
the source URL, folder, exact filename, purpose and transformation.

All three files are in `public/media/msrc-demo/`.

| File | Dimensions | Bytes | SHA-256 |
|---|---|---|---|
| community-majed-9804.jpg | 2200×1237 | 492,610 | `6afc88390b3681d4a00c3cc8a250ddb50b3475b597188546da3f70e1e0c7ad4a` |
| attend-majed-9744.jpg | 2200×1237 | 326,328 | `5cde0276472baf978709d2b5f40b1a99ed5e5fc06c0db097d14f2976049b3488` |
| speakers-rania-9801.jpg | 2200×1650 | 568,257 | `01c3b0c8adf713ccf49d92f2d43b87094b676c1e623b37938e2f2c9d9b3b7eec` |

### Visible scenes and framing

- **Community:** a wide auditorium audience photographed from beside the stage.
  Audience fills the lower-right two thirds; avoid making the ceiling the main
  subject. Suggested physical object-position 60% 65%, modest 1.08–1.16 scale.
  The interface applies the requested purple tint, blur and fading section edge.
- **Attend:** people in a busy registration foyer, with desk staff to the right.
  Suggested object-position 50% 58% retains both attendees and the desk.
- **Speakers:** a seated stage panel with large projection screens above.
  Suggested object-position 50% 65% prioritizes the physical panel. Blur/tint
  should keep historic names on the screens from reading like a 2027 roster.
  No identity is assigned to the visible people.

These are decorative section/header backgrounds. Contextual alternatives must
not assert that the scenes show a confirmed 2027 activity or named speaker.
The existing Manar Jamal IMG_2560 derivative is reused for Research and Workshops;
its source/hash remain in [the preceding manifest](premium-refinement-assets.md).

## Observed verification

- **PASS:** exact filenames and folder memberships, MIME and complete downloaded
  byte lengths matched connector metadata for all three sources.
- **PASS:** complete primary image decode, orientation and source dimensions.
- **PASS:** all three final photographs visually inspected at large size.
- **PASS:** all three JPEG dimensions, final byte lengths, SHA-256 and embedded
  source-comment provenance read back; no upscaling.
- **NOT TESTED by this media task:** final browser framing, blur/tint contrast,
  responsive and RTL crops or page loading. Parent integration owns those checks.
- **NOT PERFORMED:** hosted publication, Drive changes, original replacement or
  approved-public-media registry promotion.

Local receipts: `.tools/fluid-assets/source-inspection.json` and
`.tools/fluid-assets/exports.json`; conversion sources are beside them.
The user selected these assets for this local review. This manifest does not
itself establish public reuse clearance or authorize hosting publication.
