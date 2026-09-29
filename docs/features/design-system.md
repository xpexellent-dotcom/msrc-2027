# F07 / M2 design system and focused M3 homepage

29 September 2026. Engineering preview only. Source IDs: SCP-02, DSN-01/02,
LOC-01/02/03, ACC-01, CMS-04, MED-01 through MED-04, CFG-12. Decision: ENG-002.

## What exists

- `/en` and `/ar`: original static hero, clear identity/date/venue state, introduction,
  four participation pathways, explicitly illustrative program format,2026 archive context,
  closing navigation and the complete public sitemap. No actual2026 media is displayed.
- `/en/design-system` and `/ar/design-system`: tokens/type/spacing, button variants,
  hover/press/focus/disabled/loading, status and validation examples, English/LTR scientific
  text inside Arabic, and an isolated synthetic video demonstration.
- Shared components in `src/components/ui`; bilingual shell/header/menu/language switch.
  Styles are divided into tokens, components, homepage, media and showcase files.
- Typed bilingual content and future sitemap in `src/content/public-site.ts`. Unpublished
  standalone pages remain404; footer entries distinguish pending content from working links.
- Self-hosted variable fonts through `src/lib/fonts.ts`, with three OFL1.1 notices retained
  in `docs/licenses`. No font service or other third-party media embed is contacted.

The program rows are editorial examples of formats, not sessions or an approved schedule.
Homepage labels/instructions are draft bilingual copy. No countdown, speaker/committee
roster, sponsor logo, proposed date, price or capacity has been invented. Existing typed
configuration remains unset and all15 server operational guards remain closed.

## Media and motion

The homepage has `heroVideo: null` and an original abstract poster. `HeroMedia` can enhance
an approved local asset with muted inline playback, pause/resume and a poster. It removes
the video source for reduced motion, data saving, reported2G/3G connections and hidden tabs;
on playback/fetch failure it shows a bilingual still-image notice. A user pause remains
paused after tab/preference changes. Network Information API absence means bandwidth is
unknown; final real-footage performance still requires browser/device measurements.

Buttons use180ms feedback and a1px lift/98% press. The hero enters once over400ms with a12px
rise. Text stays fully opaque throughout the entrance to preserve its contrast; this is a
small accessibility adaptation of the working fade recommendation. Reduced motion removes
the entrance, spinner animation and nonessential button transforms. Scrolling remains native.

`public/brand/synthetic-motion.webm` is original geometric test motion,61,190 bytes,
320x180,24fps, four seconds, silent VP8/WebM. It is labelled as synthetic and appears only
in the component showcase. It is not a proposed conference film or evidence of media rights.

## Preview boundary

`src/lib/preview.server.ts` permits the dynamic showcase in development, or with the
server-only `DESIGN_PREVIEW_ENABLED=true` for a local production build/protected staging.
`VERCEL_ENV=production` always returns404. The flag is not authentication. Keep remote draft
deployments protected; no-index metadata and headers only discourage indexing.

The demonstration form never posts data. It saves only a whitelisted synthetic choice in
sessionStorage in the same browser tab, with an in-memory fallback if storage is unavailable.
No free-text personal data or real research text is collected. This illustrates language
continuity, validation summary focus and success feedback; it is not registration or CMS.

## Exact content and assets needed next

Owners remain unassigned; none of these inputs blocks continued local engineering.

| Input | Required delivery / evidence | First destination |
|---|---|---|
| Brand decision | Approve/refine the five palette values, fonts and working composition; provide final MSRC2027 SVG/transparent marks, variants and clear-space rules | Header/footer/metadata |
| Institutional marks | Approved KAU/RPClub source files, approved placement and usage rules | Institutional strip, only after approval |
| Homepage and About copy | Approved English conference identity, purpose, scope and background, matched Arabic translation and named editorial reviewer | Replace draft homepage copy; build the About slice |
| Dates and venue | Actual approved dates, timezone, venue name/address and accessibility/location information | Details strip and later Dates/Venue page; leave null until supplied |
| Hero poster/film | Selected original/file ID, intended placement, explicit publication permission, rights/consent record, poster and desktop/mobile crop choice | Replace abstract poster; video remains null until cleared |
| Program | Approved session titles/types/times/timezone and speaker profiles; exact publication status for each | Replace illustrative rows; later Program/Speakers pages |
| Participation information | Final public research/hackathon/3MT/workshop instructions and bilingual labels; later release-gate evidence for actions | Informational pages only while workflows closed |
| Past-edition archive | Selected2026 images/clips, accurate captions/year/activity, rights/consent and approval per asset; approved historical facts if any | Legacy section and gallery |
| Sponsors | Confirmed2027 sponsor identities/tiers, approved logos/links and usage rules | Section currently omitted because no approved content exists |
| Remaining sitemap copy | Teams/committees/board, announcements, FAQ, official contact, approved privacy and terms content with Arabic equivalents | Publish each useful approved slice; no invented placeholders |

Final hero encoding budgets/crops, legal notices, contact/removal policy and publication
authorization are later release dependencies. Do not treat draft copy, the working wordmark,
synthetic motion or old source rosters as organizer approval.

## Verification and next slice

See `docs/PROGRESS.md` for commands actually executed, screenshots, failures corrected and
unrun checks. Automated Chromium/axe coverage supplements manual layout/focus review;
real-device, screen-reader, final Arabic editorial and real-footage reviews remain required.

Next smallest task: replace and approve the About/homepage editorial copy in both languages,
then implement the single About page using these primitives. Keep missing facts unset and
all operational flags closed. Full M3 public alpha is not complete in this focused preview.
