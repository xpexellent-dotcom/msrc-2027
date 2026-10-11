# ENG-025 participation and speaker refinement

## Audit before implementation

| Before | After | Why |
| --- | --- | --- |
| Participation headers are flat purple; the same location block fills the right side. | Requested real photographs under restrained blur and purple tint, with generous display text and medium primary actions. | Connect each path to the conference while preserving legibility. |
| Requirements are followed by repeated step and next sections. | One complete set of visual requirement cards, then practical links. | Keep rules findable without reading the same process twice. |
| Workshop pending state is only a large text block. | A native horizontal rail of visibly unannounced workshops with empty image fields. | Show the intended catalogue composition without inventing workshops. |
| Speaker cards sit on plain white. | Place the existing honest portrait placeholders on a restrained artistic surface. | Match the homepage visual language without implying an announced roster. |

The current task explicitly requests gradient headings, blurred photography and
visual cards; these override generic skill defaults against those treatments.
Native scrolling, EN/AR, reduced motion and closed operational routes remain.
There is no published brochure asset or functioning public ticket destination.
Those requested actions will show an unavailable state, rather than a fabricated
download or ticket. No new pause controls or continuous animation are introduced.

Requirements: DSN-01/02, LOC-01/02/03, ACC-01, REG-02/03, RES-01, WKS-02,
MED-01/04. No workflow activation, publication or private policy change.

## Implemented

- All five individual participation pages and Speakers use a shared photographic
  hero, soft blur and purple tint. Attend and Speakers use the specifically
  requested new photographs; research/workshops use IMG_2560. Hackathon keeps
  the left composition of IMG_9846 and 3MT uses the real presentation photograph.
  Header accents inherit the homepage's shared gradient typography.
- Research is titled Abstract submission. Medium top actions navigate to the
  visible availability message (Workshops navigates to its catalogue). Accessible
  descriptions retain the closed state, and no form or mutation is introduced.
- Requirements now appear once in spacious icon-led cards. Moved research
  attendance/supervisor rules, hackathon preparation and pending details, workshop
  certification, and 3MT pending details into these cards. Attendance removes the
  requested photography card and instead explains both-day certificate evidence.
- Resources offer working paths to the existing requirements, FAQ, participation
  and Program destinations. Ticket and brochure actions are disabled with an
  explicit explanation; there is no fake account, ticket or download flow.
- Workshop cards use a native horizontal rail with three visibly unannounced
  placeholders. Approved records retain their own content and closed booking
  state. Speakers use the shared one-shot ambient linework behind existing
  anonymous portraits; no new pause control is added.

## Verification

- PASS: targeted ESLint on the changed component, content and three browser test
  files, zero warnings (11 October 2026).
- PASS: `vitest run tests/unit/public-participation-copy.test.ts`: 4 tests,
  confirming email-based seat confirmation and private back-office wording.
- Added `fluid-journeys.spec.ts` for EN/AR photo/card mapping, real closed-state
  anchor navigation and focus, unavailable ticket/brochure controls, no writes,
  required research rules, native workshop rail keyboard behavior, and 320px
  reflow with doubled text. Browser execution remains with the root integration
  run; it was NOT RUN in this lane.
- Updated only superseded browser expectations: photography notice is now the
  requested certificate/preparation card; repeated steps are absent and their
  confirmation facts remain asserted in the requirement cards. Existing closed
  state, write prevention, privacy, metadata and accessibility checks remain.
