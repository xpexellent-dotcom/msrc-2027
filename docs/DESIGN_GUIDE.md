# MSRC 2027 website design guide

Snapshot: 30 September 2026. ENG-007 records the user's current M2 implementation approval for the specified palette, fonts and motion. Final logos, footage, public content and publication approval remain open under S1 CFG-12. Other component tokens are configurable engineering defaults.

Primary references: [Development Specification v0.5](../sources/Development_Specification_v0.5.txt), section 15 and CFG-12 (S1); [Website Brand Guide](../sources/MSRC27_Website_Brand_Guide.pdf), pages 1-2 (S4); prior development pack (S5); visible project conversation (S6); original [MSRC27 brand reference sheet in Canva](https://www.canva.com/d/zrujOnVYUtutnfB), with [text snapshot](../sources/MSRC27_Brand_Reference_Canva.txt) (S8).

## 1. Design intent and status

Build a cinematic, clear conference website for The 5th Medical Students Research Conference at King Abdulaziz University, Jeddah. The public experience should communicate the event and opportunities quickly, while participant and organizer screens prioritize clear states, actions and deadlines.

| Decision | Status | Source |
|---|---|---|
| Video-led homepage, clear conference hierarchy, clean transitions and responsive buttons | REQUIRED | S1 DSN-01 |
| Native wheel, touch and keyboard scrolling | REQUIRED | S1 DSN-01 |
| Muted decorative video, poster, pause control, reduced-motion behavior and low-bandwidth alternative | REQUIRED | S1 DSN-01 |
| English default and full Arabic RTL in the applicable interfaces | REQUIRED | S1 LOC-01/03 |
| Scientific/project content in English/LTR inside either interface language; reviewer/judge assessment screens in English | REQUIRED | S1 LOC-02/03 |
| WCAG 2.2 AA accessibility target | REQUIRED TARGET | S1 ACC-01 |
| Cinematic homepage inspiration from [Slush](https://slush.org/) | USER PREFERENCE | S6 |
| General information-layout inspiration from [ESC Congress](https://www.escardio.org/events/congresses/esc-congress/) | USER PREFERENCE | S6 |
| Exact palette and English fonts below | SELECTED M2 IMPLEMENTATION BASELINE | Current user request; ENG-007; S8 text; S4/S5 |
| Arabic font and motion timing below | SELECTED M2 IMPLEMENTATION BASELINE | Current user request; ENG-007 |
| Spacing, radii, shadows and semantic component colours | CONFIGURABLE ENGINEERING DEFAULTS | ENG-007 |
| Final MSRC/KAU marks, footage, translations and public content | OPEN PUBLIC-LAUNCH GATE | S1 DSN-02, CFG-12 |

The inspiration links record the user's preferences. This handoff does not claim a fresh audit of either site's current implementation. Carry over the cinematic entrance and clear content organization through original MSRC layouts and assets.

## 2. Working palette

The original Canva reference sheet's text explicitly lists these five values, corroborating the generated brand guide. S8 was read as text, not visually inspected; its metadata reports an update on 29 September 2026 at 12:16:35 UTC. Its tentative note remains preserved in the historical source. The latest explicit user request selects these values for M2 implementation (ENG-007); this does not settle final logo or publication approval under CFG-12.

| Token | Hex | Intended use |
|---|---|---|
| Royal purple | `#3B1E6D` | Headings, primary actions, active navigation |
| Warm gold | `#C9A24A` | Main hero action, restrained accents, key details |
| Ivory | `#F8F6F0` | Reading surfaces, forms and schedules |
| Soft lilac | `#DCCFF0` | Selected tabs and supporting surfaces |
| Deep ink | `#1F1930` | Body text, video overlays and footer |

Use CSS tokens so approved refinements propagate consistently. Define semantic states for errors, success, warning, information, disabled controls and focus when building components; those additional color values are currently unselected.

S4 page 1 reports these contrast ratios: ivory on purple 12.20:1; ink on gold 7.06:1; gold on solid purple 5.49:1; gold on ivory 2.22:1. Recheck the actual rendered combinations. Gold on ivory is decorative rather than ordinary body text. Check text over representative bright and dark video frames, including the paused poster.

## 3. Working typography and identity

| Use | Working default |
|---|---|
| English headings and buttons | DM Sans 600/700 |
| English body, dates and schedules | Inter 400/500 |
| Arabic interface | Noto Sans Arabic |
| Body baseline | 16-18 px with generous line height |
| Tracking | Normal body tracking; spaced capitals only for short English labels |

S8 explicitly names DM Sans SemiBold/Bold for headings and Inter Regular/Medium for body text. Noto Sans Arabic, body sizing and tracking guidance are extensions in S4, rather than details corroborated by S8. Final font approval and font licensing remain part of brand delivery. Test Arabic glyphs and weight parity on real bilingual screens. Do not force Latin tracking conventions onto Arabic.

Use source logos with original proportions and approved colors. Keep institutional marks in a clear logo strip. The brand PDF's clear space of 25% of mark height is a proposal; official mark guidance takes precedence. Do not treat the text wordmark in the illustrative PDF as the final MSRC 2027 logo.

Use one quiet wave motif at section edges and the footer. Typography, photography, spacing and hierarchy should carry the composition. The starter pack recommends an editorial feel and avoiding generic medical-blue styling, stock-doctor imagery, excessive gradients, glassmorphism and repeated card grids. Dark mode is outside committed scope under S1 DSN-02.

## 4. Homepage and information hierarchy

The following sequence is a working composition from S5. Adjust it around approved content and the current stage of the conference:

1. Video/poster hero with conference identity and one clear primary action.
2. Approved date and location summary, or clear forthcoming information.
3. Purpose and conference highlights.
4. Scientific program preview and approved featured speakers.
5. Research, hackathon and 3MT opportunities.
6. Important dates with server-consistent Asia/Riyadh presentation.
7. Past-edition legacy and approved historical media.
8. Sponsors and institutional marks.
9. Relevant final action and footer.

The public site must also support the required About, Dates/Venue, Program, Speakers, Workshops, Participation/Submission Guidelines, Teams/Committees/Board, Sponsors/Sponsorship, Gallery/Past Editions, Announcements, FAQ, Contact, Privacy and Terms pages (S1 SCP-02). The original Canva sheet includes a sample Research Programme with times. Treat that as reference-sheet sample content, not the approved 2027 schedule.

Build the useful minimum for each approved page. Hide empty editorial sections, use honest forthcoming states, and keep navigation working. Do not turn planning estimates, prior-edition speakers, old sponsors, draft prizes, unconfirmed dates or a screenshot's Register button into current public facts or live workflows. All public information and workshop availability remain browseable without login.

## 5. Hero implementation

Build in this order:

1. Static poster, semantic text, responsive crop and working navigation/action.
2. Keyboard-accessible pause/resume control and a stable still-image mode.
3. Reduced-motion and low-bandwidth behavior.
4. Approved compressed muted video.
5. Mobile crops, loading checks, frame contrast and performance review.

Working visual treatment: ink/purple overlay, ivory heading, restrained gold primary action and optional secondary informational link. The action should match the currently open workflow. During the informational release, it can lead to approved program or participation information. Decorative media must never delay access to content or registration.

The brand PDF's desktop illustration uses an image identified as past-edition material from Main File page 12. It is a design illustration, not a selected or cleared hero asset. See [MEDIA_REGISTER.md](MEDIA_REGISTER.md) for actual media status.

## 6. Motion, layout and interaction

| Behavior | Working default or required boundary |
|---|---|
| Scrolling | Native browser wheel, touch, drag and keyboard behavior; no scroll hijacking |
| Anchor movement | Smooth only when appropriate; respect reduced motion |
| Button feedback | 180 ms transition; 1-2 px hover lift; 98% press scale |
| Reveals | One 400 ms fade with up to 12 px rise |
| Reduced motion | Remove nonessential transforms/reveals and show a static hero |
| Touch controls | Working minimum 44 px targets |
| Keyboard | Visible focus, logical order, accessible menus/dialogs |
| Content resilience | Content remains available if media or animation fails |

Motion timings and dimensions are defaults from S4/S5, not final institutional brand rules. Repeated reveals, scroll-driven blocking and media-dependent navigation would violate the intended experience.

Use responsive type, generous whitespace, editorial content splits and program rows. Stack entry points on small screens. Operational forms need visible labels, field-level feedback, error summaries, saved-state feedback and clear recovery actions. Do not convey a state solely through color.

## 7. Bilingual behavior

English is the default. Public, authentication, participant and non-review organizer interfaces support Arabic with full RTL. Submission form instructions, labels and errors follow that bilingual interface requirement. The scientific/project content itself must be English and its fields remain LTR inside Arabic pages. Author names and official institution names may retain their correct original spelling. Reviewer and faculty-judge assessment screens are English-only; transactional emails are English-only (S1 LOC-01/02/03).

Use logical layout properties, mirrored directional navigation where meaningful, and controlled handling for email addresses, codes, numbers and mixed-language names. Preserve form data and workflow state on language changes. Required public fields need translations or a deliberately configured fallback; do not ship broken switches or mixed-language navigation (S1 CMS-04).

Arabic parity includes mobile menus, form errors, tables, dates, statuses, dialogs and empty states. The RTL version should receive the same layout review as English. The accessibility target is WCAG 2.2 AA; assess keyboard, focus, semantics, labels, contrast, text resizing and screen-reader feedback as well as visual layout (S1 ACC-01).

## 8. Components and visual review

Start with tokens, type, container/section, header, mobile navigation, footer, buttons, links, language switch, hero, section heading, program row and content split. Add speaker/sponsor components and form/status/table controls when their slices need them. Keep layout fixed and content structured for the CMS (S1 CMS-01).

Maintain a development/staging component page demonstrating English/LTR and Arabic/RTL, desktop/mobile, focus, disabled, loading, error and empty states. Secure any private content or privileged demonstrations. A CMS editor requires staff authentication and authorization before being enabled, even when participant signup is scheduled for a later milestone.

For each significant visual slice, record representative desktop/mobile and LTR/RTL screenshots, keyboard and reduced-motion checks, and any unfinished content. Use proportionate checks for small copy/style changes. Public launch still requires the gate below.

## 9. Design and media launch gate

- [ ] Design/content owner approves logo, palette, fonts and public composition.
- [ ] Required English/Arabic content and translations are approved.
- [ ] Dates, venue, speakers, sponsors, committees and CTA destinations are correct for 2027.
- [ ] Final hero poster/video and gallery assets have explicit publication approval and permissions.
- [ ] Native scrolling, keyboard focus, mobile layouts and reduced motion pass review.
- [ ] Hero text remains readable across frames and still-image modes.
- [ ] Closed operational features show accurate informational states.
- [ ] Draft previews remain private and unindexed.
- [ ] Approved media derivatives load efficiently; original files remain appropriately restricted.
- [ ] Privacy/contact/removal routes and archive responsibilities are configured.

This checklist implements S1 DSN-01/02, MED-01/04, CMS-04, CFG-12 and the public-release gate. Its items remain unverified until implementation and approval evidence is recorded.
