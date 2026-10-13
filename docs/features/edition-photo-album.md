# Edition photos and album — 13 October 2026

Requirements: MED-01–04, ARC-01, CMS-04, LOC-01/03, ACC-01, DSN-01/02.

The organizer supplied a specific 22-item Drive collection and requested its use
on the homepage and in the album, subject-aware desktop/mobile framing,
bottom-right four-digit year labels inside photos, and newest-first browsing.
This records that explicit selection and placement instruction; no additional
institutional approval is inferred. Filenames supply the year.

Source folder: [selected 2023–2026 media](https://drive.google.com/drive/folders/1Pr_wEJ1_s6tKYPslnflwNzJyVBnF-d9S).
The retrieved inventory contains 18 PNG photos and four MP4 clips:

| Placement / edition | Photos | Videos |
| --- | ---: | ---: |
| 2026 album | 9 | 4 |
| 2025 album | 4 | 0 |
| 2024 album | 2 | 0 |
| 2023 album | 2 | 0 |
| Homepage Build on an idea, 2026 | 1 | 0 |

The new album replaces the previous hard-coded six-photo rail and uses the
existing approved catalogue and URL filters. Visitors scroll through 2026, 2025,
2024, then 2023; photos retain natural dimensions instead of being forced into
uniform crops. English and Arabic titles/alternative descriptions identify
visible activity without inferring people's identities or 2027 roles.
Year labels stay physically bottom-right, including RTL, and use the organizer's
requested digits. They are rendered inside the photo frame, so they remain
legible at small screen widths.

The dedicated Build photo appears on the homepage only. Homepage highlights use
six supplied photos from the four years. Pathway framing preserves visible faces
and separates photo and copy on small screens; the 3MT speaker is retained.
The existing opening film and its playback policy are unchanged.

Delivery: metadata-stripped WebP derivatives preserve image aspect ratios and
do not enlarge sources. Four H.264/AAC clips retain their original video/audio
streams and use MP4 fast-start, with WebP posters. All new files use new paths
under `public/media/editions/`, respecting the existing media-cache policy.
Originals remain ignored in `.tools/edition-photo-sources`, outside public
delivery; no Drive original, organization, or sharing permission was changed.
No image generation or alteration of depicted people was used.

Fresh source base: `3550d271a93588b7bf6d315eaa17dc04297cd5a3`.
Implementation is isolated on `codex/edition-photo-update`; unrelated work in
the original checkout is preserved. Operational flows and service configuration
are unchanged.

## Verification

| Check | Observed result |
| --- | --- |
| `pnpm check` using Node 24.21.0 / pnpm 11.19.0 | PASS: lint, route/TypeScript checks, 2,402 unit tests in 61 files, optimized 81-page build. `.tools/edition-final-check.log`. |
| Focused Playwright suites | PASS: 62 passed, two existing duplicate matrix skips, zero failures/retries in 1.1 minutes. `conference-experience.spec.ts`, `axiom-experiences.spec.ts`, `premium-media-framing.spec.ts`; `.tools/edition-browser.log`. |
| Album content, filters, keyboard, accessibility | PASS in local Chromium: 21 records/17 photos/four videos, year order and 9/4/2/2 photo counts, full source aspect, bottom-right labels, older-edition and kind filters, EN/AR navigation, reduced motion, axe checks, no participant writes. |
| Visual review | PASS: screenshots for EN/AR at 390, 900 and 1440 CSS px; Build and 3MT crops, all edition sections and homepage highlights. Inspected original photo contact sheet, video posters, rendered crop sheet, desktop album sheet and Arabic mobile album. No horizontal overflow or page errors in six runs. `.tools/edition-visual/results.json`. |
| Actual video decoding | PASS: all four H.264/AAC clips decode/play in Chromium at 390px, report 1764×1174 and supplied durations, and pause without a media error. `.tools/edition-video-playback.json`. |
| Source/code review | PASS: independent archive and React-pattern review, targeted lint, `git diff --check`. |
| Physical iOS/Android, Safari/WebKit/Firefox, real screen readers | NOT TESTED. Emulated Chromium is not physical-device evidence. |
| Spoken audio/caption review | NOT TESTED by a human. Original audio retained; no fabricated transcript/captions. |
| Hosted CI, preview deployment, production | PENDING / NOT TESTED. No merge or live deployment performed. |

The initial source check passed before final homepage edits; the complete check
above was rerun after those edits. Dependency installation initially found the
host's unsupported pnpm/Node versions; commands were corrected to the repository's
locked pnpm 11.19.0 and portable Node 24.21.0, with no lockfile change.

Next: review the draft pull request and the retained video audio, then perform
the separately authorized merge/release and fresh hosted/live verification.

## Asset receipt

The table below records the downloaded inventory and optimized derivatives.
Hashes establish file identity, not an independent rights audit.

| Supplied name | Delivered path | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| 2026 video 3.mp4 | `public/media/editions/2026/video-3.mp4` | 1764×1174 | 2945596 | `cfc5dd31eb739d7b3953a67e0988538ab19d0f870d591090ee0740033876c0b4` |
| 2026 video 2.mp4 | `public/media/editions/2026/video-2.mp4` | 1764×1174 | 3254182 | `8cbd746e1e917a5a21da9a482d8eb4a0f4b1ffaf4f4932c3422110432392d46f` |
| 2026 video 4.mp4 | `public/media/editions/2026/video-4.mp4` | 1764×1174 | 1985607 | `f2a22a9f49ebf6882284a5525247e3ce3fb373ec1702b2deb69909698f2cc7ce` |
| 2026 video 1.mp4 | `public/media/editions/2026/video-1.mp4` | 1764×1174 | 4496113 | `9b66106389f61b2b03ddce561570a7a6d46f417c8468600b40235c7041088fb1` |
| 2025 4.png | `public/media/editions/2025/photo-4.webp` | 1153×573 | 75570 | `e134501de4cfd31480be29e06e7e4079e2363565b46506fbb186db8f7c68c995` |
| 2024 2.png | `public/media/editions/2024/photo-2.webp` | 1333×820 | 77736 | `18587917fd70c6374419aee997fa3337c6bac2d4b4f8f4e0869236ab2ec5c6e4` |
| 2023 2.png | `public/media/editions/2023/photo-2.webp` | 753×633 | 47300 | `2841f76e996c93a0055abc5596a782e00fe48e7182fd6504d047da7c356f0d06` |
| 2026 9.png | `public/media/editions/2026/photo-9.webp` | 1663×1111 | 206964 | `d3e0829e009c5b4796e80fc40ca0fa54db01b3bb7c70427a27a97a92c94839b7` |
| 2026 8.png | `public/media/editions/2026/photo-8.webp` | 1505×969 | 116896 | `7043bc65285a1f46dcd3bde6a8a30d9ac1affd4fed82f6e1f163bce1bc20a1a9` |
| 2026 7.png | `public/media/editions/2026/photo-7.webp` | 1646×1092 | 93518 | `8a66f3472c9caea2b6537e73ea46e48ca4c5c1e52871e81b61a297e6c1acbb0a` |
| 2026 6.png | `public/media/editions/2026/photo-6.webp` | 1977×1109 | 201420 | `28bd1ba1ff3b257234c448b97e3fef0dd0af1bb68ee427d4a5168a33eaba064d` |
| 2026 5.png | `public/media/editions/2026/photo-5.webp` | 1535×1012 | 149176 | `a832152208fce534a992ca90ef174f73a060873b83aa5b762097efc428457c33` |
| 2026 4.png | `public/media/editions/2026/photo-4.webp` | 1733×1014 | 121898 | `3f1b3f07dad1446a1db858936ab7b4b08a977638b53776ea9815b45aeceada1b` |
| Build on an idea (2026).png | `public/media/editions/2026/build-on-an-idea.webp` | 1293×849 | 136816 | `90532bdedac1d620e89709bbc0efdfb0c421c720460a61df3c93053605c2cb47` |
| 2026 3.png | `public/media/editions/2026/photo-3.webp` | 1485×1109 | 164820 | `8f84d6940396a30f5f3a5b4c7ad7cf6088d7582b0e80de2b712604213d1ede13` |
| 2026 2.png | `public/media/editions/2026/photo-2.webp` | 1675×1109 | 140182 | `c6b050872d0ca59264f0ce5e11133551878552e86c163b7c9b61acf84c623427` |
| 2026.png | `public/media/editions/2026/photo-1.webp` | 1673×1106 | 131368 | `a48a738a90aa19c05203910fbec2c90d5fe14cefa8ceea5f6d1f294c17fa83bc` |
| 2025 3.png | `public/media/editions/2025/photo-3.webp` | 743×582 | 35674 | `62311665edc14895d0b8d5081177723e80f6efae3d894c012be219ff9abe72c1` |
| 2025 2.png | `public/media/editions/2025/photo-2.webp` | 1236×668 | 73298 | `e51cc984e459231a85363666e081add014f48051c9b64a78a637908585ed65b6` |
| 2025 1.png | `public/media/editions/2025/photo-1.webp` | 1346×904 | 144064 | `7856da3c0b6f3666f6c12413fcfbc1bdfe7250d4a76857bc44b7bc0429ce3418` |
| 2024.png | `public/media/editions/2024/photo-1.webp` | 1173×1026 | 75276 | `880cf1471ead9fc8e73116e8676750a4978aed249e85d3962c45def7916d238f` |
| 2023.png | `public/media/editions/2023/photo-1.webp` | 1424×874 | 145458 | `4fc8ad33d34382b3e266b8b46a159a07a2b348e472ccd1fd2d3c2f237c04458b` |
