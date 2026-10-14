# Team & Organization page

Requirement IDs: SCP-02, CMS-04, MED-01–04, LOC-01/03, ACC-01, DSN-01/02, REL-01.

The existing `/en/team` and `/ar/team` routes replace their anonymous placeholder
gallery with the organizer-supplied MSRC 2027 staff roster. This is a public staff
page, not a participant or attendee directory. The current request authorizes
implementation and a pull request for review; merging, deployment and operational
activation remain separate.

## Source reconciliation — 14 October 2026

- [Team information Sheet](https://docs.google.com/spreadsheets/d/1-j9rLHJi9LEO1Z3FKNx2Xm-lS-5qqfGiK6VILvbqC4w/edit): metadata confirmed one `Sheet1` tab; fresh read `Sheet1!A1:Y40` contains 22 named source rows. Quotes and HTTPS LinkedIn links are copied from this read, with surrounding whitespace removed and `-`/empty cells omitted.
- [Portrait folder](https://drive.google.com/drive/folders/1aBVESHi9J-AZh9dF1Mc3BED-9fc9Isav): fresh listing and individual metadata confirm 13 photographs. All 12 main-roster photos were downloaded again and match the previously reviewed originals byte for byte. The remaining photo belongs to the names-only Academic Sessions co-leader.
- [Header image](https://drive.google.com/file/d/1ARHfenC4-rzVE9MRyNvv-htYGg-mFIKo/view): `IMG_6652.JPG`, a photograph of the MSRC 2026 auditorium, supplied in the current request. It is decorative historical context, not a photograph of the future 2027 event.
- Akram Awan now has the exact description **“The numbers are being difficult”** and [his supplied LinkedIn profile](https://www.linkedin.com/in/akram-awan-233a7b2bb/). Both are included.
- Current organizer screenshots and corrections govern names, titles and committee assignments over older leadership charts and the Sheet's spelling variants. Abdulrahman Ismail Maqbool heads Scientific; Fatima Salem Alfrhah heads Organization. Media & Design, Media Production and Evaluation belong to Organization.
- Laura Hamadi is Academic Sessions Lead, with **Mohammad Almehmadi** as names-only co-leader. This is distinct from Scientific Officer **Mohammad Alsayegh**. The latest explicit co-leader spelling takes precedence over the Sheet/photo label “Mohammed Almohmadi”.
- Hanadi Orayf's Media & Design members are the supplied names `رامه الغامدي`, `تمارا السندي`, `فاطمه الشقيفي`. The English preview transliterations **Rama Alghamdi**, **Tamara Alsindi**, **Fatima Alshuqayfi** remain editorial spellings for reviewer confirmation; the Arabic names retain the exact supplied spelling.
- **Lama Mastour Alsulami** appears in the Sheet but has no supplied assignment. She is excluded until an assignment is confirmed. **Areen Youssef** has an assigned lead role but no Sheet row or photograph; no biography/profile is invented.

## Roster

Two conference leaders, nine Scientific leads and ten Organization leads produce
21 portrait positions. One co-leader and three Design members bring the supplied
roster to 25 unique names. Leads and names-only member lists use English name A–Z
order; conference leaders retain their dedicated position above their committee.

| Scientific | Role | Organization | Role |
| --- | --- | --- | --- |
| Aishah Baothman | Program & Flow Lead | Areen Youssef | Media Production Lead |
| Akram Awan | Digital & Analytics Lead | Esraa Metwalli | PR & Finance Lead |
| Amal Sayqal | 3MT Lead | Hanadi Orayf | Media & Design Lead |
| Heba Mousa | Abstracts Lead | Lara Qawas | Evaluation Lead |
| Laura Hamadi | Academic Sessions Lead | Majed Aljabri | Logistics & AV Lead |
| Mohammad Alsayegh | Scientific Officer (Joker) | Noor Faisal Alquait | Registration Lead |
| Omar Alsaggaf | Hackathon Lead | Ola Altaib | Ambassadors & Outreach Lead |
| Reem Albeladi | Judges & Faculty Lead | Sara Qadi | VIP & Hospitality Lead |
| Toleen Alhindi | Awards Lead | Sarah Tayeb | Décor Lead |
| | | Sulaf Alghamdi | Operation & Workforce Lead |

Nine missing main portraits: Fatima Salem Alfrhah, Aishah Baothman, Amal Sayqal,
Laura Hamadi, Reem Albeladi, Toleen Alhindi, Areen Youssef, Noor Faisal Alquait and
Sarah Tayeb. These retain labelled pending-photo frames. Missing descriptions
and profiles are omitted. No generated replacement faces or biographies are used.
The screenshot's parenthetical **Scientific Officer (Joker)** is retained; the
descriptions Sheet does not supply a different title.

Interface headings, roles, controls and feedback are bilingual with RTL. Supplied
English display names and personal descriptions retain their original voice and
explicit LTR/English semantics on both routes. The Design popup shows the exact
Arabic member names on the Arabic route. Native-reader review of translated role
labels and confirmation of English transliterations remain editorial review items.

## Design and interaction

| Before | After | Why |
| --- | --- | --- |
| Eight anonymous slots | Two committees with real assigned people | Makes the approved organizing structure understandable |
| Standard placeholder cards | Ivory editorial gallery, bordered 4:5 portraits, proportional conference leaders | Keeps attention on the people and matches the MSRC palette |
| Placeholder introduction | Existing site photo-header language using the supplied historical image | Keeps the page consistent with other public pages |
| Potentially long inline member lists | Names-only **View team** native modal with bounded scrolling | Keeps portrait rows aligned as committees grow |
| No team browsing controls | Compact Both / Scientific / Organization text controls | Supports browsing without heavy navigation chrome |

The desktop split has two portrait columns per committee, four across overall.
It resolves into stacked committees with comfortable two-column phone layouts.
Portrait crops use the actual supplied images, local optimized WebP assets,
white frames, fine purple borders and a restrained curved-corner detail. The
original photography's natural backgrounds and expressions are preserved;
the wall/grey backgrounds in Heba's and Hanadi's photographs are not replaced.

Descriptions stay visible in italic inside literal double quotation marks.
Profile links open safely in a new tab. Team members stay in a native `dialog`
using the existing shared focus, Escape, backdrop and return-focus behavior.
Motion is short and purposeful: quiet portrait reveals, fine-pointer hover,
press feedback and a gentle modal entrance/exit. Keyboard actions are immediate,
and reduced-motion preferences remove movement. Scrolling stays native.

Portraits total 588,674 bytes before Next image optimization; the 1920×1280 header
is 174,802 bytes. Generated assets contain no original camera EXIF. Public pages
do not fetch Google Drive or Google Sheets at runtime. Source/asset SHA-256 and
dimensions are recorded in `docs/media/team-assets.json`.

No database, CMS mutation, authentication, participant workflow, email, scheduler
or hosted configuration changes are included. Structured roster content is a
typed local module; this slice does not claim a complete no-code committee CMS.

## Verification

PASS: the combined application check (lint, route types/TypeScript, 2,406 unit
tests in 62 files and an 81-page production build). After the scoped content/style
corrections, lint, types, four roster integrity cases and the production build
passed again. The targeted browser run passed all 144 cases across desktop,
tablet and phone, without retries: Team, existing public shell/sponsors/media,
and closed participant/staff regressions. Team checks include EN/AR filters,
names/profiles, decoded portraits and 4:5 geometry, native modal focus/dismissal,
320px and doubled text, an 83-name temporary stress list, and axe closed/open.

Eight final EN/AR captures at 1280, 791, 412 and 320px have no document overflow,
browser exceptions or third-party requests. The pointer popup uses a measured
220ms transition; keyboard and reduced-motion paths measure 0ms. Desktop/mobile
gallery and popup captures were visually inspected. A final source crop adjustment
centers Majed's portrait vertically to preserve hair/headroom with the full-size
optimized original. Asset bytes/hashes and the 4:5 frame remain unchanged.

The first browser diagnostic was 126 passed / 18 failed: placeholder initials at
2.98:1 contrast, narrow enlarged-text wrapping, and a test expecting curly quotes
instead of the requested literal double quotes. Fixes preserve the contrast,
geometry and quotation assertions; the final 144-case run passed. Diagnostic logs
are retained in the task's local review outputs, not represented as green checks.

Physical devices/assistive technology, native Arabic editorial review, hosted PR
CI and deployment are separate from this local evidence; see the PR's current
check rollup. This task performs no production release or database operation.
