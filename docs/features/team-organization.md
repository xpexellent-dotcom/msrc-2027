# Team & Organization page

Requirement IDs: SCP-02, CMS-03/04, MED-01–04, LOC-01/03, ACC-01, DSN-01/02, REL-01.

The `/en/team` and `/ar/team` routes show the organizer-supplied MSRC 2027 staff
roster. This is a public staff page, not a participant or attendee directory.
ENG-042 supplied the initial roster; ORG-050 and later owner corrections govern
the current composition and restrained refinement of PR #76. Operational
activation and hosted changes remain outside this slice.

## Initial source audit — 14 October 2026, commit `93e95fc`

These are the original intake receipts, not fresh Drive/Sheet reads in the
current refinement. Later owner corrections below supersede intake differences.

- [Team information Sheet](https://docs.google.com/spreadsheets/d/1-j9rLHJi9LEO1Z3FKNx2Xm-lS-5qqfGiK6VILvbqC4w/edit): the initial read confirmed `Sheet1!A1:Y40` and 22 named source rows. Quotes and HTTPS LinkedIn links were copied with surrounding whitespace removed; `-` and empty cells were omitted.
- [Portrait folder](https://drive.google.com/drive/folders/1aBVESHi9J-AZh9dF1Mc3BED-9fc9Isav): the initial listing confirmed 13 photographs. The 12 main-roster originals were downloaded again and matched previously reviewed files byte for byte. The remaining photograph was subsequently added for the Academic Sessions co-leader.
- [Header image](https://drive.google.com/file/d/1ARHfenC4-rzVE9MRyNvv-htYGg-mFIKo/view): `IMG_6652.JPG` depicts the MSRC 2026 auditorium. It supplies decorative historical context, not a photograph of the future 2027 event.
- Akram Awan's intake description is **“The numbers are being difficult”**, with [his supplied LinkedIn profile](https://www.linkedin.com/in/akram-awan-233a7b2bb/).
- **Lama Mastour Alsulami** had no supplied assignment and remains excluded. **Areen Youssef** has an assigned lead role but no intake Sheet row or photograph; no biography/profile is invented.
- Hanadi Orayf's supplied member names are `فاطمه الشقيفي`, `رامه الغامدي`, `تمارا السندي`. Arabic spelling is preserved; **Fatima Alshuqayfi**, **Rama Alghamdi**, **Tamara Alsindi** remain English transliterations for editorial confirmation.

## Current roster and owner corrections

Abdulrahman Ismail Maqbool heads Scientific; Fatima Salem Alfrhah heads
Organization. Media & Design, Media Production and Evaluation belong to
Organization. Current owner decisions supersede older leadership charts and
Sheet spelling variants.

Laura Hamadi is Academic Sessions Lead. **Mohammed Almohmadi**, the owner-confirmed
spelling, appears inside her card after her quote and LinkedIn, with his supplied
photo and profile. He is distinct from Scientific Officer **Mohammad Alsayegh**;
the owner removed the older parenthetical “Joker”. Laura's quote uses the
owner-approved capitalization **“A shot of espresso”**.

Two conference leaders, nine Scientific leads and ten Organization leads give
21 main portrait positions. One co-leader and three Design members give
25 supplied names. Founders remain **“Founders to be announced”** until their
records are supplied; no founder identities are inferred.

| Scientific | Role | Organization | Role |
| --- | --- | --- | --- |
| Aishah Baothman | Program & Flow Lead | Areen Youssef | Media Production Lead |
| Akram Awan | Digital & Analytics Lead | Esraa Metwalli | PR & Finance Lead |
| Amal Sayqal | 3MT Lead | Hanadi Orayf | Media & Design Lead |
| Heba Mousa | Abstracts Lead | Lara Qawas | Evaluation Lead |
| Laura Hamadi | Academic Sessions Lead | Majed Aljabri | Logistics & AV Lead |
| Mohammad Alsayegh | Scientific Officer | Noor Faisal Alquait | Registration Lead |
| Omar Alsaggaf | Hackathon Lead | Ola Altaib | Ambassadors & Outreach Lead |
| Reem Albeladi | Judges & Faculty Lead | Sara Qadi | VIP & Hospitality Lead |
| Toleen Alhindi | Awards Lead | Sarah Tayeb | Décor Lead |
| | | Sulaf Alghamdi | Operation & Workforce Lead |

There are **13 display portrait assets: 12 main portraits plus the co-leader**.
Nine main positions remain labelled pending: Fatima Salem Alfrhah, Aishah
Baothman, Amal Sayqal, Laura Hamadi, Reem Albeladi, Toleen Alhindi, Areen Youssef,
Noor Faisal Alquait and Sarah Tayeb. Missing descriptions/profiles are omitted.
No replacement faces, identities or biographies are generated.

Roles, controls and feedback support EN/AR and RTL. Supplied English names and
upright personal quotes retain explicit English/LTR semantics on both routes.
The member popup uses the exact supplied Arabic names on the Arabic route,
retaining the English A–Z source order. Arabic role translations and English
member transliterations remain editorial review items.

## Current design and interaction

The Program-style historical photo header, Founders panel and prominent,
proportional conference leaders are retained. Scientific and Organization occupy
equal desktop halves with two lead columns each, four across overall. The
owner-selected masonry gives each card the same following gap: A–Z reads **down
each column, then across**, rather than across aligned rows. Single-committee
desktop views use four columns; tablet uses three and phones normally use two,
with natural reflow for enlarged text.

The scoped refinement follows the owner's “without too many extra effects”
request while preserving the later layout and content corrections:

| Before | After | Why |
| --- | --- | --- |
| Drifting blurred orbs and pointer-following glow | Static ivory gallery background | Keeps attention on the people and removes continuous decorative work |
| Glass blur, gradient edges, card lift and layered shadows | Restrained white cards, thin borders and purple portrait framing | Makes the roster calmer without changing its structure |
| Large uppercase, widely tracked role labels | Readable medium-weight source casing | Restores the name/role hierarchy and improves wrapping |
| Dashed, filled co-leader inset | Photo/name/profile after Laura's details with a fine separator | Preserves the owner-confirmed addition with less framing |
| Long card/photo hover motion | Quiet 2% portrait hover over 180ms | Gives fine-pointer feedback while retaining the reviewed crop |
| Whole popup could scroll its heading out of view | Fixed gutters and heading/Close outside the scrolling member list | Supports short screens, enlarged text and keyboard scrolling |
| Local-only committee selection | URL committee filter | Keeps the selected view through navigation and language changes |

Original photography, natural backgrounds and expressions remain unchanged.
Portraits fill 4:5 frames using the recorded focal points; missing portraits use
a soft lilac pending surface. Quotes are **upright**, inside literal double
quotation marks. Profile links open safely in a new tab; linked portraits are a
pointer convenience, while the visible LinkedIn link remains the keyboard route.
Tracking parameters are omitted from LinkedIn URLs.

The existing native Dialog retains focus containment, Escape/backdrop dismissal
and return focus. Pointer entrance/exit is 220ms/160ms; keyboard and reduced-motion
paths are immediate. Existing portrait reveals remain; no moving backdrop,
glass layer, gradient edge or whole-card lift remains. Page scrolling is native
outside the popup. A Team-page effect temporarily locks background document
scrolling only while the popup is open and restores previous styles on close or
unmount. The bounded flex dialog uses container-aware heading layout and a
keyboard-scrollable member list.

`?committee=scientific` and `?committee=organization` select the corresponding
view; Both removes that parameter. Other query parameters and the hash are
preserved. Portraits load lazily with automatic image sizing and capped fallback
sizes; the header retains priority loading. Assets are local optimized WebP;
public pages never fetch Drive or Sheets at runtime. The initial 12-main-portrait
and header provenance/hashes are recorded in `docs/media/team-assets.json`, along
with the locally verified co-leader derivative and its source-verification limit.
The 13 portrait assets total 605,764 bytes; the historical header is 174,802 bytes.

No database, CMS mutation, authentication, participant workflow, email, scheduler
or hosted configuration changes are included. The typed local roster does not
claim a complete no-code committee CMS.

## Verification

**Historical receipt — initial editorial implementation, `93e95fc`:** lint,
route types/TypeScript, 2,406 unit tests in 62 files, an 81-page production build
and the final 144-case targeted browser run passed. That browser receipt covered
EN/AR, desktop/tablet/phone, portrait geometry, filters, native modal behavior,
320px/enlarged text, an 83-name temporary list and axe. Its first diagnostic was
126 passed / 18 failed; those failures and their fixes remain part of the
historical record. These results precede the owner gala/masonry passes and the
current refinement; they do not establish the current head's behavior.

**Current refinement — PASS:** `npx --yes pnpm@11.19.0 check`: lint, route
types/TypeScript, 2,406 unit tests in 62 files and an 81-page production build
(Node 24.21.0). The final six-file browser run passes **181 cases**, no retries,
across desktop/tablet/phone: Team, Axiom experiences, public shell, closed
workflows, participant and staff boundaries. Team checks cover EN/AR/RTL, URL
sharing/reload/language/Back/Forward, 13 decoded images, accurate image-size
fallbacks, 320px/200% text, an 83-name stress list at 320×480 and 844×390, popup
scroll/focus/dismissal, 160ms exit content, dynamic reduced motion, print and axe.

Independent bundled Chromium/WebKit probes pass eight short-screen EN/AR cases,
touch and pointer focus return, background scroll locking/restoration, query
history, opaque print text and dynamic reduced motion. Eight final visual states
at 1280/791/412/320px have no document overflow, browser errors or external
requests. Pointer entrance measures 220ms; keyboard/reduced motion measures 0ms.
The final visual captures and scoped interaction receipt are linked from
`docs/reviews/team-page.md`. Hosted CI is assessed in the PR's current check rollup.

The first refinement diagnostic was **91 passed / 9 failed**. The print span and
portrait reveal retained higher-specificity screen styles; scoped print/reduced
motion selectors correct both without weakening assertions. A separate WebKit
probe found pointer activation could leave focus on the page; focusing the Team
trigger before opening fixes return focus and has a retained regression test.
The final browser run and independent probes pass after these corrections.
Physical devices/assistive technology and native Arabic editorial review remain
separate from browser-emulated evidence. No production release is performed.
