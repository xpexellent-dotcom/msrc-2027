# Progress and session handover

**Snapshot: 3 October 2026. Update this file after each development task.**

## 3 October 2026 — ORG-013 participant verification and staff SMS policy

Explicit organizer override: participants require email+phone verification without MFA;
staff/admins use password then SMS OTP. Managed email/password remains primary sign-in.
ORG-013 supersedes current TOTP/optional-phone/no-SMS authentication requirements only;
the v0.5 source and dated earlier TOTP receipts below stay preserved. SMS outside
authentication, WhatsApp/push and other operational communications remain excluded.
The requester reported the earlier preview worked; new SMS/managed-provider/human
accessibility UAT is separate and remains unverified.

Fresh GitHub main is `59d82a6099166631722a8340db494fbb7506c430` (merged PR20);
PR19 remains open/draft/unmerged. Reused its isolated `staff-mfa-sessions` worktree/
`codex/staff-mfa-sessions` branch and merged current main (merge `0d7d727`), preserving
both auth and chapter-bar progress entries. Original main checkout's uncommitted
docs/reviews and the previous authorization worktree remain untouched.
Fresh main [CI37068248924](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37068248924)
reports success at59d82a6; this is a receipt check, not a new broad main runtime audit.

Current closed lab: simulated successful password step, separate participant email/SMS
verification with AAL1/no factor, and staff phone enrollment/challenge/verification with
SMS/AAL2. Ephemeral generated codes return only in the send response; server-held keyed
hashes, single-use/replacement/expiry, bounded retries, serialized verification/audit and
sanitized failure recovery. EN/AR/RTL, keyboard, Arabic digits, transient locale/retry
input and test inboxes replace QR/manual authenticator setup. No real password/phone
collection, delivery, account, invitation, grant or reset. Unused QR dependencies removed.

Authentication configuration records approved policy with live SMS provider/sender/budget/
expiry/resend/attempt/account/IP settings and recovery still unset. Server/database
assurance requires current password then exact managed `mfa/phone` proof and a current
verified phone factor. Participant email/phone confirmation grants no staff MFA. Trusted
adapter chooses SMS explicitly; AMR does not prove the delivery channel. Pending session
migration overrides the historical own-context RPC without changing/reapplying deployed
`20261002173712`. New `20261002193800` remains REVIEW ONLY. Participant72h and staff30min
idle/8h absolute remain; refresh never changes origin, staff cannot downgrade by edition.
All15 operational flags and both readiness flags remain false. No hosted mutation.

Verification checkpoint: `pnpm install --frozen-lockfile` PASS; `pnpm check` PASS with
lint/types/1073 units and42-page production build after review fixes. Full public browser
suite `pnpm test:e2e`:300 PASS/3 existing explicit skips; dedicated SMS browser initially
36 PASS, then expanded to48 for participant messages and periodic expiry/revocation
announcements. Expanded run42 PASS/6 test-fixture failures: a mock expiry was followed by
navigation that correctly restored the still-active real synthetic server session. Test
only corrected to restart from the displayed terminal state; final48/48 PASS (37.2s).
Auth error-context files contained test source only; credential-bearing automatic aria
snapshots/traces/screenshots are disabled, and explicit captures mask inbox/code fields.
Isolated CI database and new-head CI/Preview checks remain pending.
Review also fixed reauthentication clearing code-attempt cooldowns; three new regressions
PASS. Independent SQL/TS/source review found no actionable issue; it executed no DB tests.
`git diff --check` PASS. Fresh production auth-lab page/API404 and health200 confirm the
existing production boundary; no production deployment changed. Local Docker/SQL is
intentionally NOT TESTED. Human screen-reader/device, actual SMS delivery,
managed cookie/refresh, lost/changed phone recovery and production configuration UAT
remain NOT TESTED/BLOCKED. Earlier successful PR19 TOTP CI is not proof of this override.

Remaining release inputs: SMS provider/sender/budget/operating controls; verified
phone-loss/change/reset procedure and recovery approver/operator; recent-auth age and
warning lead; privacy/retention/location; live security-email provider/sender; production
plan/region/operational approvals; two intended administrators. Login addresses remain
private. Next smallest task is approved isolated managed password→SMS integration/UAT.
Rollback: stop local lab/clear opt-in to discard ephemeral state; revert application changes
if needed. No production SQL rollback is needed because the new migration is unhosted.
Details and manual review steps: [feature note](features/staff-security-foundations.md).
## 3 October 2026 — QA pass: Arabic visitors at the root, Event search data, sitemap x-default

Live sweep of www.msrc2027.com after PR 27: all 20 public pages (EN/AR) at 1280 px Chromium, Pixel 7 Chromium and iPhone 13 WebKit return 200 with one h1, the right `lang`, no console errors, failed requests, broken images, unnamed controls or horizontal overflow; axe (WCAG 2.2 AA + best practice) reports no violations; all 24 linked URLs return 200. Security headers, the apex and `.vercel.app` 308s, robots and sitemap are as ORG-013 set them. Changed:

| Found | Change |
| --- | --- |
| `msrc2027.com/` sent every visitor to `/en`, including browsers set to Arabic (`Accept-Language: ar-SA,…`), although the whole public site exists in Arabic | A second edge redirect in `next.config.ts`: when the browser's first language is Arabic, `/` → `/ar` (307). Everyone else, and requests without the header, still get `/en`, so English stays the default (LOC-01). No cookie or function is involved; a visitor who switches language keeps using the `/en` or `/ar` links |
| The homepage had no structured data, so search engines could not show the conference as an event with its dates | `src/lib/structured-data.ts`: a schema.org `Event` on `/en` and `/ar` with the name, lead, confirmed dates (ORG-001), Jeddah/SA, the organizer line and the OG image. No venue (until `conferenceConfig.venue` is set), times, prices, offers or capacities. `<` is escaped in the JSON. A schema.org `WebSite` (name "MSRC 2027", the kicker as alternate name, root URL) sits alongside it, so Google can show the site name instead of the domain |
| English ICU writes a same-month range as "27 – 28 January 2027" (About, meta descriptions, link previews, the OG image) while the hand-written copy everywhere else says "27–28 January 2027" | `formatConferenceDateRange` closes the spaces around the en dash only between two digits, so a cross-month range keeps them ("31 January – 1 February"). Arabic was already «٢٧–٢٨» |
| The 404 and error pages still said "this page has not been added to the preview" and "Return to the preview" (AR «المعاينة»), and every link-preview card (WhatsApp, X, LinkedIn) carried a gold "WEBSITE PREVIEW" badge, although ORG-013 made the site public | 404/error copy now points to the home page in both languages; the card shows `msrc2027.com` in place of the badge. The footer's approval note is unchanged (kept by ORG-013) |
| CI ran twice for every pull-request commit (`push` and `pull_request`), as the 3 October landscape pass noted | `.github/workflows/ci.yml` runs on `push` to `main` only; branches are checked through their pull request, and `workflow_dispatch` remains |
| Search snippets: Home, About and Dates lead with the dates, but Programme, Speakers, Participate, Workshops, Hackathon, 3MT, Media, Registration and Submissions used only their one-line lead (e.g. "Discover the people behind the scientific programme.", 52 characters, with no when or where) | `conferenceDescription` (`src/lib/metadata.ts`) gives them "27–28 January 2027, Jeddah. …" (AR «٢٧–٢٨ يناير ٢٠٢٧، جدة. …»), also used for the link-preview description |
| Visitors could read the confirmed dates but not save them | **Add to calendar** under the two days on Dates & venue (EN «Add to calendar», AR «أضف إلى التقويم»). It is a plain download link to `/en/msrc-2027.ics` or `/ar/msrc-2027.ics`, prerendered and working without JavaScript: one all-day event, 27–28 January (DTEND 29, exclusive), Jeddah, a link back to the page, a shared UID and a fixed DTSTAMP. There are no times, venue, organizer or attendees until confirmed. RFC 5545 escaping and 75-octet folding are in `src/lib/calendar.ts`. This is not a personal schedule builder: it holds the published conference days only |
| `/manifest.webmanifest` returned 404, so Android "Add to Home screen" fell back to a generic name and icon | `src/app/manifest.ts`: "MSRC 2027", the brand ivory, `icon.svg` and the 180px icon, and `start_url: "/"` (opens Arabic or English by browser language). `display: "browser"`: a shortcut only, with no offline mode, install prompt or notifications |
| `/en/programme` and `/en/participation` (spelling and long-form aliases) answered 307 *temporary* from a server function on every hit | They are now permanent 308 edge redirects in `next.config.ts` (`/:locale(en|ar)/…`, query kept), and the two page files are removed. `/fr/programme` stays 404 |
| Pages list `hreflang="x-default"` but the sitemap did not | The sitemap adds `x-default` → English for each page, matching the pages |

Tests: new `calendar.test.ts` (dates, exclusive end, no times, escaping, folding) and two `dates-venue.spec.ts` cases (link, download name, content type, body; 15/15 across desktop, tablet and mobile, including the page's axe scan); new `page-descriptions.test.ts`; new `launch-copy.test.ts` keeps "preview" out of the EN/AR 404/error copy and the card; `conference-dates.test.ts` now expects the exact EN and AR ranges and a spaced cross-month range; `public-indexing.test.ts` covers eight `Accept-Language` values at the root (Arabic first → `/ar`; English first with Arabic later, French, `arn-CL` and none → `/en`) and the sitemap's alternates; new `structured-data.test.ts` checks the Event facts in both languages, the absence of unapproved fields and the script-tag escape.

Verification: `pnpm check` PASS (ESLint, typegen/`tsc`, Vitest 903/903, `next build`). The local production build answered `ar-SA,ar;q=0.9,en;q=0.8` → 307 `/ar`, `en-US,en;q=0.9,ar;q=0.8` and no header → 307 `/en`, and served the Event JSON-LD on `/ar` and none on `/en/about`. Playwright `public-shell` and `qa-regressions`, Chromium desktop and mobile: 56/56. WebKit desktop and iPhone, `dates-venue` + `public-shell`: 27 passed, 5 failed. All 5 are `toBeFocused()` after Tab, the known WebKit Tab-focus limit on this Windows host noted on 3 October. The new calendar cases passed 4/4 in WebKit. Firefox: NOT TESTED (does not launch on this host). Rich-result eligibility in Google's Rich Results Test: NOT TESTED (needs the deployed URL).

Found, not changed: every 404 (`/en/zzz`, `/fr`, `/en/speakers/unknown`) is served as Next's empty `<html id="__next_error__">` shell with status 404, and the localized 404 appears only once JavaScript runs (blank with JavaScript off, and blank for ~2 s on a slow phone). A minimal Next 16.3.7 app and 16.3.8 behave the same for `notFound()` from an on-demand page; only unmatched URLs get server HTML. `global-not-found` (experimental) does not help: every path matches `[locale]`, and that page is prerendered once, so it cannot be localized. A fix would mean dropping the catch-all and `dynamicParams = false` on the shared root layout, and it would still miss in-route `notFound()` calls. Left for a framework fix or a deliberate routing change.

Found, not changed: on a throttled phone, `/ar` scores LCP 2.4–3.3 s and CLS 0.035–0.051, against 0.001 for `/en`. The only shift is the hero headline. When Noto Sans Arabic (162 KB, not preloaded) replaces the fallback at about 3.8 s, it rewraps from two lines to three and the bottom-anchored hero moves up 63 px. This is within the 0.1 "good" limit and depends on the device's own Arabic fallback. Options are an Arabic-only preload (next/font preloads per layout, so English pages would pay 162 KB), `font-display: optional` (a design change on first visit), or reserving three lines. Compare with Speed Insights field data for `/ar` first.

Requester note: the Arabic-first root redirect reads LOC-01's "English is the default" as the fallback. If the default must apply to every root visit regardless of browser language, remove the `accept-language` rule in `next.config.ts`.

## 3 October 2026 — Public search indexing, preview notice removed, one domain (ORG-013)

Google listed msrc2027.com as "No information is available for this page": every deployment sent `robots.txt Disallow: /`, a noindex meta tag and `X-Robots-Tag: noindex`. At the requester's request:

- Production only:
  - `src/app/robots.ts` allows crawling, excludes API, staff and review routes, and links the sitemap.
  - `src/app/sitemap.ts` (new) lists 10 public pages × EN/AR with hreflang.
  - `localizedPageMetadata` sets `index, follow` from `indexable` (`src/lib/metadata.ts`).
  - The noindex header in `next.config.ts` applies to non-production builds only.
- Registration and submissions keep noindex. Unlisted routes inherit the layout's noindex.
- `next.config.ts` 308-redirects three production `.vercel.app` hosts to www, keeping the path and query.
- The "Development preview" banner, its styles and the header's banner offset are removed. The header rests at 1rem (0.75rem on phones) and the hero is a full 100svh. The layout's fallback title is now "MSRC 2027 | Medical Students Research Conference".

Verification:
- ESLint PASS; build PASS; Vitest 892/892, including new `tests/unit/public-indexing.test.ts` for production versus preview robots, sitemap, metadata, headers and redirects.
- Full Chromium run: 312 passed, 4 failed. The failures were `premium-interface` still expecting the banner and a hero height that subtracted it; both fixed. The affected specs then passed 169/169 (17 skipped by design).
- A production-mode build (`VERCEL_ENV=production`) served:
  - `robots.txt` with `Allow` and the sitemap, and a sitemap with EN/AR alternates;
  - `/en` as `index, follow` with no `X-Robots-Tag`, and registration as noindex;
  - `Host: msrc-2027.vercel.app` → 308 to `https://www.msrc2027.com/ar/program?x=1`, while a branch preview host returned 200.
- Requester next step: add www.msrc2027.com to Google Search Console and submit the sitemap.

## 3 October 2026 — Scroll-linked homepage motion and a larger opening headline (ORG-012)

After ORG-011 the requester found that phone titles arrive "immediately" in place, so the intended feel was lost. They asked for smooth transitions and fade-ins on phone and desktop, pointing to faithibiza.com (Lenis/GSAP scrubbed reveals), armor-bd.com (headings that light up word by word) and dibiconference.com (fade-ups). They also asked for a clear, large opening headline.

- `ScrollScenes` (`src/components/scroll-scenes.tsx`) replaces `ChapterTitles`. On each animation frame it writes changed values only:
  - `--scene` / `--scene-eased` on each chapter stage;
  - `--leave` on the hero.
- `src/styles/scroll-scenes.css` replaces `chapter-titles.css` and turns those values into transform and opacity.
- Titles rise into place while their words light up in reading order, scrubbed by scroll, so scrolling up reverses them exactly. They have no pins, holds, timers, replay state or added height.
- `SectionHeading chapter` again renders numbered word spans (`--i`, `--n`) with an `aria-label`. ORG-011's copy, header docking and 2.3–3.1rem phone titles are kept.
- `Reveal`: content still below the screen at hydration waits, then fades up over 1 s with a 90 ms cascade. Its children animate, so the `.reveal` element itself never hides.
- Hero: 700 weight and about 51px on a 390px phone (was 600, 37px), up to 8rem on desktop. Its lines rise out of a fold on load; the hero drifts and fades as the first screen scrolls away, and the film zooms 8%. Skipped in the film view.
- Fixed in testing:
  - Off-screen dimmed titles failed axe contrast, so a title wholly below the screen stays as rendered.
  - Desktop growth widened 791px tablets to 804px, so growth applies from 1100px only and stages clip sideways.
- Tests:
  - `chapter-titles.spec.ts` was rewritten for every chapter in EN/AR on desktop and phone. It checks that a title is lowered and dim on entry, in place and lit at the reading line, and identical on scrolling back. It also checks unchanged page height and width, one-phrase names, direct `#legacy` entry, reduced motion, the hero size and fade, and the content fade-up.
  - `premium-interface` now expects the 1 s fade-up.

Verification:
- ESLint, `next build` and Vitest 888/888 PASS.
- Full Chromium run: 310 passed, 21 skipped, 6 failed. The 6 were axe contrast on dimmed off-screen titles and the tablet overflow; both are fixed above.
- After the fixes, 137/137 passed across `design-system`, `public-shell`, `chapter-titles`, `premium-interface`, `qa-regressions` and `brand-motion` (8 skipped by design).
- WebKit desktop and iPhone: 97 passed, 7 failed. All 7 are known harness limits on this PC: an iPhone full-page screenshot over 32,767px after axe passed, Tab focus, and the synthetic video fixture. The new specs pass.

## 3 October 2026 — Mobile homepage scroll and design refinement (ORG-011)

Requester authorized improvements to Claude's latest mobile design, up/down scrolling
fixes and heading wording. Implementation starts from remote main c10b2c5 in the attached
`mobile-homepage-polish` worktree; the original checkout's local documentation is preserved.

- Reproduced at 390×844, normal motion: scrolling up 72 px left the settled programme
  heading stationary; seven persistent title runways added 1,506 px after copy shortening.
- Headings now enter as a complete centered phrase, with modest bounded scale and no
  sticky hold or extra layout height. Completed/started motion does not replay on reversal,
  resize or preference changes. Fast flicks and fragments arrive in the natural layout.
- Shorter equivalent EN/AR titles; restrained phone header/menu styling, docking hysteresis
  and actual-height menu/anchor clearance. Phone chapter bar remains removed.
- Final Node 24 `pnpm check` PASS: lint/types/build and 888/888 unit tests. Production
  Chromium affected suite: 149 PASS/29 intentional SKIP/1 browser load failure; that
  exact film case passed 3/3 isolated repeats. WebKit desktop/iPhone: 68 PASS/18 SKIP,
  with two test keyboard-policy assumptions corrected; six iPhone navigation cases
  then passed 6/6. All new chapter motion/zoom cases passed in both engines.
- Final focused Chromium mobile rerun under Node 24: 18/18 PASS after the test correction.
- Inspected EN/AR phone/desktop frames and measured ten layouts at 320–1280 px with
  no document overflow. Full failure/rerun evidence is retained in the feature note.
- Scope: public presentation only (DSN-01/02, ACC-01, LOC-01/03, CMS-04). No infrastructure,
  database, media-approval or operational release gate changes. Live publication pending.

Evidence, known limits and rollback: [feature note](features/mobile-homepage-polish.md).
Next: review the finished design on an actual phone, then publish the reviewed change.

## 3 October 2026 — QA pass: landscape phones, favicon, Arabic display numerals

Live sweep of www.msrc2027.com after PR 21: all 24 public pages (EN/AR) return 200 with no broken internal links; axe (WCAG 2.2 AA + best practice) reports no violations at 390 and 1280 px; no console errors, page errors or failed requests in Chromium desktop or WebKit iPhone; EN/AR pages have the same structure; content stays visible without JavaScript; security headers are intact. Fixed:

| Found | Change |
| --- | --- |
| A phone turned sideways is ~340 px tall, and the fixed floating header covered 25–26% of it while reading (12% in portrait) | Below 500 px of height in landscape, the header is slimmer (its bottom edge sits 68 px down instead of 88) and steps aside while scrolling down. It returns on any scroll up, near the top, while the menu is open, and when focus moves into it (`site-header.tsx` `data-tucked`; `public-interface.css`). Portrait phones, tablets and desktop are unchanged; reduced motion drops the slide. Menu links are 48 px there so more fit |
| `/favicon.ico` still returned the 404 page (the 30 September pass added `icon.svg` and `apple-icon` only); browsers, bookmarks and link unfurlers that ask for it got nothing | `src/app/favicon.ico` (16/32/48 px, rendered from `icon.svg`) |
| On Arabic pages the intro art's edition number and the 2026→2027 year art were the only Western digits | `formatIndex(5)` gives «٠٥»; new `formatYear` gives «٢٠٢٦» / «٢٠٢٧». The MSRC 2027 wordmarks stay Latin |
| The intro art's flow lines did not mirror in Arabic, so they ran through the edition number while the atom mark sat alone | `[dir="rtl"] .intro-visual > .flow-lines { transform: scaleX(-1) }`, the same approach as the hero scrim; EN and AR are now exact mirrors at 390 and 1280 px |

Tests (`tests/e2e/qa-regressions.spec.ts`): `/favicon.ico` is served; a short landscape screen tucks and restores the header (scroll up and focus); a portrait phone keeps it in view; the display art uses each language's digits and the Arabic intro lines are mirrored. Against production before this change, the favicon, landscape and digit tests fail and the portrait test passes.

Verification: ESLint (`--max-warnings=0`) and `tsc` PASS; `next build` PASS; Vitest 888/888. Rebased onto `main` with PR 23 (shared `site-header.tsx` scroll handler merged by hand; the landscape rules set `--header-top`, so PR 23's measured menu height stays correct). Full Playwright Chromium run after the rebase: 313 passed, 31 skipped (by design), 1 failed on a Windows `net::ERR_NO_BUFFER_SPACE` page load; that spec then passed 18/18 on its own. WebKit desktop/iPhone for `qa-regressions`, `mobile-navigation` and `chapter-titles`: 54 passed, 16 skipped. The new tests: Chromium desktop/mobile and WebKit desktop/iPhone, 3 repeats each, 48/48. Firefox: NOT TESTED (does not launch on this Windows host).

Not changed (left for the requester):
- `msrc-2027.vercel.app` serves a full copy of production (canonical tags point to www). Redirecting it in Vercel's Domains settings would keep shared links on www.msrc2027.com; it is also the fallback address if the iPhone certificate warning returns.
- On a throttled phone (1.6 Mbps, 4× CPU) LCP is ~3.0 s; the 108 KB mobile poster shares the line with ~175 KB of JS and three Latin font files. A WebP/AVIF poster would help most but is a new derivative of approved media, so it needs media sign-off.
- GitHub: PR 2 (`codex/hosted-supabase-connection`) has no commits that are not on `main`; the repository's website field still points to the vercel.app address; CI runs twice per PR commit (`push` and `pull_request` both fire).

## 3 October 2026 — Chapter titles replace the phone chapter bar (ORG-010)

PR 20 went live and the requester rejected the phone chapter bar. They asked for each section's title to arrive "big and centered", then shrink to its own size and settle back into place, smoothly.

- Below 1100px the chapter bar is gone (`src/styles/chapter-titles.css`; `chapter-bar.css` is deleted). `SectionJourney` keeps only its desktop job: the current chapter and the one-click underline.
- Phones (≤700px, one-column sections): `ChapterTitles` (`src/components/chapter-titles.tsx`) stages each chapter title while it is still below the screen. `SectionHeading chapter` wraps the heading in a stage and renders one span per word.
  - Measuring: the title is laid out large in a hidden copy, centred and rewrapped only within its own line breaks, up to 1.8× and fitting 80% of the screen below the header.
  - Pinning: the heading is `sticky` in its stage. A runway gives the hold room and keeps the section's content clear of the large title. It is 155–438 px per chapter on 375×667, 390×844 and 430×932 phones, EN and AR, which makes the phone page about 1,900–2,200 px longer at 390×844.
- The settle (WAAPI on `translate`/`scale`, 1.2 s) has three beats: shrink while centred, slide across, drop into the lines. Because the large layout keeps each line's words together, no two words cross. Scrolling through the hold can only hurry it: it completes by 85% of the runway.
- Text is never hidden; it is only enlarged. Titles stay as rendered without JavaScript, with reduced motion, from 701px, and for chapters on screen or above at load. Staging waits for `document.fonts.ready`. Only a new width re-stages; the iPhone toolbar changes only the height.
- Fixed during tuning:
  - Words collided mid-flight when the large layout rewrapped freely.
  - The centred eyebrow (a full-width flex row) widened the Arabic page, so the phone layout viewport grew to 895px and every later chapter was measured off-screen. Stages now clip horizontal overflow and the eyebrow fits its content.
  - A reveal animation could move a heading onto its pin after scrolling stopped; a 250 ms re-check runs while a staged title is on screen.
- Static layout is unchanged. With reduced motion, every heading's box, text width and section height matches production on a 390 px phone and at 1280 px, EN and AR. On phones the page is 96 px shorter, without the bar.
- Tests:
  - `tests/e2e/chapter-titles.spec.ts` (new) checks each of the seven chapters, EN/AR. Rising: large, centred, inside its stage, page not widened. Pinned: it settles to its own size, at the start edge, with its own line breaks. It also covers the hurry, staging only below the screen, the reduced-motion/wide-screen fallback, one-phrase accessible names and axe.
  - `chapter-bar.spec.ts` is now desktop-only and checks that tablets show no bar.
  - The four `brand-motion` and one `cinematic-film` cases that click the bar skip on phones.

Verification:
- ESLint (repo) and `tsc` PASS; `next build` PASS; Vitest 888/888.
- Full Playwright Chromium run: 295 passed, 21 skipped, and 1 failure. The failure was a load flake: hydration took over 5 s in `qa-regressions` "Step inside" (mobile). It passed 16/16 on its own, and the hydration waits in my specs now allow 15 s.
- After the last tweaks, a rebuild ran the affected specs (`chapter-titles`, `chapter-bar`, `qa-regressions`, `brand-motion`, `premium-interface`, `cinematic-film`): Chromium 107 passed, 19 skipped (by design). WebKit desktop and iPhone ran `chapter-titles`, `chapter-bar`, `qa-regressions` and `premium-interface`: 60 passed, 8 skipped (by design). All eight chapter-title cases ran on the iPhone profile.

## 2 October 2026 — Phone chapter bar redesigned after requester review (ORG-009, PR 20)

The requester tried PR 18's floating pill and side panel on an iPhone and rejected it. Reaching a chapter took two taps (open, then choose), the in-page 2×3 index still looked out of place, and the bar's appearance and chapter changes needed to be smooth. Desktop is fine as it is.

- Below 1100px the index is now one swipeable row of chapter chips. It sticks 8–9 px under the floating header (`5.6rem` on phones, `6rem` on tablets), styled as a second deck of the header card (`src/styles/chapter-bar.css`). The pill, panel, their styles and their spec are removed.
- A purple highlight sits behind the current chapter and glides between chips (transform/width transitions). The row slides the current chip into the middle; in RTL one formula works because `offsetLeft` and `scrollLeft` both run negative past the start edge.
- One tap jumps to a chapter through the existing `Link`/`activateNavigation` path. The tapped chapter takes the highlight at once and keeps it for up to 1.5 s, so it never steps through the chapters in between.
- The first time the bar scrolls into view, its chips glide in with a 45 ms stagger. They are hidden only when the bar was below the fold at hydration, so server HTML and an on-screen bar never blank. Docking adds the header's shadow and a short settling motion. Reduced motion removes all of it.
- On touch, the tapped chip keeps `:hover`, so the current chip pins its colours.
- Probes on iPhone, Android and iPad Mini profiles, EN/AR: one row; docked under the header; the highlight aligned with the current chip, which stays in view for all six chapters in both engines; and a tap trail of `#participate → #legacy` with nothing between. The chapter eyebrow lands 39 px below the bar on phones and 107–123 px on tablets.
- Numbering: the bar called "Plan your visit" 06, while its section eyebrow reads "07 / Plan your visit", because section 06 ("Shared purpose", partners) had no chip. At the requester's choice (3 October) the bar gains 06 Partners / «الشركاء», so every chip matches its eyebrow, now asserted for EN and AR. The desktop grid takes seven columns and stays one row at 1100, 1280 and 1440 px. `#partners` gains `tabIndex={-1}` like the other chapter sections.

Verification: ESLint and `tsc` PASS. `tests/e2e/chapter-bar.spec.ts` (new) passed with `brand-motion` and `cinematic-film`, which click the index right after load: Chromium 61 passed, 1 skipped; the new spec in WebKit desktop and iPhone passed 4/4. Full run: Vitest 888/888, Playwright Chromium 294 passed, 3 skipped (duplicate tablet cases), WebKit `qa-regressions` + `chapter-bar` 30/30.

## 2 October 2026 — Bounded BL-AUTH-05/06 closed staff security foundations

Requirements: AUTH-04/05, ROL-12, SEC-01/02/06, LOC-01, ACC-01, ERR-01.
New isolated managed worktree `staff-mfa-sessions` on `codex/staff-mfa-sessions`
starts at remote main `eb4c5a005e84a5626e0d6e5bbf01115087810aaf`. Original main
checkout's uncommitted docs/reviews and previous authorization worktree are preserved.
Fresh main [CI 37053006357](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37053006357)
reports success; GitHub Vercel status reports successful deployment. These receipts
supersede the supplied main 14a58fb handoff for the starting Git state. Remote main
was rechecked at finish and remains eb4c5a0; this branch is not merged.

ORG-010 designates `ecemjggwlzqpjcwmchrl` Production; ORG-011 records first intended
Super Admin and two TBD, withholding login addresses; ORG-012 replaces participant
24h with confirmed 72h absolute maximum while preserving the original v0.5 snapshot.
Privileged 30min idle/8h absolute, recent-auth age/warning null and recovery/privacy/
security-email gates are recorded in current requirements and typed configuration.
Fresh read-only hosted history still has only 20261002173712; aggregate accounts,
editions, access accounts, grants and grant audit rows are all 0. No hosted mutation.

Implemented local-only bilingual/RTL synthetic TOTP QR/manual enrollment/challenge,
failure/retry, assurance and session revocation scenarios. Server-generated keys and
opaque HttpOnly synthetic cookie, strict Origin/512-byte exact JSON actions, no-store,
deployment 404 and disabled managed MFA contract. Approved session policy/evaluator and
review-only migration 20261002193800 add private session evidence, immutable origin,
revocation cutoffs and safe append-only audit. Public heartbeat does not touch idle;
private activity awaits successful authorized domain transactions. Consequential
maintenance/reset stays closed with unresolved recent-auth/recovery and false readiness.
No staff account/grant/real factor/email or operational module is activated.

Dependencies added and pinned: qrcode 1.5.4 and @types/qrcode 1.5.6; lockfile committed.
Node 24.21.0/pnpm 11.19.0 verified. `pnpm install --frozen-lockfile` PASS. Initial
typecheck/build exposed test-helper/RPC typing errors, corrected. `pnpm check` PASS:
lint, types, 1049 unit cases and 42-page production build. Initial browser execution
was BLOCKED by missing pinned Chromium v1243; `pnpm exec playwright install chromium`
PASS. Dedicated auth browser suite: 27/27 PASS across desktop/tablet/mobile, both
languages, real generated TOTP, retry, keyboard and axe. Six masked visual captures
were inspected. Full local public suite: 294 PASS, 3 explicit skips, 2 failures in
existing film/countdown timing checks; `playwright test --last-failed` rerun: 2/2 PASS.
Complete implementation-source [PR CI 37058469415](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37058469415)
and [push CI 37058461928](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37058461928)
at ff9d1d981f7d995f9b6f7a7c304a88796fed8963 both PASS. Actual application/database logs
inspected: lint, typecheck, 1049 unit cases, 42-page build, 296 public browser PASS /
3 explicit skips, 27 auth browser PASS, four pgTAP files / 245 assertions, three Data API
integration files / 16 PASS. Two integrations execute simultaneous expiry and locked
suspension attempts using actual parallel database connections; neither restores activity
or duplicates revocation evidence. Staff policy cannot downgrade across configured editions;
factor deletion/stale assurance, unauthorized reset and malformed subject fail closed.
`pnpm db:lint`, local security advisors (No issues found), generated types/strict compile
and stack stop PASS. Earlier CI exposed a test-fixture guard incorrectly requiring an
explicit local target; it stopped before writes. Corrected to accept the validated local
default while preserving GitHub Actions, loopback, exact project/container restrictions.
Its two concurrency cases then executed and passed. Fixtures survive only in the disposable
CI runner's Docker volume until runner teardown. Final documentation-only commit receives
its own automatic CI/Preview checks; see PR 19 for the latest exact-head receipts.
Local Docker/SQL is intentionally NOT TESTED; synthetic SQL runs only in GitHub CI.
Vercel Preview deployment 6817194861 at ff9d1d9 reports success:
https://msrc-2027-3thiijfj4-msrc2027.vercel.app. Runtime inspection is
BLOCKED by Vercel login protection and connector authorization (403); no bypass opened.
Local EN/AR preview on 127.0.0.1:3220 returned 200. Existing production lab page/API
returned 404; `/api/health` returned 200/static-foundation/workflows closed.
Production was not redeployed by this task.

Scoped draft [PR 19](https://github.com/xpexellent-dotcom/msrc-2027/pull/19) is attached
for review. The linked checklist has confirmed organizer decisions updated; feature
completion remains partial. [Feature note](features/staff-security-foundations.md)
records files/migration, local run instructions, UAT/configuration and rollback.
All 15 workflow flags and operational/privileged readiness remain false. Human real-app
MFA, screen-reader/device review, live provider exchange, saved-draft recovery and
production data/region/recovery approvals remain open. Next smallest task is approval
of recovery/recent-auth settings and isolated managed Auth UAT, before domain/CMS access.

## 2 October 2026 — Chapter navigation follows the reader on phones (ORG-009)

The requester sent an iPhone screenshot: below 1100px the homepage chapter index (a 2×3 grid on phones) sits in the page and scrolls away, so it was out of reach while reading; desktop keeps it sticky. A floating pill now appears once the index has left the screen. It shows the current chapter and opens the six chapters in a side panel, a modal `<dialog>` from the inline end, mirrored in Arabic. `SectionJourney` owns both, reusing its current-chapter tracking and the `Link`/`activateNavigation` path. The new styles live in `src/styles/chapter-dock.css`.

- The pill is hidden at the top, inside the index, at the footer, during the film view and the main menu, and in print. At 1100px and above it never renders.
- The panel opens focused on its title, so it is announced by name with no ring on the close button. Tab reaches the close button and the links.
- Choosing a chapter closes the panel, updates the URL, glides there (jumps with reduced motion) and focuses the section; the heading lands 138–140 px clear of the floating header on a phone.
- Esc, the close button or the backdrop returns focus to the pill. Safari does not focus buttons on tap, so this is done explicitly.
- WebKit truncated the pill label under an ellipsis rule; the labels are short, so it was dropped.

Verification: `tests/e2e/chapter-dock.spec.ts` passes in Chromium desktop and mobile and in WebKit desktop and iPhone, EN/AR (8/8). It covers the pill state, panel side and focus, axe on the open panel, Esc focus return, chapter arrival and header clearance, and leaving at the footer.

## 2 October 2026 — PRs 13/14 verified live; permission checks fail closed; paragraph wrapping

PR 14 (carrying PR 13) was merged by the requester at 17:29 UTC as `2ae066f`; the production deployment completed at 17:30 UTC. Live checks against www.msrc2027.com:

- Uncached routes (`/en/media`, `/ar/program`, `/api/health`) answer via `bom1::bom1`; before the release they crossed to `bom1::iad1`.
- Hero film and posters carry `max-age=2592000, stale-while-revalidate=86400` (was `max-age=0, must-revalidate`).
- Analytics and Speed Insights scripts load on production. An automated browser sent no beacon and no write request. A signed-in desktop Chrome visit to `/ar` sent the pageview (200), and the Vercel dashboard (Production) then showed 1 visitor, Saudi Arabia, desktop, on `/ar`.
- `/ar/media`: 1ch measures 0.556em (0.5em before), and first-load desktop CLS is 0.018 (0.206 on production before the release).

Permission evaluator (BL-SEC-01, ENG-009): `switch (rule.check)` had no `default`, so a check kind added to the contract without a matching case would have fallen through to "allowed". A `default` branch now fails type-checking (`never`) and denies at runtime. To confirm, a temporary extra check kind in `contract.ts` made `tsc` fail with TS2322 at the new branch; it was then reverted. The 440 contract unit cases pass unchanged; the eight existing kinds behave as before.

Paragraph wrapping: on the live site 41 of 490 multi-word paragraphs and list items (desktop and phone, EN/AR, 12 pages each) ended with one word alone on the last line, among them «بحثية.» in a Submissions paragraph on phones. `p, li { text-wrap: pretty; }` beside the existing heading `balance` rule leaves 4, all English. Browsers without support keep greedy wrapping. An e2e check confirms the computed style where supported.

Flaky test: CI for this PR failed once in `cinematic-film.spec.ts` ("ar browser Forward reopens the film…"): expected scroll 4155, received 4102; the twin run passed. The test captured its origin before clicking, while the `#legacy` scroll can still glide with motion allowed and actionability can scroll before the click. Replaying it with 6× CPU throttling, the page moved 88–141 px between that capture and the real click, and the app restored exactly the click-time position in 12 of 12 runs. The test now captures the activation position as its participation-chapter twin does. The Forward tests passed 60/60 with 10 workers, and the whole film spec passed (27, 1 skipped).

## 2 October 2026 — Closed persisted authorization and reviewed deployment

Scope: requester authorizes checklist review, the next recommended engineering actions
and deployment of reviewed application schema/permissions. Read current source/backlog,
reviewed BL-SEC-01 PR15 at exact head `e297c86`, and merged it as `7ce3112` after the
final-head application/database CI had passed. The connector could read PR15 but its
ready-transition lacked integration permission; the already authorized Git Credential
Manager credential completed the transition and guarded merge. No credential was printed.

Implementing the smallest BL-AUTH-01 slice: private edition/account-access/scoped-grant/
audit metadata, a self-only current managed-session/TOTP RPC and a server-only bearer
identity/context adapter. No initial edition, account, grant or audit row; no participant
profile, domain schema, Storage bucket, invitation, email, staff UI, CMS or workflow opening.
The returned context has `session.active:false`, `operationalAccessReady:false` and
`privilegedAccessReady:false`; it cannot activate the earlier authorization evaluator.
Full domain AuthorityReader integration and AUTH-04/05 lifecycle enforcement remain later.

Fresh hosted preflight: selected project `msrc / ecemjggwlzqpjcwmchrl` has zero Auth users,
application tables/private authorization schemas and migration history. Asked whether this
project is development/staging or reserved for production, and for the three named Super
Admins. No answer is inferred; live data/staff activation stays closed under CFG-09/10/11.
Reviewed empty additive schema work creates no operational authority or participant data.

Initial checks: `pnpm typecheck` first found a nested parser narrowing error, corrected;
rerun PASS. `pnpm lint`, existing 739 unit tests and `pnpm build` (40 pages) PASS before
the new identity tests were added. Actual-schema SQL and final complete checks are pending;
hosted migration NOT YET APPLIED at this point. ENG-010 and the
[feature note](features/persisted-authorization.md) define acceptance and rollback.

The checklist was updated/read back at sequence14: PR15 reviewed/merged and BL-AUTH-01
in progress; no deployed schema or staff activation is claimed. Original checkout's
uncommitted documentation remains untouched; implementation uses the attached managed
authorization worktree on `codex/persisted-authorization`.

Next: run final application/actual-schema CI, adversarially review the migration, deploy
only the approved empty application migration, verify hosted ACL/RLS/anonymous denial
and record receipts. Do not upload the earlier synthetic foundation migration/seed.

Final local application verification: `pnpm check` PASS (lint, types,859 unit tests,
40-page production build). New coverage:103 identity/context cases and17 hosted-probe
cases. `pnpm test:e2e tests/e2e/closed-workflows.spec.ts tests/e2e/public-shell.spec.ts`
PASS:43 Chromium desktop/tablet/mobile cases including EN/AR/keyboard/axe/reduced motion.
Added66 actual-migration pgTAP assertions, including independent ACL/RLS, own-context,
current managed user/session/TOTP, grants/scopes/history and transactional audit failure.
`pnpm exec supabase test db supabase/tests/database/persisted_authorization.test.sql`
was attempted and BLOCKED by ECONNREFUSED at127.0.0.1:54322 (no local engine).
No hosted fixture was used. Database lint now includes public and private schema functions;
CLI help confirmed the comma-separated `--schema` argument. CI runtime result pending.

Read-only hosted role preflight confirmed `current_user` and `session_user` both postgres,
and zero managed accounts/public application tables. Independent security review found no
blocking issue in the closed migration/app boundary; real staff activation, named-human
maintenance attribution, account-status audits, full AUTH-05 lifecycle and actual MFA UAT
remain explicit follow-ups. TOTP factor name/status maintenance updates `updated_at`; the
current timestamp check conservatively requires fresh challenge evidence after those
changes. It does not replace future audited reset/recovery and session revocation.

Checklist factual refresh at sequence15: PR13 is still open/conflicted at632ed46, but its
latest CI37037534134/37037529901 and Preview6813734225 passed. Its Mumbai code and stale
Dubai wording/privacy review remain a separate PR13 follow-up. Fresh main7ce3112 CI
37038741543 passed and Production6813936431 succeeded. Live health returns200/no-store/
closed; full Vercel settings/complete live UAT are not claimed. No PR13 changes here.

Deployment receipt: [PR16](https://github.com/xpexellent-dotcom/msrc-2027/pull/16)
at `9ce0ef1` passed the full [workflow37041065012](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37041065012):
lint/types,859 units,40-page build,284 browser cases PASS/3 explicit skips,
176 pgTAP assertions (66 actual-schema +90 prior contract +20 foundation),10 client
integration tests, public/private schema lint, local security advisors, generated strict
types and stack shutdown. [Database job110951022267](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37041065012/job/110951022267)
actual logs show the new migrated-schema suite passed; no local PC Docker is needed.
The synthetic SQL suite was executed only in isolated GitHub CI and rolled back.

After independent review and the successful exact-source CI, the authorized Supabase
connector applied ONLY `persisted_authorization` to `msrc / ecemjggwlzqpjcwmchrl`.
Hosted history records version `20261002173712`; the committed migration filename was
aligned to that observed version without changing SQL. Original CLI-generated filename
was `20261002165850_persisted_authorization.sql`; SHA256 remains
`F1569BD4A58F17488094092D02BD78ABCF03BF0B500576B84D5B84E0A9EB39D5`.
No historical foundation fixture/seed, account, edition, grant or bucket was deployed.

Hosted verification executed the four read-only statements in
`supabase/verification/persisted_authorization.sql`: all4 private tables have enabled+
forced RLS; anon/authenticated/service_role schema/table/internal-function access is false;
only authenticated can execute the fixed-search-path own-context RPC. Aggregate counts
are all0: managed accounts, editions, account access, grants, grant audit and public tables.
Hosted history is1 migration. The real anonymous API probe returned HTTP401 with42501:
`node --env-file=<original checkout>/.env.local scripts/verify-hosted-authorization.mjs`
PASS. The original ignored environment was read without copying/printing its key.
`pnpm db:verify-authorization-hosted` is the reproducible normal-checkout command.

Hosted advisor results are NOT clean: security has1 WARN for the intentional authenticated
self-only SECURITY DEFINER RPC and4 INFO for private RLS/no policy; performance has3 INFO
for unused indexes on the empty schema. See the reviewed rationale and
[remediation reference](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
in the [feature note](features/persisted-authorization.md). Local CLI advisors reported
no findings, but do not supersede the hosted provider's newer advisor. No grants were
widened or indexes removed to silence findings. Before activation, review the narrow
exception again alongside actual staff/session/domain policies.

Production staff/participant workflow access remains closed. Named-human MFA/session/
recovery UAT, full AUTH-05 enforcement, authoritative domain resource readers, Storage
and retained-data/production approvals remain NOT TESTED/OPEN. Environment classification
and the three named Super Admins remain unanswered; no value was assumed. Next smallest
slice: BL-AUTH-05 controlled staff TOTP enrollment/recovery and session lifecycle, including
named performer/account-status audits, before BL-CMS-01 draft editing.

Final filename-alignment CI37042359894 at75795fac passed application and database jobs.
Before PR16 could merge, PR14 changed main to2ae066f. Merge preserves its Arabic font/
layout-shift fix, observability/cache/region changes and complete decision/progress records.
The authorization SQL remains unchanged. Combined-tree `pnpm install --frozen-lockfile`
and `pnpm check` PASS: lint/types,888 units and40-page production build.
`pnpm test:e2e tests/e2e/closed-workflows.spec.ts tests/e2e/public-shell.spec.ts tests/e2e/qa-regressions.spec.ts`
PASS:67 desktop/tablet/mobile EN/AR/keyboard/axe/reduced-motion/font/media cases.
Independent combined-tree authorization review found no blocking regression; git diff
check PASS. Final combined-source CI/Preview must pass before the guarded PR16 merge.

## 2 October 2026 — Arabic webfont: a steady `ch`, no layout jump

First visits to Arabic pages jumped when Noto Sans Arabic arrived: desktop CLS 0.208 on `/ar/media`, 0.065 on `/ar/dates-venue` and 0.011 on `/ar`, against 0.002 on English pages. The cause was the `ch` unit, not the letter shapes. The Arabic subset has no "0" glyph, so once it loaded as the first available font, browsers measured 1ch as 0.5em instead of the fallback's 0.556em (Arial's zero). Every `ch`-based measure (37 `max-inline-size`/`max-width` rules) narrowed by a tenth after first paint. Headings authored as two lines with `\n` («ملتقى / العقول الفضولية.», «كن جزءًا / من الفصل القادم.», «لحظات نعود إليها. / وأفكار تبقى معنا.») then broke again into three or four lines.

Change: one `declarations` entry gives the `next/font` Arabic face fontsource's Arabic-subset `unicode-range`, which leaves out the space. The fallback face then stays the first available font and 1ch never changes. The file draws no Latin character except the space, so Arabic spaces become 0.278em instead of 0.26em. A unit test fails if the range covers the space, a Latin digit or a letter. An e2e test checks that 1ch stays above 0.52em after the font loads, and that the three headings keep their authored two lines on desktop.

Layout shift on first load (local production build, median of 5): unthrottled desktop `/ar/media` 0.208 → 0.002, `/ar/dates-venue` 0.065 → 0.002, `/ar` 0.011 → 0.002. Slow 4G (1.6 Mbps, 150 ms) with 4× CPU: desktop `/ar/media` 0.199 → 0.018, `/ar/dates-venue` 0.068 → 0.006, phone `/ar` 0.020 → 0.003. English unchanged.

Not adopted: preloading the Arabic font on Arabic pages only (served from `public/`, since `next/font` exposes no URL). With the range fix in place it gave no CLS benefit under throttling and delayed LCP by 160–300 ms, because the 166 KB font competed with the hero poster.

Visible effect: Arabic measures now always use the width visitors saw before the font loaded. On desktop, 8 of 12 Arabic pages re-wrap, mostly to fewer lines; the three headings above show their authored two lines, as in English. On phones, 2 of 12 change: the home lead fits one line, and one Submissions paragraph wraps to three lines because of the wider spaces. No clipped text at 320 px or 1280 px, and no horizontal scroll at 320 or 375 px on any Arabic page.

Verification: ESLint and `tsc` PASS; Vitest 308/308; build PASS (the generated face carries the range); Playwright Chromium desktop/tablet/mobile 288 passed, 3 skipped; WebKit desktop and iPhone `qa-regressions` 24/24. Against production the new e2e test fails as expected: 1ch measures exactly 0.5em.

Also checked live after PR 12: 24 pages crawled with no broken link or anchor; axe finds no violations on `/en`, `/ar`, `/en/dates-venue` and `/ar/media` at 390 and 1280 px; the centred Step inside cue keeps at least 14.3:1 over every sampled film frame (4.5:1 needed).

Live LCP on a throttled phone (Slow 4G, 4× CPU) for reference: `/en` 2.6 s and `/ar` 3.0 s (the hero poster, already `fetchpriority=high`), About and Media about 1.9 s (the heading). NFR-02 asks for 2.5 s at p75 on agreed hardware and network; Speed Insights (ORG-008) will report the field values.

## 2 October 2026 — BL-SEC-01 authorization contract

- Requester authorized the next bounded engineering PR: 13-role/scope/current-authority
  contract, synthetic permission fixtures, failure/language/audit requirements and tests.
  Source IDs ROL-01–12, SEC-01/02/06, AT-02; ENG-009 and the
  [feature note](features/authorization-contract.md) record scope and integration gates.
- Implemented frozen purpose rules, server-only fresh-reader checks, generic bilingual
  errors, ownership/edition/track/function/assignment enforcement, current revocation,
  TOTP assurance, self/co-author/conflict denial, original-evidence restrictions and
  locked/unpublished/unavailable controls. No domain payload is returned.
- Added independently expected role/action unit matrix (440 targeted cases PASS) and
  rollback-contained SQL RLS/grants/view/function/private-metadata fixture. Existing CI
  automatically discovers both. Type-check initially found a union callback narrowing
  error; fixed and rerun PASS. Final review also separated review/event assignments and
  assignment-bound grant stages; 29 regression cases passed. Full local checks passed;
  SQL verification and full browser checks passed in isolated CI.
- No production identity/reader/grant system, migration, actual Storage/file link or audit
  writer implemented; all 15 operational workflows stay hard closed. Human/domain-owner,
  real identity/MFA/session and per-feature RLS/Storage UAT remain later release work.
- Worktree based on remote main `017220e` preserves the original checkout's uncommitted docs.
  No production service, DNS, secret, email, workflow opening or public-interface change.

Verification (Node 24.21.0/pnpm 11.19.0): locked install PASS; `pnpm check` PASS
(lint, types, 739 unit tests including 440 new cases, production build with 40 pages).
`pnpm test:e2e tests/e2e/closed-workflows.spec.ts tests/e2e/public-shell.spec.ts` PASS:
43 desktop/mobile Chromium tests, including EN/AR keyboard, axe and reduced motion.
`pnpm db:test` BLOCKED: connection refused at 127.0.0.1:54322; no running Docker
engine/WSL. Initial offline install missed an uncached font tarball; normal locked install
passed. [Draft PR15](https://github.com/xpexellent-dotcom/msrc-2027/pull/15) at code commit
`39877f2` has [database CI job110917372506](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37030963194/job/110917372506)
PASS: actual logs show 110 pgTAP assertions (90 authorization +20 foundation), 10 Data API
integration tests, reset/lint/security advisors/generated strict types and stack shutdown.
Only the existing foundation migration was applied. [Vercel Preview](https://msrc-2027-czvn6thf8-msrc2027.vercel.app)
deployment 6812599008 reports success; no Production deployment or new UI. Fixtures do not
establish live grants. [PR workflow37030963194](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37030963194)
and [push workflow37030920867](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37030920867)
both PASS at code commit `39877f2`. Application logs confirm lint/types, 739 unit tests,
40-page production build and 284 browser tests PASS /3 explicitly skipped.

CI commands actually executed: `pnpm install --frozen-lockfile`, `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm exec playwright install --with-deps chromium`,
`pnpm test:e2e`; loopback Docker network creation, `pnpm db:start`, `pnpm db:reset`,
`pnpm db:lint`, `pnpm db:test`, `pnpm exec supabase db advisors --local --type security --level warn --fail-on error`,
`pnpm db:types` plus standalone strict `tsc`, `pnpm db:env`, `pnpm db:integration`,
`pnpm db:stop`. Security advisors returned no issues on the standing foundation schema
after fixture rollback; the advisor pass does not inspect the removed test schema or
validate hosted policies/actual Storage. `git diff --check` PASS.

The later documentation-only receipt commit does not change the tested code. No new
dependencies, migration, environment values or hosted configuration; no manual hosted setup.
Human/domain-owner and actual session/MFA/storage UAT NOT TESTED. Original user work preserved.

The feature checklist was updated and read back at sequence11: PR15 remains draft/partial
for live authorization; the synthetic contract and database results are linked, with M4
identity, persisted grants, TOTP, per-feature RLS and actual Storage access still pending.

Next smallest PR: BL-AUTH-01 current persisted grant/identity integration, followed by
BL-AUTH-05 privileged TOTP enrollment/recovery before CMS/staff activation. M3 legal/brand
content and affected-phone Safari diagnosis remain independent follow-ups.

## 2 October 2026 — Visitor analytics, Speed Insights and hosting efficiency (ORG-008)

PR 12 (the 1 October QA pass and ORG-007) was merged by the requester at 14:11 UTC as `017220e`. Live check: the hero caption is gone in both locales; the Step inside cue is 0 px off centre on desktop and phone; with motion allowed it glides (scroll samples 0→103→641→815→880→900 px) and focuses the dates band, with reduced motion it jumps; on phones the band stops 72 px below the top, clear of the header.

| Change | Why | Evidence |
|---|---|---|
| Vercel Web Analytics and Speed Insights, on the production deployment only | Requested; both were already enabled in the dashboard and waiting for the packages | A `VERCEL=1` build injects `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` once per page, reports route patterns (`/[locale]/media`) and registers the `beforeSend` hooks before any event. A normal build contains neither, so CI and local runs make no `/_vercel` requests |
| Addresses sent without query string or fragment; only public information pages counted; automated browsers send nothing | PRV-03; tests against deployments must not count as visits or make write requests | Six unit cases. With `navigator.webdriver` the probe recorded no non-GET request |
| Functions in `bom1` (Mumbai) instead of `iad1` (Washington, D.C.) | Requests from Saudi Arabia enter at the Mumbai edge; uncached pages then crossed to `iad1` and took 0.42–0.48 s to first byte versus about 0.21 s for cached pages | Live before: `/en/media`, `/ar/media`, `/en/program`, `/api/health` answered via `bom1::iad1`. `dxb1` (Dubai) is listed in the dashboard, but the first preview with it failed: "Invalid region" |
| Film and posters cached by browsers for 30 days | They were served `max-age=0, must-revalidate`, so every visit revalidated 2.8 MB before the hero could play | An e2e test checks all four files; pages keep their own caching |

Verification (Node 24.21.0): ESLint zero-warning, `next typegen` and `tsc` PASS; Vitest 305/305; `next build` PASS with and without `VERCEL=1` (40 pages, the same static and dynamic routes); Playwright Chromium desktop/tablet/mobile 286 passed, 3 skipped (duplicate tablet cases).

On the PR 13 preview, in a signed-in desktop Chrome: both scripts load with 200 from project-specific same-origin paths (Vercel sets them; `/_vercel/*` is only the fallback), and the pageview beacon returns 200. A client navigation to `/ar/program?day=2&email=…#session` sent the address `/ar/program`, without query, fragment or email. `/ar/media`, `/en/program` and `/api/health` answered via `bom1::bom1`, and `/media/` files carry the 30-day header. Afterwards, following ChatGPT's analytics review, collection was limited to the production deployment and to public information pages (`countedSections`); previews no longer load the scripts, so this preview evidence predates that change.

Vercel settings reviewed in the dashboard and left as they were: Fluid compute on; Node.js 24.x (matches `engines`); Prioritize Production Builds on; Vercel Authentication protects previews; source maps protected; Web Analytics and Speed Insights enabled; firewall bot protection off and AI crawlers allowed (a challenge would also stop link previews and automated QA). The Hobby plan allows one function region.

Worth considering with the requester (not changed):
- **Deployment Checks:** hold each production deployment until GitHub's "Foundation checks" pass, so a broken merge never reaches the public site. Production then updates about 8 minutes after a merge.
- **At the Pro upgrade:** Skew Protection (visitors with an open tab keep working across deploys), concurrent builds (two agents push branches), Spend Management alerts, longer log and analytics retention, custom analytics events (for example film plays), password-protected previews if outside reviewers need access.
- **Uptime alerts (INF-08):** an external monitor on `/api/health` with email alerts to named owners, such as Checkly from the Vercel Marketplace. This needs the organizers' own account.
- **Launch-time firewall:** consider Bot Protection in log mode first, and decide whether AI crawlers may read the public site.
- **Hobby allowances:** usage for 2 September–2 October was 1.02 GB fast data transfer, 20K CDN requests, 1.7K function invocations and 2 h 8 min build CPU, far inside the plan. Analytics and Speed Insights events count against monthly allowances too; check the Usage page as registration and the event approach.

Known issue measured in this pass: on a first visit, the Arabic webfont (166 KB, `preload: false`) swapped in after first paint and re-wrapped Arabic headings (desktop CLS 0.21 on `/ar/media`). Fixed in the section above.

## 1 October 2026 — QA pass: Arabic typography and wording, counted numbers, a test race

Live QA of www.msrc2027.com, before and after PR 11, and of `main` at `e70bf38`. Covered EN/AR on Chromium and WebKit (Safari and every iOS browser). Scope: CSS for a few hero labels, two display helpers, Arabic copy and tests. No date, clock rule, workflow, media, route or navigation change.

| Finding | Change |
|---|---|
| WebKit pulls letter-spaced Arabic apart. On phones the hero kicker «المؤتمر الخامس لأبحاث طلاب الطب» (0.09em, `!important`), the hero caption and the film provenance «نسخة ٢٠٢٦» (0.06–0.1em) showed broken joins on iPhones, at 10.1–10.6 px | `[lang="ar"]` overrides remove the tracking. Phone sizes rise to 0.75rem in Arabic only. A regression test fails if any Arabic word on six Arabic pages has non-zero letter-spacing; it failed on production before the fix |
| The nine new pages titled tabs and link cards with a bare label ("Programme", «البرنامج») | `siteTitle()` gives "Programme \| MSRC 2027", as on About and Dates & venue. Session and speaker detail pages use it too; they are NOT TESTED in a browser because no records are published yet (types and build only) |
| Film view: the title «فيلم مقدمة مؤتمر ٢٠٢٦» ("film of the introduction of conference 2026") differed from the media page's «الفيلم الافتتاحي», and the instructions said «اضغط Escape» and «بالمسافة أو الإدخال» | «الفيلم الافتتاحي لمؤتمر ٢٠٢٦». The instructions now use «مفتاح Esc» and «مفتاح المسافة أو الإدخال», as the hero video's do |
| English spelling: the site follows Oxford spelling ("Programme", "catalogue", "organizer", "finalized"), but the Dates & venue button read "Explore the program overview" and the homepage "Organised by …" | "programme overview", "Organized by …" |
| Homepage venue label «مكان انعقاد المؤتمر» versus «مقر المؤتمر» on Dates & venue and «المواعيد والمقر» in navigation | «مقر المؤتمر» |
| Six of the fifteen footer entries (Teams, Sponsors, Announcements, Contact, Privacy, Terms) are unpublished non-links. They differed from real links only by ivory versus pale lilac, so phone users tapped them to no effect. DECISIONS asks for "labelled non-links" | A visible "Soon" / «قريبًا» pill, which also joins the accessible name ("Contact Soon"). Arabic size 0.7rem, no tracking |
| Printing: browsers drop background colours, so light text on the dark sections and footer printed near-invisible. The fixed floating header repeats over every printed page in Chromium, and the hero filled the first page | `src/styles/print.css`: content in black on white, without the header, banner, chapter bar, footer, film and header clearance. A regression test checks four pages in print media and fails on production |
| A structural EN/AR parity check of all twelve public pages found matching headings, links, sections and controls. The only English-only text on an Arabic page was the speakers artwork label "MSRC / PERSPECTIVES"; the matching legacy artwork already uses «الفصل القادم» | «MSRC / وجهات نظر», untracked at 0.75rem in Arabic |
| ORG-007 (requested 2 October with an annotated screenshot): centre "Step inside", make it a scroll option with a smooth animation, and remove MSRC2026 | One centred cue with a gold segment looping down its line. A click glides to the dates band below the hero (`#essentials`), focusing it; reduced motion shows a static line and jumps. The hero caption is gone, while the film view and previous-edition section keep the MSRC 2026 identification. On phones the band stops below the floating header. Eight regression cases (EN/AR, both motion settings, desktop and mobile) |
| On phones the hero date/city line wrapped and left its "·" dangling at the end of the first line (EN/AR) | The two items stack under 700 px without the separator |
| The hero lead left a one-word last line («جديدة.», "discoveries.") | `text-wrap: pretty`. Chromium and WebKit now break at the sentence: «طلاب طب. أفكار نتشاركها. / واكتشافات جديدة.» and "Medical students. Shared ideas. / New discoveries." Browsers without support keep today's wrapping |
| Session and recording durations printed a fixed «دقيقة» after any number, so a 3MT talk would read «٣ دقيقة» | `formatMinutes()` uses CLDR counted forms in Arabic («دقيقة», «دقيقتان», «٣ دقائق», «٤٥ دقيقة»). English stays "45 min" |
| Programme and media result counts (live region) were built as number plus a fixed «نتائج» or "results", giving «١ نتائج», «٢ نتائج», «١١ نتائج» and "1 results" once records are published | `formatResultCount()` picks the CLDR category: «نتيجة واحدة», «نتيجتان», «٣ نتائج», «١١ نتيجة», «١٠٠ نتيجة», and "1 result" / "2 results". Twelve unit cases cover every Arabic category |
| The countdown's Arabic day unit used plural categories only, so the final day would read «٠ يومًا» and 100–102 days (from 17 October) «١٠٠ يومًا» | `countdownDayUnit()` takes the counted noun from CLDR unit parts: ٠ يوم, يومان, ٣ أيام, ١١ يومًا, ١٠٠ يوم |
| Countdown labels «اليوم الأول اليوم»; the timer's name read the ISO string `2027-01-27` digit by digit | «اليوم هو اليوم الأول/الثاني للمؤتمر»; «… حتى بداية يوم ٢٧ يناير ٢٠٢٧ …» and "Time until 27 January 2027 begins …" |
| Hackathon: «النموذج الأولي مشجّع» says the prototype is *encouraging* | «يُستحسن تقديم نموذج أولي، وهو اختياري.» |
| «بما فيهم المشاركون الدوليون» uses the form for things, not people | «بمن فيهم …» |
| Registration and workshop steps «أتمّ الدفع أو خصمًا …» told readers to "complete a discount" | «أتمّ الدفع أو استخدم خصمًا …» |
| «التفاصيل القادمة في الطريق» is redundant. The eyebrow «والحوار مستمر» opens with a conjunction. The new pages' breadcrumb «مسار التصفح» differs from About and Dates («مسار التنقل») | «المزيد من التفاصيل قريبًا», «الحوار مستمر», «مسار التنقل» |
| Homepage wording issues: «المعلمين» for educators reads as school teachers. «خطط لزيارتك» without shadda can read as a noun, and the chapter bar has «خطّط». The FAQ's «وبحد أقصى طلبين نهائيين …» is ungrammatical | «الأكاديميين», «خطّط لزيارتك», «ولكل باحث رئيسي طلبان نهائيان كحد أقصى …» (the submissions page wording) |
| Dates & venue: «أين نلتقي.» reads as a question, «مواعيد الجلسات لاحقًا.» is telegraphic, and a paragraph repeated its own button | «حيث نلتقي.», «مواعيد الجلسات تُعلَن لاحقًا.», «تعرّف إلى ما ينتظرك في المؤتمر.» |
| `countdown.spec.ts` (tab suspension) installed the fake clock 1 s before `pauseAt`. Real-time load and hydration made `pauseAt` land in the past on a busy machine (3 local failures) | The clock starts 30 s earlier, and the asserted values are unchanged. 108/108 repeated runs passed alongside another agent's suite |

Verification (Node 24.21.0):
- ESLint zero-warning, `next typegen` and `tsc` PASS.
- Vitest 299/299, including 18 day-unit, 11 minute and 12 result-count cases.
- `next build` PASS: 40 pages.
- Playwright Chromium desktop/tablet/mobile: 276 passed and 3 skipped (duplicate tablet cases). A single earlier 404-heading timeout happened under load; it passed 18/18 on repeat.
- WebKit desktop and iPhone, `qa-regressions` and `countdown`: 22/22.
- iPhone-profile screenshots confirm joined Arabic labels, the stacked date/city line and the sentence-level lead breaks.

Checked on the live redesign without change:
- **axe (WCAG 2.2 AA plus best practices):** no violations on Home and the nine new routes, in EN/AR at 390 and 1280 px. "Needs review" contrast items are text over the film or gradients.
- **Hero text over the 18.7 s film:** every text element was measured over 10 frames at 1440/1280/390 px. The worst case was 5.16:1 for the 42 px title on a phone (3:1 needed); small text was at least 5.91:1.
- **Layout shift on a phone (Slow 4G, 4× CPU):**
  - Before PR 11, the countdown in the hero swapped from the 110 px dates card to the 286 px clock at hydration: CLS 0.118 Arabic and 0.027 English. A stand-in was built and verified, then dropped because PR 11 moved the countdown below the first viewport.
  - Live now: 0.0006 English and 0.041 Arabic. The Arabic remainder is the 166 KB Noto Sans Arabic swap (`preload: false`, loading from about 1.3 s to 3.3 s), which reflows the hero title.
  - Suggested follow-up: preload it on Arabic pages only, or use a smaller static subset. `next/font` exposes no URL to preload, and preloading for every locale would cost English readers 166 KB.
- **Back navigation in WebKit:** a reader who scrolls to the footer, opens Dates & venue and presses Back returns to the same offset in both engines. Spec failures here come from Playwright scrolling the header link into view before clicking.
- **Other WebKit spec failures are test artifacts:**
  - Playwright's WebKit does not report `<video>` downloads to request listeners, so assertions that count film requests fail. The film itself plays: live desktop and iPhone profiles chose the right derivative, played at `readyState` 4 with no error, and the same 16 `cinematic-film` failures occur against production.
  - Safari's default Tab skips links.
  - iPhone full-page screenshots are over 32767 px.
  - Redirect headers are not exposed.
  - Cancelled RSC prefetches log "due to access control checks".
  - Filters changed before hydration are dropped; after hydration both filters persist in both engines.
- **Reduced motion:** with Windows "Animation effects" off, browsers report reduced motion and the site removes reveals as designed.
- **Headers and dependencies:** security headers present; `pnpm audit --prod` found no known vulnerabilities.

Deferred until after PR 11 and now moot or re-checked:
- PR 11 adds a Dates & venue link to the homepage's Plan your visit section, replacing the header-link idea.
- PR 11 replaced «النسخ السابقة» with «نسخة ٢٠٢٦».
- The «مكان»/«مقر» venue-label difference is now fixed (see the table above).

Known limitations (not changed):
- **404 pages:** every `notFound()` is answered with Next's empty error shell (`<html id="__next_error__">`). The localized page renders only with JavaScript, so a visitor without it sees a blank page. This needs a routing-level change such as `global-not-found`.
- **Link-preview card:** English on `/ar`, because the image renderer cannot read the WOFF2-only Arabic font package. A local feasibility render with a system TTF showed that `next/og` joins Arabic letters but lays words out left to right. A word-by-word row-reverse layout fixes the order. However, the static Noto Sans Arabic WOFF (`@fontsource/noto-sans-arabic` 5.3.0) fails the build with "lookupType: 5 - substFormat: 3 is not yet supported" in the bundled opentype parser, so the attempt was reverted with its dependency. Remaining options: another OFL Arabic font whose GSUB the parser accepts, or a committed PNG rendered by a browser. The benefit is small while robots block X/LinkedIn cards, and WhatsApp already shows the Arabic title and description.
- **404 rendering:** a not-found boundary placed beside the catch-all page still produced the error shell. Next 16 renders the not-found UI on the client for `notFound()` here. Server-rendered alternatives are a site-wide `global-not-found` page, which loses the localized shell, or request middleware, which adds a function to every request; neither was adopted.
- **GitHub (organizer settings):**
  - Stale PR 2 is still open, with its head already in `main`.
  - `main` is unprotected; consider requiring "Foundation checks" before merging.
  - Merged branches remain; GitHub can delete them automatically after merge.
- **Robots and preview titles:** `Disallow: /`, `noindex` and the "Development preview" titles are intentional until release approval. While `Disallow: /` stands, robots-respecting preview bots (X, LinkedIn) show no card.

## 1 October 2026 — Public refinements and authorized release (ORG-006)

- Latest explicit requester instruction: remove the permanent visible Pause button,
  open Watch in a clean nearly full-screen film view, improve the homepage chapter bar,
  simplify copy/actions, strengthen headings, replace the pale participation background,
  and publish the finished site. Supplied project instructions remain the baseline;
  the later scoped organizer decision is recorded as ORG-006.
- The same approved homepage film/player now has a clean cinema view with hidden
  reading/navigation layers, a close control, Escape/contained Tab, `#film` history,
  original scroll/focus restoration and preference-safe direct entry with deliberate
  Play recovery. Normal playback retains the accessible background interaction without
  a permanent visible Pause button. No asset was re-encoded or moved into a gallery use.
- Participation uses warm ivory and white cards. DM Sans/Noto Sans Arabic headings
  use stronger weights. The numbered chapter index follows the reading position and
  provides native anchors, with desktop header clearance and adaptive mobile columns.
  Dedicated pages have shorter copy and one clear destination per pathway/profile.
- Final source `pnpm check` PASS: zero-warning lint, route types/tsc, 258/258 unit
  tests and optimized build with40 generated pages. Targeted cinema/public-shell
  browser run PASS:60 passed/1 duplicate tablet case skipped,1.3minutes. Final exact-head
  hosted browser regression PASS:264 passed/3 duplicate skips/0 failures of267.
- Initial full browser run:246 passed/6 failed/3 duplicate cases skipped. Four failures
  were normalized homepage-link slash assertions; the two others found real chapter
  overflow at412px/200%text. Fixed adaptive columns/wrapping without clipping. Separate
  checks exposed asynchronous history focus restoration, Forward origin loss and live
  preference-change recovery; fixed these and added bilingual regressions.
- Subsequent267-case run:262 passed/2 failed/3 skipped. The two exact-scroll checks
  recorded the position during an entrance reveal, before Playwright recentered394px
  and activated Watch. Traces show the application restored the actual activation
  position correctly. Added trial actionability before measuring the expected position;
  exact URL/focus/scroll assertions remain. Focused mobile repeat PASS:6/6 across three
  repetitions per language. No product behavior was weakened or changed for this setup fix.
- The subsequent full rerun had263 passed/1 setup failure/3 skips. Trial scrolling
  could still move before the actual click under the full-suite timing. The regression
  now records the actual native click's URL/scroll in capture phase, before the React
  film handler, and checks exact restoration against that independent observation.
  The normal real click and all assertions remain; application source is unchanged.
- Actual-click restoration repeat PASS:12/12 desktop/mobile, three repetitions per
  language. Exact d878cd8 hosted CI36903651165 PASS:258 units,264 browsers/3 duplicate
  skips,20 pgTAP and10 integrations, both jobs successful. Local full run263/1/3 found
  a separate test timing gap: identical search/day values could pass on the prior
  language before the return navigation committed. Added explicit URL/document-language
  arrival waits and retained query/filter checks. The locale/filter repeat then passed
  12/12 desktop/mobile cases, followed by final c1f7273 CI36905277026 PASS both jobs:
  258 units/264 browsers/3 duplicate skips/20 pgTAP/10 integrations, lint/types/build
  and database security checks. d878cd8 remains separately recorded historical evidence.
- Targeted public-page review PASS:24 language/viewport combinations with normal and
  200%text, filters/reset focus and distinct links. Chapter repair PASS:20 EN/AR width/
  text combinations at320/390/412/791/1440px, no overflow and minimum48px targets.
  `node .tools/cinematic-release-review.mjs` PASS: six EN/AR desktop/tablet/mobile
  homepage/chapter/cinema journeys, HTTP200, correct ivory surface/700 heading weight,
  zero page errors/overflow;18 screenshots captured and desktop/mobile views inspected.
- Published through [PR11](https://github.com/xpexellent-dotcom/msrc-2027/pull/11),
  merged e70bf38abd5e6567c85f33b348f3224927c46745. Entire merge tree equals checked c1f7273
  (`git diff --exit-code` PASS). Vercel Production6791979347 succeeded at18:23:37UTC.
  Preview6791792610 built successfully; app UAT was blocked by existing Vercel Login.
- Live `node .tools/cinematic-release-review.mjs` PASS: six EN/AR desktop/tablet/mobile
  homepage/chapter/film journeys, correct ivory/700 headings, zero errors/overflow,
  18 screenshots with EN desktop/AR mobile participation/cinema inspected.
  `node .tools/cinematic-live-boundaries.mjs` PASS:24 public200 routes,14 private404
  paths,15 closed503/no-store gates, four EN/AR320/412px200% text layouts and two
  preference-safe media/filter/explicit-film-play journeys, no mutation requests.
- No new
  dependency, database/migration/RLS/grant, secret/environment, DNS, email, payment or
  hosted-resource configuration change. All15 operational gates stay closed; public
  information routes do not fake a submission or expose an unapproved catalogue.
  Physical devices, Safari/Firefox and human screen-reader/Arabic editorial review are
  NOT TESTED. Scope, commands, publication receipts and rollback:
  [latest handoff](features/cinematic-release-refinements.md).

## 1 October 2026 — Cinematic public website (ORG-005)

- Inspected the existing application, project brief/decisions/progress, relevant v0.5
  requirements, supplied brand guide and the four requested design references. Retained
  the installed/pinned Next.js architecture and working public/security behaviour.
  Existing PROGRESS entries and user work are preserved; no new dependency was needed.
- Implemented a viewport MSRC 2026 opening film, floating responsive navigation,
  preference-safe playback with visible Pause/Play, responsive posters and an editorial
  homepage narrative. Added flowing brand lines, reusable page/card/filter treatments,
  native FAQs, a separate date/countdown band and coherent EN/AR/RTL presentation.
- Added public programme, speakers, media, participation, registration, research,
  hackathon, workshops and 3MT information routes plus approved-record detail handlers.
  Filters are addressable; scientific text is English/LTR. Empty approved catalogues
  show announcement/no-result states. No synthetic speakers, sessions or playable
  recordings were substituted for missing approvals. Raw drafts remain server-only.
- Existing approved homepage derivatives are unchanged and are not reused as gallery
  or speaker assets. Venue, opening time, roster, sessions, sponsors, prices/windows
  and recording access remain unresolved. All 15 operational gates remain closed;
  information journeys do not submit participant records or show a fake success.
- Final `pnpm check` PASS: zero-warning lint, generated types, 258/258 unit tests and
  production build (40 generated pages plus dynamic handlers). `pnpm test:e2e` PASS:
  237 passed / 2 intentionally skipped duplicate matrix cases, 3.6 minutes, desktop,
  tablet and mobile Chromium. The desktop matrix itself covers 320/791/1440px EN/AR.
  Keyboard/focus, URL filters, locale/hash, text enlargement, axe, video loading,
  preference/denial/error recovery, and closed-workflow regressions passed.
- Earlier 206-case run: 171 passed / 33 failed / 2 skipped, including assertions for
  the superseded interface. Subsequent 239-case run: 224 passed / 13 failed / 2 skipped.
  Fixed real anchor clearance, skip-link/text/card/countdown reflow, same-route filter
  resets, Arabic edition digits and Next16.3.7 cached-route fragment duplication.
  Updated historical assertions and mobile navigation targets to the current interface;
  added regressions instead of removing the meaningful failure checks.
- `node .tools/public-visual-review.mjs`: 30 EN/AR desktop 1440×900, tablet 791×1000,
  mobile 390×844 route snapshots returned 200, zero page errors, no horizontal overflow.
  Desktop/mobile film and editorial layouts visually inspected. Screenshots are in
  ignored `deliverables/public-experience/`; the live local preview is at
  `http://127.0.0.1:3000/en` and `/ar` and opened in Codex.
- No database/migration/RLS/grant, environment/secrets, DNS, hosted resource, payment,
  real email or workflow-opening change. NOT TESTED: physical devices, Safari/Firefox,
  human screen-reader/Arabic editorial review and real catalogue/recording assets.
  This change has not been deployed. Next task: review the design and populate the
  approved catalogue/assets; operational workflows retain their separate milestones.
  Full scope, content replacement points and rollback: [handoff](features/cinematic-public-experience.md).

## 1 October 2026 — Brave motion diagnosis

- User reported missing navigation slides and section reveals in Brave. Read-only
  Windows SystemParametersInfo(SPI_GETCLIENTAREAANIMATION) returned success and FALSE:
  animation effects are disabled on this PC. No system preference was changed.
- Fresh installed Brave 154.1.96.60 test, with reduced-motion emulation explicitly reset
  to system defaults, reproduced the issue on the live site: reducedMotion=true,
  zero button transition duration, no navigation slide, and no section reveal.
- A separate motion-enabled comparison in the same isolated browser reproduced the
  working path: 180 ms feedback, actual 16 px / 400 ms Program slide and 400 ms reveal.
  Both loads returned 200; no page errors. User profile/existing tabs untouched.
  Command: `node .tools/media/brave-motion-diagnosis.mjs`; receipt is in ignored
  `deliverables/brave-motion-diagnosis/`. No application/deployment/database change.
- Earlier positive Chromium checks explicitly enabled motion; they did not establish
  the user's inherited preference. To view full motion, enable Windows Animation
  effects and reload: Reveal blocks completed under reduced motion do not replay on
  a preference change alone. Separate perceptibility issues (small early slides and
  grouped children revealing offscreen) remain follow-up presentation work.

## 1 October 2026 — Live desktop motion verification

- Read-only application audit requested after the premium release. Fresh live Chromium
  checks at 1440×900 passed in English and Arabic: 180 ms button fill/hover feedback,
  1 px lift, 98% press, one-time 400 ms section reveals, actual 16 px / 400 ms route
  and anchor slides (mirrored RTL), destination focus, and no page errors.
- Reduced-motion desktop check passed: UI travel is disabled while navigation/focus
  remain functional. Source confirms native wheel/keyboard scrolling and deliberately
  subtle content movement; the implementation is not a full-page swipe transition.
- Executed `node .tools/media/desktop-motion-audit.mjs` plus agent-browser live
  open/snapshot/About click/URL/error inspection. Initial CLI browser discovery and
  PowerShell ref quoting were corrected before the successful browser checks.
  Receipts, screenshots and EN/AR desktop recordings are in ignored
  `deliverables/desktop-motion-audit/`. No application or deployment change.
- NOT TESTED: Safari/Firefox, real-device or human screen-reader review; build/database
  checks were not rerun for this read-only audit. Code inspection found the anchor
  arrival helper assumes IntersectionObserver exists; that rare unsupported-browser
  fallback remains a follow-up and was not reproduced or fixed in this check.

## 1 October 2026 — Premium public interface (ORG-004)

- Scope: restored headline, one-line EN/AR introduction, self-hosted Manrope display
  titles, original research graphics, concise public prose, refined shared shell/actions,
  one-time staggered reveals and a sectioned ivory countdown. Only the top Development
  preview banner remains as a public draft notice; unknown/closed product states stay.
- Separate visible hero Pause UI removed; semantic background keyboard/tap pause remains,
  with persistent paused frame, focus and actual browser/error recovery. Existing montage
  assets unchanged. No workflow, database/migration/RLS, environment, DNS or email change.
- `pnpm check` PASS (lint/types,252 units, production build). First201-test E2E run197
  PASS/4 new reveal assertion failures. Actual finished transforms serialize as identity
  matrices; corrected focused16/16 and final full201/201 PASS. Final types/lint and frozen
  install PASS. Six-view local
  EN/AR desktop/mobile/320px+200% playback/pause/slides/countdown/reflow PASS; six public
  routes200, ten private404,15 workflows503/no-store. Visual screenshots inspected.
- Published through [PR9](https://github.com/xpexellent-dotcom/msrc-2027/pull/9), app main
  cbfe62a, after [CI36847305482](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36847305482)
  passed both jobs (252 units/201 browsers/20 pgTAP/10 integrations). Preview6781648361
  and Production6781771386 succeeded. Merged tree matches exact verified PR head9d9026a.
  Fresh live six-view EN/AR autoplay/background keyboard pause/slides/countdown/reflow
  PASS; six public routes200, ten private404,15 workflows503/no-store. Preview app UAT
  BLOCKED by Vercel Login; protection preserved. No `.env`, schema or media file staged.
  Full33-file list, source IDs, commands/results and rollback: [feature note](features/premium-public-interface.md).
- Final official branding/human Arabic/editorial/device/screen-reader/Safari/Firefox UAT
  and broader REL-01 remain open. All15 operational gates stay closed.

## 1 October 2026 — Requested homepage experience fixes (ORG-003)

- Scope: public muted autoplay without automatic still-mode preferences, clean mobile
  icons, controlled explicit navigation slides/native scrolling, a larger right-column
  D/H/M/S clock, and welcoming English/Arabic headline/lead. No operational feature,
  database/migration, environment, dependency, DNS or email change. All 15 gates remain closed.
- ORG-003 supersedes the automatic public still-image default diagnosed below. Browser
  autoplay denial retains manual Play; actual failed media retains a poster. Keyboard
  pause freezes the video frame; hidden tabs pause playback. UI reduced-motion
  alternatives remain. Approved source and derivative media are unchanged.
- The clock targets and labels the start of 27 January 2027 at 00:00 Asia/Riyadh.
  Conference opening time and venue remain unset; this display never opens workflows.
- Local evidence: `pnpm check` PASS (lint/types, 252 units, production build),
  `pnpm test:e2e` PASS (185 tests). Actual six-view EN/AR autoplay, keyboard pause,
  mobile/reflow and production private-route checks PASS. A visual 200% time-label
  refinement rebuilt successfully; 51 focused browser regressions and the six-view
  recheck PASS, including 15 closed/no-store workflow endpoints. Enlarged clock
  screenshots inspected; no horizontal overflow. Safari/Firefox/real-device/human UAT
  remain NOT TESTED for this task.
- Initial test-only TS2352 cast failure was corrected; prior diagnostic work is preserved.
- Published through [PR7](https://github.com/xpexellent-dotcom/msrc-2027/pull/7) to main
  da4b93e after [CI36798655620](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36798655620)
  passed both jobs, including 185 browser, 20 pgTAP and 10 client integration tests.
  Production6773615857 succeeded. Live six-view EN/AR autoplay/keyboard pause,
  mirrored400 ms slides/focus and clock/reflow PASS; six public routes200,
  ten private routes404 and all15 workflows503/no-store. Preview build passed;
  unauthenticated Preview browser UAT was blocked by Vercel login, protection unchanged.
- Exact scope, 29 changed paths, verification, limitations and rollback:
  [feature note](features/homepage-experience-fixes.md). Latest request explicitly
  reauthorizes pushing and publishing once the fixes are complete.

## 1 October 2026 — Live homepage still-image diagnosis

- Read-only browser inspection of `https://www.msrc2027.com/en` reproduced `Still image mode`: the hero had `data-media-state="poster"` and no video element. The inspected browser reported `prefers-reduced-motion: reduce = true`, with the document visible; no warning/error logs were returned. This establishes the trigger in the inspected browser, not in every visitor's device.
- Source inspection confirms `src/lib/media-policy.ts:53–56` deliberately prevents loading for reduced motion (DSN-01 / ACC-01). `src/components/hero-media.tsx` also omits the Play control in that state, and `src/styles/media.css` hides video under the same preference. Approved desktop/mobile MP4 paths remain configured in `src/content/public-site.ts`.
- No application, media, browser preference or deployment change. Tests/build were NOT RUN for this diagnostic-only task; normal-motion playback and other devices were NOT TESTED in this check.
- Suggested next task: retain the motion-safe default while providing an explicit, accessible visitor-initiated Play option, with matching policy/CSS and regression coverage. No organizer decision changed.

## Current evidence

| Item | Observed status |
|---|---|
| Main File PDF | Reviewed, including all-page visual coverage and extracted text |
| Live Development Specification v0.5 | Read and archived as a dated source snapshot |
| Updated Hackathon Draft | Read and reconciled; options and conflicts preserved |
| Brand guide and previous starter pack | Reviewed; recommendations distinguished from approvals |
| Original Canva brand reference sheet | Text read; palette and English font names corroborated, final brand approval still pending |
| 2026 media | ORG-002 derivatives/rights unchanged. ORG-006 removes the permanent visible Pause button and reframes the same homepage player into a nearly full-screen film view. Preference-safe entry, explicit Play, focus/history/close and poster recovery verified; other asset rights remain open. |
| Codex handoff documents and prompts | Prepared in this package |
| Domain / HTTPS | Fresh checks: www CNAME matches Vercel; HTTPS EN/AR Home/About return 200; HTTP/HTTPS apex resolve to https://www.msrc2027.com/en. Account custody/renewals remain unverified. |
| Git / application code | PR11 merged at e70bf38 after exact c1f7273 CI36905277026 passed both jobs; complete merge tree matches checked head. Production6791979347 succeeded. Prior release/source evidence remains preserved; custody/required-check enforcement remain separate work. |
| Local development installation | PASS: exact dependencies installed, frozen lockfile verified, portable Node24.21.0 selected for this host. |
| Windows container prerequisites | WSL3.0.1 and Docker Desktop4.93.0 installed; optional PC fixture tests still require restart/first launch. User now selected direct hosted access for normal work (ENG-006). |
| Vercel/Supabase projects / production secrets | Production6791979347 succeeded for e70bf38; fresh live EN/AR public page/film checks passed. Connector settings/drains remain NOT VERIFIED. Hosted Supabase evidence was not refreshed; no hosted data/settings or secrets changed. |
| Tests / CI / preview / production deployment | Local lint/types/258 units/build PASS; exact c1f7273 CI36905277026 PASS both jobs,264 browsers/3 duplicate skips/20 pgTAP/10 integrations. Preview6791792610 succeeded, protected app UAT blocked. Production6791979347/live six visual journeys,24 public200/14 private404/15 closed503 gates/four200% text layouts/two preference/filter/film journeys PASS. Retained failed runs/repairs in the latest feature note. Physical-device/human/Safari/Firefox review open. |
| KAU collection access / email sender | Not verified |
| Implementation backlog | Documentation:152 issues/24 epics/13 decision packets/212 source IDs mapped. ORG-005/006 public journeys and presentation are implemented; operational modules keep their distinct milestones. No operational gate opened. |

## Milestone status

| Milestone | Requirements/planning | Implementation | Release |
|---|---|---|---|
| M0 Governance | Baseline and decision register prepared; named owners/evidence pending | Organizational setup unverified | Pending |
| M1 Foundation | ENG-001/004/005/006 adopted; relevant source IDs retained | Foundation and isolated Linux database CI verified; Windows local stack optional and untested | Deployed foundation does not open operational or institutional approval gates |
| M2 Design system | ENG-007 palette/motion, ORG-005/006 public identity/refinement | Floating navigation, numbered chapters, ivory/white participation, stronger DM Sans/Arabic titles, flowing motifs and reusable public/filter/media treatments verified EN/AR; native scrolling and accessible motion/film behavior | Scoped presentation published; final brand/human review pending, production showcase closed |
| M3 Public alpha | Public sitemap; ORG-001 dates/ORG-002 media/ORG-005/006 presentation | EN/AR Home/About/Dates/Programme/Speakers/Media/Participate/Registration/Research/Hackathon/Workshops/3MT published at e70bf38, plus safe approved-record detail handlers and aliases; cinematic homepage and filters verified | Scoped public release complete. Final brand/copy, venue/start time, approved catalogues/assets and broader REL-01 open;15 operational gates closed |
| M4 Staff auth/CMS | Requirements defined | Not verified | Pending |
| M5 Participant auth | Requirements defined | Not verified | Pending |
| M6 Abstract/review | Detailed baseline; configuration gates remain | Not verified | Pending |
| M7 Registration/workshops | Detailed baseline; finance and capacity inputs remain | Not verified | Pending |
| M8 Competitions | Hackathon partly decided; 3MT configuration pending | Not verified | Pending |
| M9 Event operations | Required evidence identified; procedures pending | Not verified | Pending |
| M10 Certificates/archive | A1/S2 selected; templates/privacy implementation pending | Not verified | Pending |
| M11 Handover | Requirements identified | Not verified | Pending |

Do not convert this table to percentage completion without observable evidence. The earlier tracker is a blank template and does not establish implementation.

## Next task

M3 can continue now. Do not rebuild M1/M2/About or wait for optional Windows Docker.
The [checklist audit](reviews/checklist-audit-2026-10-01.md) records current source,
deployment, evidence gaps and the sequence agreed by the existing roadmap.

The user confirmed27–28January2027 and approved this18.7-second MSRC2026 montage;
ORG-001/002 preserve that authority. ORG-005/006's cinematic public pages and requested
refinements are now published and live-verified. Next: populate approved session/speaker/
workshop catalogues and official assets, then review bilingual copy and venue/time inputs.
Gallery rights and recording/access decisions remain separate. Operational work starts
with its existing milestone/decision contract; public presentation opens no workflow.

Next smallest content PR: approved contact/privacy/terms details and remaining public
informational routes, after receiving the responsible owners' wording. The
[BL-SEC-01](backlog/21-privacy-security.md#bl-sec-01) can proceed independently with
synthetic actors; M4 must establish staff grants/MFA before exposing CMS writes.

Before calling the existing draft an approved public release, resolve the public-draft
boundary, record approved copy/contact/privacy/terms, finish relevant human UAT, assign
custody/release/support owners and verify monitoring/recovery. Follow up the cancelled main
workflow, merge-check enforcement and stale PR2 as separate governance work. The current
user explicitly authorizes this release; no operational workflow opening follows from it.
Venue, start times, deadlines, prices and capacities remain gated.

Use the selected hosted Supabase connection for normal development. Windows Docker setup
is optional for PC fixture tests; GitHub retains isolated synthetic database verification.
Any hosted schema feature needs explicit grants/RLS and a reviewed migration, not a copy
of the local synthetic fixture. All operational gates remain closed. See
[hosted connection](features/hosted-supabase.md) for current evidence and
[database/CI verification](reviews/m1-database-ci.md) for earlier local-stack results.
The [implementation backlog](backlog/README.md), DR-CFG-11 ownership and DR-CFG-12
content/brand decisions remain available for later work; no decision was silently resolved.

## 1 October 2026 — Confirmed dates, countdown and authorized publication

**Release complete:** [PR5](https://github.com/xpexellent-dotcom/msrc-2027/pull/5)
merged at `d6e4be7deb98fd5b85d5cf2ff5cca5ead89f8180` after
[CI36793419169](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36793419169)
passed on `5a27e9cb766379099832b1093fbc283f5894360b`. GitHub recorded Vercel
Production deployment6772802242 as success. Actual browser checks of
[English](https://www.msrc2027.com/en) and [Arabic](https://www.msrc2027.com/ar),
their About/Dates routes, media/gates and complementary narrow/enlarged layouts
passed. Complete commands, exact evidence and file list are in the feature contract.
The merged main revision also passed
[CI36793777799](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36793777799).
This completion applies to the approved static date/media release, not all REL-01 gates.

Scope: publish the previously reviewed Brand/interface polish and approved MSRC2026 film,
set Day1 to27January2027 and Day2 to28January2027, add a homepage calendar-days countdown,
and reconcile Home/About/Dates/metadata, decisions and checklist. See
[feature contract](features/confirmed-dates-publication.md) for files, acceptance and rollback.
Source IDs include SCP-01/02, CFG-01/12, TIM-01, LOC-01/03, ACC-01, MED-01–04 and REL-01.

Dates remain date-only; no opening/session instant is invented. Current Riyadh calendar
determines before/Day1/Day2/after states and midnight refresh. Cached HTML contains static
dates; no-JS browsing remains readable. The new Dates & Venue page explicitly preserves
unknown venue/rooms/times. Home/About metadata and preview image share typed date values.

Only four approved media derivatives are public; source/recipe remain ignored/private.
Pause, inline muted playback, mobile crop, poster and motion/network/error fallbacks remain.
All15 operational flags stayfalse; no migration, data write, RLS/grant, hosted secret,
environment, DNS or real communication changes. Final brand/REL-01 decisions are separate.

First browser pass found a reproduced English ICU hydration mismatch and no-JS static
content hidden by streamed loading UI. Server-formatted date props and a loading boundary
scoped to the interactive showcase fix these; a layout guard preserves actual production404.
Normalized anchor selector and media-opacity timing assertions were repaired without
weakening expected outcomes. Initial suite stopped after74 tests; no full pass was claimed.

Executed: final pnpm check PASS (232 unit tests, lint, types, build); pnpm test:e2e PASS
(157/157 Chromium desktop/tablet/mobile,1.7minutes), including date boundaries/no-JS,
actual public film/preferences/failure and all closed-workflow regressions. Original/source-copy
hash checks PASS; both public videos fully decode; seven production preview/original paths
return404 with both flags set. Independent visual QA PASS:36 Home/About/Dates views across
EN/AR,1440/390/320px and normal/200% text, plus six actual-film keyboard pause/focus checks;
no console/page errors, overflow, glyph clipping or control/caption overlap. Reduced-motion
still and production404 guards passed. Evidence: ignored deliverables/m3-confirmed-dates.
Manual review found an enlarged Arabic skip-link/banner overlap missed by main-content
geometry checks; hiding now follows the link's own height, with keyboard regression tests.
Final157-case browser retest PASS, including the enlarged-text skip-link regression.
Remote CI36793419169 subsequently passed all application and isolated database checks;
the initial9-failure streamed-showcase test run was corrected without relaxing assertions.
Production6772802242 at d6e4be7 and live root/independent browser checks PASS.
No hosted data changed. See the feature contract for exact results and remaining UAT.

## 1 October 2026 — Brand/interface polish and private homepage film preview

Scope: complete the currently unblocked Brand/interface checklist work, improve English/
Arabic Home/About, refine button/section motion and prepare the user-supplied montage for
review before publication. Official brand assets remain pending; ENG-007 defaults retained.
No product workflow, database change, credential, dependency, hosted setting, deployment,
DNS change or real communication. Earlier audit/backlog edits are preserved.

Implemented: directional solid button fills and mirrored arrows/underlines, clearer
reading widths/spacing, enlarged-text recovery, optional native proximity scrolling with
free-scrolling/reduced-motion alternatives. Public Home/About retain synthetic artwork.

Prepared:18.7-second MSRC2026 muted loop with auditorium/audience/research discussion,
desktop1280×720 (2,762,552 B), mobile720×1280 (1,866,350 B) and JPEG still posters.
Original is read-only/unchanged. Four derivatives are private and ignored; server-enforced
development-only review pages and byte-range endpoints cannot serve footage in production
even with their flag enabled. Pause freezes the frame; mobile controls use a flow slot.

Actual final checks:
- PASS: `pnpm check` — ESLint, route type generation/TypeScript,213 unit tests, build.
- PASS: `pnpm test:e2e` with documented browser cache —112 Chromium desktop/tablet/mobile
  tests, including actual production-build preview denial and all15 closed API gates.
- PASS:25 independent actual-film checks for device source, pause/resume/focus, frozen
  frame, reduced motion/low bandwidth/failure, exact ranges and denied original paths.
- PASS:6 desktop/mobile EN/AR film views with zero Axe/console errors;30 views at200%
  text and8 mobile control-flow checks; source hash, full decode, no audio and faststart.
- PASS: `git diff --check`; original/derivatives ignored. Native checklist9 scoped patches
  applied at sequence2, separating technical preparation from pending publication approval.
- Earlier107/112 browser result exposed two real CSS defects and a computed-style test
  expectation; fixed and full suite rerun. One cache-path setup attempt and concurrent
  Turbopack HMR issue are recorded with recovery in the feature note.
- NOT RUN: database suite, remote CI/Preview/deployment for this UI/read-only media slice.
  Safari/Firefox, real-device/screen-reader UAT and final Arabic/brand/media review remain open.

Review at [English](http://127.0.0.1:3300/en/hero-preview) or
[Arabic](http://127.0.0.1:3300/ar/hero-preview), while the local server is running with
`LOCAL_MEDIA_PREVIEW_ENABLED=true`. Blank documentation added to `.env.example`; no hosted
environment changed. The Codex browser-open request was queued, so links are provided.
See [complete file list, commands, evidence, manual setup and rollback](features/brand-motion-media-preview.md)
and [media record](MEDIA_REGISTER.md#8-msrc2026-montage-local-review-candidate--1-october-2026).

Release: LOCAL REVIEW READY, UNPUBLISHED. Next inputs: official brand, organizer preview
review and per-asset clearance. Next code PR remains BL-PUB-02, honest bilingual Dates/Venue;
BL-SEC-01 synthetic permission contract can proceed independently. No migration rollback
is required; disable the local preview flag or revert only this slice's changes.

## 1 October 2026 — Feature checklist audit and sequence reconciliation

Audited and updated the user-linked [feature checklist](https://chatgpt.com/space/page_5962a54672888191869e3c6108c27678).
Its previous no-application/no-deployment assessment came from a different inspected
workspace and is superseded by current repository, CI and public HTTP/DNS evidence.
Reconciled confirmed abstract/hackathon choices and the AI-03 default with v0.5; kept
the separate AI prototype's20-test claim explicitly historical and outside this platform.

Read all checklist blocks and open comments (none); inspected current code, source,
decision and backlog records; independently checked24 epics/152 implementation issues/
13 decision packets/212 source IDs. Read GitHub PRs, commit comparison, CI jobs and
deployment receipts. Fast-forwarded the clean local checkout from706219d to existing
remote9e018ae, preserving all eight newer commits and their QA notes. No implementation
was authored by this audit. Full lint/type/unit/build/browser/database suites were not
rerun; CI conclusions were read and live read-only smoke checks were executed.

Fresh checks: four EN/AR Home/About responses200, three public design-system responses404,
all15 operational GET endpoints503 WORKFLOW_CLOSED, robots disallow all, sitemap404,
DNS CNAME matches Vercel and both apex protocols reach HTTPS www/en. One recorded Preview
redirected an unauthenticated design-system request to Vercel login; authenticated content
and full deployment settings remain unverified. Main-specific workflow was cancelled;
successful PR CI covers the same source commit, not that cancelled run.

Updated current progress, backlog status and the decision reconciliation note. Kept dated
historical results intact. M3 media/editorial work and BL-PUB-02 are unblocked; public
REL-01, CMS and all operational opening gates remain unmet. See the
[audit record](reviews/checklist-audit-2026-10-01.md) for commands, findings, next tickets,
scope and rollback. No reminders, production changes, secrets, emails or live data writes.

## 30 September 2026 — QA pass: Arabic polish, favicon, apex domain

Exploratory QA of the live preview (www.msrc2027.com, EN/AR, 1280/1100/390px) plus the
full local suite. Scope: copy/style/metadata only; no workflow, data or gate changed.

| Finding | Change |
|---|---|
| Arabic kicker/footer "مؤتمر أبحاث طلاب الطب الخامس" can read as "fifth medical students" | Now "المؤتمر الخامس لأبحاث طلاب الطب", matching the About page |
| Arabic hero, several headings and pathway titles were word-for-word translations | Rewritten as idiomatic MSA following the English meaning (for example "حيث يتحوّل الفضول / إلى اكتشاف.") |
| Mixed digit systems in Arabic (٠١ eyebrows, but 01–04 pathway and program numbers) | Shared `formatIndex` helper; unit test prevents Western digits returning to Arabic copy |
| "Not open yet" badge did not agree with its noun in Arabic | Masculine form for pathways (مسار), feminine form for participation (المشاركة) |
| About purpose item repeated its section title; footer "المحددة" note was unclear | Distinct item title; the note now says pages are "marked with a dot" (EN and AR) |
| Arabic labels rendered at 10–11px, visibly smaller than Latin at equal size | Arabic-only size lift for small labels (preview bar, eyebrows, badges, captions, footer) |
| `/favicon.ico` 404; tabs showed no icon, and there was no iOS home-screen icon | `src/app/icon.svg` monogram in the working palette, plus a matching static 180×180 `apple-icon` |
| English pages downloaded the 166 KB Arabic webfont only to draw the "العربية" switch label (≈40% of page bytes) | The label uses the system Arabic face; measured EN transfer 425 KB → 260 KB and CLS 0.0001 → 0 (390px, throttled). An e2e test guards it |
| No canonical, hreflang or link-preview metadata; shared links had no card | Per-page canonical and `en`/`ar`/`x-default` alternates, Open Graph/Twitter tags and a static 1200×630 card per locale (`[locale]/opengraph-image.tsx`); `noindex` is unchanged |
| No Content-Security-Policy or COOP header | Structural CSP (`base-uri`, `form-action`, `frame-ancestors`, `object-src`) and `Cross-Origin-Opener-Policy: same-origin`; script/style sources are left open until a nonce-based policy is designed. An e2e test covers the headers |
| Latin "MSRC 2027" spans on Arabic pages lacked `lang="en"`, and the Arabic 404 code used Western digits | `lang="en"` added for screen-reader pronunciation; Arabic 404 shows ٤٠٤ |
| Root `/` → `/en` ran as a serverless function in `iad1` with no caching: live TTFB 0.41–0.50s versus about 0.20s for `/en` from the Mumbai edge | Replaced `src/app/route.ts` with a `next.config.ts` temporary redirect answered at the edge; e2e asserts 307 → `/en` |
| axe best-practice sweep (EN/AR, home/About/404, 390 and 1280px): the preview banner sat outside any landmark (`region`) | Banner is a labelled region («حالة الموقع» / "Site status"); an e2e test now runs the axe best-practice rules on the four public pages. Arabic layouts at 320/768/1024px inspected with no overflow |
| Arabic skip link and retry wording | «انتقل إلى المحتوى الرئيسي» and the standard «أعد المحاولة» |
| Apex `msrc2027.com` had no DNS A record (only `www` resolved) | User-authorized: added `msrc2027.com` to the Vercel project (308 → www) and a Namecheap `@` A record to `216.198.79.1`; verified on the authoritative and public resolvers |

Verification (Node 24.21.0 portable, pnpm 11.19.0): ESLint PASS; typegen and `tsc` PASS;
Vitest 184/184 PASS (numeral and metadata tests added); `next build` PASS; Playwright 102/102 PASS
(preview-image, Arabic-webfont, security-header, root-redirect and axe best-practice tests added).

Cross-browser (local Playwright WebKit 26.6: Desktop Safari and iPhone 15 profiles). Every public
homepage/About check passes: rendering, overflow, axe, headers, preview image and 404s. The only failures
are the five keyboard tests that press Tab to reach links, because WebKit follows Safari's default of not
tabbing to links without Option+Tab, which is a browser preference rather than a site defect. The staff-only
design-system specs also hit harness limits (no WebM codec, 32,767px screenshot cap, radio arrow keys). The
reduced-motion test hard-coded port 3210 and now reads `baseURL`. Firefox: NOT TESTED, because the browser
cannot launch in this sandbox (`spawn UNKNOWN`).

Low-priority recommendation: Arabic pages discover Noto Sans Arabic without a preload. On throttled slow
mobile it finishes at about 2.4s, after the hero paints; on a fast 4G profile (40ms, 12Mbps) it finishes at
about 0.48s, before LCP (about 0.78s), so most visitors see no swap. A locale-specific preload would need a manual
`@font-face` outside `next/font/local` (a recorded decision), so it is left for review.
Local Playwright screenshots of AR 1280/1100/390px and About were inspected, with no horizontal
overflow or console errors. Arabic editorial approval is still required under CFG-12; these
are draft improvements, not approved copy.

## 30 September 2026 — Complete M2 component system

Implemented the current requested inventory without adding operational modules: expanded
tokens, shared Section/Link/ContentSplit/StatBlock/ProgramRow, extracted MobileNav/Footer,
native FormField/Select/Checkbox/Radio/FileUpload, Alert/EmptyState/LoadingSkeleton,
controlled Dialog/persistent Toast, semantic Table and pagination. Existing Container,
Header, Button, LanguageSwitch, SectionHeading, StatusBadge and local font setup are reused.
Both English/LTR and Arabic/RTL showcase routes include applicable states. Added gated
`/design-system` alias. All 15 operational flags remain closed; no live data access occurs.

ENG-007 records the latest palette/font/motion implementation decision. Drive metadata and
six root folders were readable again; no new media was downloaded or published. File
selection remains browser-memory-only. No migration, dependency, lockfile or environment
configuration changed. See [scope, full file inventory and rollback](features/m2-components.md).

Verification on the Windows checkout (Node24.21.0 / pnpm11.19.0):

| Command / inspection | Observed result |
|---|---|
| `pnpm check` (lint, route type generation, TypeScript, Vitest, production build) | PASS; final code run has 181 unit tests across 8 files; all routes built |
| `pnpm test:e2e` with local Chromium cache | PASS: 90 desktop/mobile/tablet cases, including 30 focused M2 cases; final full run51.4s |
| Initial 84-case browser run | 78 passed / 6 failed: native dialog Tab boundary plus a broad Arabic status selector |
| Expanded 90-case rerun | 88 passed / 2 failed: alias test expected an exact robots header but existing global config adds `noarchive`; corrected assertion to retain required directives |
| `node .tools/ci/verify-m2-production.mjs` | PASS: `/design-system`, `/en/design-system`, `/ar/design-system` all HTTP404 under `VERCEL_ENV=production`, even with preview flag true |
| `node .tools/ci/capture-m2.mjs` | PASS: English1440px/Arabic390px pages and dialogs rendered, no console errors/framework overlays |
| Screenshot inspection | English desktop and Arabic mobile overview, fields, table and dialog inspected; eight PNGs in ignored `.tools/verification/m2/` |
| `git diff --check`; scoped final test ESLint | PASS; no whitespace errors or lint findings |
| Hosted database/RLS mutation tests | NOT RUN: no database code/schema changed and this UI slice must not mutate live Supabase |
| Windows local database stack | NOT RUN: optional installed Docker still needs first-launch/restart setup; Linux CI provides the isolated fixture check |
| GitHub application/database CI | PASS: [PR run36632458600](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36632458600) on implementation commit `1c6be4e`; 181 unit /90 browser /20 pgTAP /10 integration tests; schema lint, security advisors and generated types passed |

The dialog now cycles available controls while excluding hidden/disabled controls, restores
focus on Escape/backdrop close and preserves native modality. Tests also cover anchor
smooth/instant behavior, touch targets, reduced motion, file clearing/no writes, table
boundaries, local/staging route headers, existing bilingual pages and closed endpoints.
Semantic text colour pairs meet4.5:1; tested control/focus pairs meet3:1. Gold-on-ivory remains
decorative. Automated axe checks include the full showcase and open dialogs.

Local preview: `http://127.0.0.1:3000/en/design-system` and `/ar/design-system`.
Reviewable change: [PR3](https://github.com/xpexellent-dotcom/msrc-2027/pull/3), stacked on
PR2. No PR was merged. A final independent code review found no actionable P1/P2 issues;
that review is separate from the executed tests above. A documentation-only follow-up
records the immutable implementation-run evidence and does not alter verified app code.
For a new terminal use the README. Remote staging requires explicit deployment protection;
no Vercel deployment or production publication was created. Screen readers, real devices,
Safari/Firefox and final Arabic editorial review are NOT TESTED in this slice. Rollback is
the component commit revert; no database action is required.

## 29 September 2026 — Direct hosted Supabase connection

The user requested direct use of live Supabase and supplied the `ecemjggwlzqpjcwmchrl`
API URL. Confirmed existing project `msrc`, ACTIVE_HEALTHY, region `ap-northeast-1`;
public tables and migration history empty; generated public schema empty; security advisor
returned no findings. This records the existing region, not institutional production approval.
No project, key, migration, data record, Auth/Storage setting or paid resource was created.

Added explicit hosted configuration, HTTPS/publishable-key validation, separate default empty
schema and guarded local fixture types, and a read-only hosted connection command. Kept all
15 flags closed. Wrote the existing publishable key and public settings to an ignored local
environment file without printing values. Public pages remain static and database-independent.

The initial Data API root metadata check returned HTTP401 (`Secret API key required`);
this was a restricted metadata endpoint, not a need to add privileged credentials. Switched
verification to public Auth service settings, which accepted the publishable key with HTTP200.
This endpoint creates no user/session or email. A separate constant `SELECT 1` passed through
the authorized connector. No table rows were requested. Local `db:integration` correctly
refused hosted settings before test collection (expected exit1). The per-client local guard
also rejects hosted targets before constructing a client.

Full application/CI evidence and remaining limits are recorded in the
[hosted connection feature note](features/hosted-supabase.md). ENG-006 supersedes the local-only
connection restriction and makes Windows Docker optional for ordinary hosted work. The
source specification, infrastructure ownership and operational release decisions remain intact.
Local verification passed lint/types/build, 158 final unit tests and all 60 EN/AR browser
cases. No page or live data workflow changed. GitHub reruns the isolated Linux database
suite on the associated hosted-connection PR; this never uses the hosted project key.

## 29 September 2026 — Windows runtime installation and hosted CI

The user authorized installation, database checks and CI, then explicitly requested creating
the repository on their GitHub account. Created private `xpexellent-dotcom/msrc-2027`, kept
the existing history and pushed `4f0f37d`. The user approved Git Credential Manager access
and completed GitHub email verification; no token entered source, documents or tool output.

WSL3.0.1 and Docker Desktop4.93.0 per-user installation both exited0. The official Docker
installer's signature and versioned SHA256 matched. Docker CLI29.8.1 is installed, but its
server probe fails because Windows requires a restart to activate Virtual Machine Platform.
No automatic reboot, Docker terms acceptance or managed production resource was performed.

The [initial hosted workflow](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36614744871)
passed in3m30s: application lint/type/unit/build/browser job and local Linux Supabase
startup/reset/lint/20 pgTAP/10 real-client checks/stop. This proves the isolated runner stack,
not this Windows engine. The extended [PR workflow](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36616046623)
also passed all checks and the added security-advisor/generated-type commands. The advisor
reported no issues at its warning/error threshold; generated types passed TypeScript. Manual
comparison matched all table shapes and found four empty schema registries whose key types
needed tightening to the generated form. Applied that compile-time-only correction. See the [verification record](reviews/m1-database-ci.md)
for exact commands, job links and non-failing CLI notices. [PR #1](https://github.com/xpexellent-dotcom/msrc-2027/pull/1)
preserves this focused change for review; no merge or release was performed.

Changed scope: CI verification steps, empty schema registry types, README and ownership/decision/progress/evidence notes.
No application UI, dependency/lockfile, migration, seed, operational flags or business values
changed. ENG-005 distinguishes authorized personal development custody from the unresolved
institutional production handover. Remaining Windows commands are listed above and in README.

## 29 September 2026 — M1-only reproducibility follow-up

Scope: audit and close engineering-foundation gaps in the existing repository. Preserve
M2/homepage/About and the backlog; implement no operational workflow or new public page.
Recorded ENG-004. Corrected local Auth infrastructure configuration so the pinned CLI can
provide its publishable key, while every signup setting and application auth gate stays
closed. Added a safe local-env helper, 20 unit checks, ten live-local client checks and
the database CI steps. Final review corrected reset/pgTAP custom-network flags and kept
credential-bearing CLI startup output out of CI logs. Added 29 README-only playbook
boundaries; these create no routes.
Updated Windows/local setup instructions and feature notes. No dependency, lockfile,
migration, source snapshot, production service, real credential or participant data changed.

Executed evidence:

- PASS: `pnpm install --frozen-lockfile`; `pnpm check` (lint, route types/TypeScript,
  **89 unit tests**, production build); no operational route appeared in the build.
- PASS: `pnpm test:e2e`, **60 tests in 36.8 seconds**, clean exit. An earlier run also
  passed all cases but Windows sandbox process cleanup stalled; only its verified owned
  server was stopped. The rerun with local process permissions resolved that limitation.
- PASS: fresh local Git clone with the current patch, no copied dependencies or environment
  files; frozen install downloaded 400 packages, `pnpm dev --port 3024` started, and eight
  English/Arabic desktop/mobile/navigation/closed-endpoint smoke checks passed. Screenshot
  evidence is in ignored `deliverables/m1-verification/`; the verification server was stopped.
- BLOCKED: `pnpm db:start` found neither Docker nor Podman; WSL is not installed. `pnpm db:env`
  failed safely without creating a file; `pnpm db:integration` exited 1 on missing local
  settings, so none of its ten live assertions executed. pgTAP/reset/lint/types remain unrun.
- NOT TESTED: hosted GitHub CI and deployment; no Git remote or production connection.
- Final file, whitespace, environment and credential-pattern checks are recorded in the
  [M1 review](reviews/m1-foundation.md). Such scans are scoped evidence, not a security certification.

Full command/result details, acceptance matrix, file inventory, remaining setup and rollback
are in [M1 verification](reviews/m1-foundation.md). Local app acceptance passed; local
database and hosted CI acceptance are explicitly outstanding. Preserve this checkout in a
durable project location because its current parent is a temporary preview directory.

## 29 September 2026 — Complete implementation backlog, documentation only

User scope: plan all 24 requested epics using the master context and v0.5, with small
PR-sized issues and a separate Decision Required list. No application code requested.

Created [docs/backlog](backlog/README.md): **152 implementation issues**, **13 decision
packets** and Markdown/CSV indexes. Each issue contains its title, source/status, purpose,
scope/exclusions/dependencies/roles, states/data, acceptance criteria, bilingual and
accessibility behavior, security/RLS, audit/email, automated tests/manual UAT, release gate,
owner type and explicit TBD blocking status. All 13 CFG question sets are retained verbatim;
confirmed choices and configurable defaults remain distinguished from unresolved inputs.
Existing M1/M2/homepage/About evidence is recorded as local completion with release gates.

Changed files: 24 epic documents, Decision Required, backlog README and validation evidence,
two CSV indexes, plus navigation/continuity updates in root README, DECISIONS, ROADMAP and
this PROGRESS file. No source snapshot, application code, migration, dependency, environment
variable, provider resource, DNS record or production state changed. No real messages or
external issues were created. No new organizer decision was made.

Executed documentation verification:

- PASS: all 24 epics, 165 unique issue bodies and all 19 required metadata fields plus titles.
- PASS: every cited source ID exists; all 212 source IDs covered, including implementation
  references for all 199 non-CFG requirements/acceptance IDs and separate CFG decision packets.
- PASS: no dangling exact issue references or cycles in the explicit implementation dependency
  graph; integration prerequisites remain in activation gates and need end-to-end evidence.
- PASS: 215 local Markdown links, 165 stable anchors and 13 verbatim CFG question sets.
- PASS: CSV row counts (165 issues / 212 source IDs), new-document whitespace checks and
  `git diff --check`; actual Git state/history inspected before work.
- Independent review fixed missing actual KAU handoff, live sender setup and annual data
  separation slices; tightened workshop overlap checks, split media processing and clarified
  implementation versus activation dependencies. See [validation record](backlog/VALIDATION.md).

Commands: inline PowerShell document/source parsers with `Get-Content`, `Get-ChildItem`,
`Test-Path`, `Export-Csv`, `Import-Csv`; reference/cycle checks over parsed results;
`git status --short`, `git log -3`, `git diff --check`.

Lint/typecheck/unit/browser/database tests/build: **NOT RUN for this documentation-only
task**. Prior results are not new passes. The recorded local database container blocker,
unverified hosted CI/infrastructure and pending manual accessibility/content checks remain.
No UI changed, so no new screenshot or preview test was required. Named decision owners and
due dates remain unassigned; production gates remain closed. Documentation rollback needs
no database or environment action. Next smallest tasks are listed above and in the backlog.

## 29 September 2026 — M1 local foundation

Requested outcome: the smallest reproducible local engineering foundation, preserving
the handoff and using synthetic data. Branch: local `main`. See ENG-001 in DECISIONS.md
and [foundation feature notes](features/foundation.md).

Source IDs: INF-01/02/04/05, SEC-01/02/06, ROL-01, LOC-01/02/03, CMS-04,
ACC-01, ERR-01, TIM-01, CFG-01/02/07/10/12, REL-01 through REL-06.

### Observed starting environment

- Working folder: Codex temporary preview copy `MSRC27_Codex_Handoff`; separate Downloads
  copy was read-only. No app, package manifest, lockfile, Git history or remote existed.
  No other local website repository was identified among registered projects.
- System Node25.6.0, npm11.8.0, pnpm11.19.0, Git2.53.0.windows.3 available. Docker,
  Podman and Supabase CLI not initially available. No hosting/database/DNS inferred.
- Verified and downloaded official Node24.21.0 Windows executable into ignored `.tools/node`.
  SHA256: `ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32`.
  Pinned Supabase CLI installed as a project dev dependency. No system runtime replacement.

### Completed work

- Next App Router/React/TypeScript/Tailwind/pnpm baseline with exact direct dependencies,
  preserved lockfile, server-generated English/Arabic document direction, shared placeholder,
  skip link/language switch, loading, sanitized errors and genuine localized HTTP404s.
- Typed null conference settings and15 permanently closed server guards. Direct requests,
  spoofed roles, unsupported names, alternative methods and repeated/concurrent attempts are
  denied. No participant operations or real data are stored.
- Optional loopback-only browser/server data clients; CLI-generated local config, migration
  `20260929143136_foundation_samples.sql`, two synthetic fixtures and20 pgTAP assertions.
  No authentication, email delivery, storage or operational domains enabled locally.
- Environment example without secrets, loopback dev/start commands, README, frozen-install
  application/database CI with pinned actions. No hosted CI execution or deployment.
- Original AGENTS.md, consolidated context and all source files hash-checked against the
  Downloads handoff:13 files unchanged. Original source checksums remain historical; changed
  working documentation naturally differs from the handoff's SHA256SUMS.txt.

### Commands and observed evidence

All final application checks used Node24.21.0/pnpm11.19.0 on Windows, synthetic/no data,
and no environment credentials. In PowerShell, `. ./scripts/use-local-node.ps1` selects
the local runtime and fixes inherited PATH/Path casing for pnpm command resolution.

| Command / check | Result | Evidence / limitation |
|---|---|---|
| Runtime/package inspection; official docs/npm metadata; installed CLI `--help` | PASS | Versions pinned in package.json; compatibility choices in ENG-001. |
| `pnpm install --frozen-lockfile` | PASS | Fresh node_modules installation completed; exact lockfile accepted. |
| `pnpm install --frozen-lockfile --offline` | PASS | Final repeat on existing cache completed without changes. |
| `pnpm check` | PASS | Final lint with zero warnings, route type generation, tsc,41 unit cases, production build. |
| `pnpm test:e2e` with project browser path | PASS | Final28 cases,7.6s, exit0; production test server stopped automatically. |
| `pnpm audit --prod` | PASS | No known runtime dependency vulnerabilities reported by registry at execution. Not a security certification. |
| `pnpm dev` and in-app browser | PASS | Loopback3000, English/Arabic render; browser console inspection found no errors/warnings. |
| Visual inspection of6 production screenshots | PASS | Both languages at desktop1280, tablet791 and mobile393; no overflow after fix. |
| Supabase CLI help/init/migration generation | PASS | CLI2.118.0 generated config and migration name; no DB connection required. |
| Supabase startup | BLOCKED | `DockerLifecycleInspectError: docker: command not found (podman also not found)`. |
| Database reset/migration execution,20 policy assertions, lint/advisors, query, generated types | BLOCKED | Docker-compatible runtime missing. Hand-maintained fixture types not yet compared against DB. |
| Hosted CI/staging, Firefox/WebKit/real phones, full accessibility/load/recovery, runtime exception recovery | NOT TESTED | Outside observed local evidence; no remote configured or production target available. |

Browser evidence: ignored `playwright-report/index.html`, `test-results/.last-run.json`
and screenshots. The browser suite covers locale switching, keyboard skip, RTL, no forms,
reduced motion, unknown-route404, no-index headers, all15 workflow denials, method bypass,
spoofed role claims and concurrent/repeated denials. These are not capacity-allocation or
payment-concurrency tests: those workflows do not exist in M1.

Resolved setup/check failures: sandbox registry socket denial required approved network
execution; pnpm required explicit native resolver build permission; package-manager global
virtual-store defaults differed across contexts and are now explicitly disabled; Windows
PATH casing hid pnpm shims and is normalized only in the helper's process. Initial TypeScript
locale narrowing and one lint warning were corrected. A tablet overflow found visually was
fixed and added to coverage. Playwright now launches Next directly for reliable teardown;
final Windows run used approved execution so test-owned processes could be cleaned up.
Next's automatic AGENTS append was removed and disabled, restoring the original bytes.

### Remaining setup / release dependencies

- Technical owner (unassigned): install/start Docker-compatible runtime; run README local
  database commands, inspect API/RLS behavior and regenerate/compare types. No DB PASS claim yet.
- Organizational owner (unassigned): preserve this temporary project in a durable directory,
  establish organizational GitHub access/remote and observe hosted CI. Local automation Git
  identity is not an organizer or release approval.
- Re-evaluate ESLint9 compatibility/EOL before public release; current React/import plugins
  do not advertise ESLint10 support. No unsupported peer override was applied.
- CFG-09/10/11/12 ownership, privacy, regions, production services, final brand/content and
  public-launch evidence remain pending. All operational gates stay false, including CMS,
  advisory assessment, registration, payments and scientific/competition/event workflows.
- No real email, payment, cloud provisioning or DNS work was performed. There is no public
  launch approval and this synthetic foundation is not production-ready.

Next smallest task: F07 / M2 shared design primitives and bilingual component review.

## 29 September 2026 — M2 design system and focused M3 homepage

Requested outcome: a cinematic bilingual homepage preview and shared accessible UI
foundations. Continued the actual clean local M1 repository at `0d2f728`, preserving the
handoff and closed operational boundaries. Decision: ENG-002. Feature notes:
[design system](features/design-system.md). No remote or production service was added.

Source IDs: SCP-02, DSN-01/02, LOC-01/02/03, ACC-01, CMS-04, MED-01 through MED-04,
CFG-12; existing INF/SEC/REL foundation constraints remain in force.

### Implemented and inspected

- Working five-color tokens, locally served DM Sans/Inter/Noto Sans Arabic, semantic
  states, responsive containers/type, header/mobile navigation/footer/language switch,
  buttons/links, section headings and accessible field/status conventions.
- Focus, disabled, busy/loading, hover, press, error-summary/field validation and success
  states in the local/staging showcase. Only predefined synthetic choices are retained
  across language switches; scientific sample text remains English/LTR in Arabic.
- Homepage hero, conference introduction, four participation pathways, explicitly
  illustrative program rows, previous-edition context and full typed public sitemap.
  Empty sponsor/gallery sections are omitted. Dates/venue remain unconfirmed; no names,
  old sponsor logos, proposed dates, countdown, prices or capacities became public claims.
- Original abstract poster. No conference footage or final marks were available/cleared.
  Separate synthetic motion fixture exercises muted inline playback, pause/resume,
  reduced-motion/save-data/slow-network/hidden-tab rules and poster-on-error behavior.
- Server-only dynamic showcase gate, disabled by default in a production build and always
  disabled for Vercel production. All 15 operational gates remain closed, including CMS.
- Existing application CI automatically includes the new tests. No database/schema changes.

### Commands and observed results

All checks used Node 24.21.0 / pnpm 11.19.0 and local synthetic content, without credentials.

| Command / check | Result | Observed evidence / limit |
|---|---|---|
| Official font/media/test docs, registry metadata and local CLI help | PASS | Next local font API, pinned Fontsource packages 5.3.0, axe-core/playwright 4.13.0; font OFL notices retained. |
| Exact dependency installation; `pnpm install --frozen-lockfile --offline` | PASS | Updated lockfile accepted; final repeat completed with no changes. |
| `pnpm check` | PASS | Final ESLint zero warnings, route types/tsc, 69 unit cases and optimized production build. |
| `pnpm test:e2e` with local browser path | PASS | Final 45/45 Chromium cases, 27.1 seconds, exit 0; test-owned production server stopped. |
| Bilingual responsive/keyboard/RTL checks | PASS | Home at 1280, 791 and 412 CSS px; additional 320px checks. Menu Escape/refocus, skip link, native anchors, query/hash and synthetic choice preservation. |
| Text enlargement and overflow | PASS | 200% root text at desktop/tablet/mobile; heading clipping checks; narrow-phone legacy graphic bounds. |
| Eight axe WCAG 2.2 AA rule scans | PASS with scope limit | EN/AR homepage/showcase at desktop/mobile: zero violations. Gradient media text and decorative glyphs have manual-review records; this is not a full accessibility certification. |
| Contrast and visual review | PASS for current preview | Text combinations measured by axe include neutral 4.90:1, ink/gold 7.05:1, purple/ivory 12.20:1 and muted/ivory 5.93:1. Original poster/screenshots visually reviewed; focus ring corrected on dark showcase surface. |
| Media controls/failure/preferences | PASS | Synthetic video actually plays, pauses/resumes, and falls back after aborted fetch. Reduced-motion/data-saving modes request no video. Homepage requests no video or third-party fonts/embeds. |
| Actual production showcase denial | PASS | Local production server: EN/AR showcase HTTP404 without flag; EN/AR HTTP404 even with true flag when VERCEL_ENV=production. Owned test process stopped. |
| No-operation regression | PASS | Existing direct/method/spoofed-role/repeated/concurrent denials remain covered; demo form creates no POST or participant record. |
| Dev server / in-app preview | PASS | Loopback port 3000 renders current homepage; server restarted after dependency reinstallation. |
| Hosted CI/staging; Firefox/WebKit/real phones; screen readers; full WCAG audit | NOT TESTED | No hosted target/remote; local Chromium evidence only. Final human Arabic editorial review remains pending. |
| Real-footage frame contrast, crop, codecs and bandwidth measurements | NOT TESTED | No cleared final footage/poster exists. Synthetic fixture is not production media validation. |
| Local database execution | BLOCKED (unchanged from M1) | Docker/Podman unavailable; no DB changes in this task. |

Evidence: ignored `deliverables/m2-preview` contains named EN/AR desktop/tablet/mobile
full-page and entrance screenshots, 320px entrances, component screenshots, eight detailed
axe reports and `accessibility-summary.json`. `playwright-report/index.html` has the test
report. Tests regenerate artifacts; screenshots are not approval of final content.

Resolved findings: initial browser run passed 37/45. Four checks needed a form-scoped alert
selector because Next also provides a route announcer. Real enlarged-text header overflow
was fixed with wrapping; heading wrapping and narrow legacy artwork were checked. A gold
button's contrast was caught during the entrance fade, so text now remains fully opaque
during the 400ms/12px rise. The dark showcase focus ring now uses ivory. Final rerun passed.
The package-store mismatch was repaired with a local store and non-optimistic install checks.

### Remaining inputs and next task

CFG-12 still needs final MSRC/KAU marks, brand/typography approval, approved EN/AR copy,
hero/poster rights and selection, accurate past-edition captions/assets, approved program,
speaker/committee/sponsor content and legal/contact text. Exact delivery fields and asset
slots are in [MEDIA_REGISTER.md](MEDIA_REGISTER.md) and [design-system notes](features/design-system.md).
No public launch, real email, payment, production provisioning, DNS change or operational
opening occurred. The working folder remains a temporary Codex copy; preserve the archive
in a durable project location. Next smallest task: the approved bilingual About page slice.

## 29 September 2026 — M2 review and bilingual About page

Requested outcome: review the completed M2/homepage changes and continue with the bilingual
About page. Starting evidence: clean local `main` at `8f6d020`; foundation parent `0d2f728`.
Decision ENG-003; [review record](reviews/m2-homepage.md) and [About contract](features/about.md).

### Review result and scope

No actionable defects were found in the inspected M2 change. Source/content boundaries,
bilingual navigation, shared accessibility states, preview gating, media behavior and closed
operational routes were reviewed. Focused design-contract/media unit execution passed
28/28 cases. This review did not execute a database or certify unimplemented payment,
capacity, review-anonymity or data-retention workflows.

A meaningful browser coverage gap was closed: explicit user pause now gets tested across
reduced-motion on/off changes before resuming. This is a coverage improvement, not a claim
that a reproduced M2 bug was fixed. An independent inspection of the new About/navigation
slice also found no actionable defect; browser evidence is recorded separately below.

### Implemented slice

- `/en/about` and `/ar/about` provide localized metadata, semantic breadcrumbs, identity,
  purpose, intended community and working links to the homepage participation/program overview.
- Complete typed English/Arabic copy is adapted from source context in CONFERENCE_BACKGROUND
  (S3 pp1,4,13,17,33,37). A visible draft notice retains CFG-12. Audience context explicitly
  does not define eligibility; host institution does not establish an approved venue.
- Header/mobile/footer About links now reach the standalone page. The homepage introduction
  has a contextual About link. Current-page indication and current-page mobile menu focus
  are supported; language switching preserves the route, query and section.
- Reused M2 tokens and components; no new media, dependency, database/storage read, personal
  input, mutation, authentication, email, audit transition, operational state or durable job.
  All 15 operational guards and all unset business values remain unchanged.

Source IDs: SCP-01/02, LOC-01/02/03, CMS-04, DSN-01/02, ACC-01, CFG-12, REL-01.
Original AGENTS/source snapshots remain unchanged; no organizer decision was superseded.

### Executed verification

Node 24.21.0 and pnpm 11.19.0 were confirmed again. Dependencies and lockfile were unchanged.

| Command / check | Result | Evidence / limitation |
|---|---|---|
| M2 focused review unit command | PASS | 28/28 media-policy and design-contract tests, exit 0. |
| Scoped About ESLint | PASS | New content/page checked with zero warnings. |
| `pnpm check` | PASS | ESLint, Next route types/tsc, all 69 unit cases, optimized build; both About locales prerendered. |
| Scoped ESLint after final test adjustments | PASS | Updated About, media/navigation browser tests and content contract; zero warnings. |
| `pnpm test:e2e` | PASS | Final 60/60 Chromium cases, 38.5 seconds, exit 0; owned production test server stopped. |
| About browsing/navigation/content | PASS | Six language/viewport combinations; real 200 routes and /fr/about HTTP404, header/footer/breadcrumb/homepage CTAs, menu focus, locale/query/hash continuity, no operational form or POST. |
| Responsive and accessibility | PASS with scope limit | About at 1280/791/412 CSS px, extra 320px checks, 200% text and glyph bounds, keyboard/skip/focus, RTL and reduced motion. Six About axe scans plus eight retained M2 scans: zero violations. Manual/real-device audit still required. |
| Screenshot inspection | PASS | EN/AR About desktop/tablet/mobile and narrow entrances; current homepage with About link. No clipping, overlap or RTL issue found. About axe reports have no incomplete items; M2 reports retain their documented contrast-review caveats. |
| Media pause persistence and prior regressions | PASS | User pause survives reduced-motion toggle before explicit resume; previous media failure and workflow-denial regressions retained. |
| Live dev preview | PASS | In-app About route on loopback3000 renders; inspected console had no errors/warnings. |
| Database, hosted CI/deployment, real-device/Firefox/WebKit, screen reader/full WCAG audit | NOT TESTED in this task | No data changes. Prior DB execution remains BLOCKED by missing Docker/Podman; no remote deployment or broader audit performed. |

Initial browser run: 54/60 passed; six new navigation assertions expected a slash before the
homepage fragment although Next normalized the rendered href. Selectors were corrected to
the actual destination and still verify the resulting URL/visible target. No product behavior
was weakened. Final full rerun passed. Screenshot/accessibility evidence is saved in ignored
`deliverables/m3-about`; the complete browser report remains in `playwright-report`.

### Release state and remaining work

This remains a local unindexed draft. Final bilingual editorial review, institutional/organizer
naming approval, branding/media and all REL-01 public launch requirements remain open.
No production service, DNS, real email/payment, CMS or participation opening occurred.
The next bounded task is approved homepage/About copy refinement, followed by a Dates and
Venue content slice once its inputs are provided. Docker execution and durable organizational
repository ownership remain independent setup needs. Preserve the latest project archive
outside this temporary workspace for continuity.

## Session handover template

```markdown
### Date / task / branch or revision
Requested outcome:
Source requirement IDs:
Completed change:
Files and migrations:
Commands run and observed results:
Visual checks / preview:
Checks not run and why:
Decisions made or changed, with authority:
Outstanding blockers and owner:
Feature flags / configuration changes:
Release status and evidence:
Next smallest task:
```

## Evidence status vocabulary

- PASS: actual check performed with recorded evidence.
- FAIL: actual check found a defect.
- BLOCKED: named dependency prevents performing the check or opening the flow.
- NOT TESTED: no execution evidence yet.
- PROPOSED: design/engineering choice awaiting adoption or approval.
- SELECTED: organizer chose the approach; implementation/authorization still separately evidenced.

## Change log

- v1.0, 29 September 2026: consolidated current sources, added durable Codex instructions, corrected CMS identity sequencing, retained unresolved source conflicts, and prepared staged development prompts. No live application or infrastructure changes.
