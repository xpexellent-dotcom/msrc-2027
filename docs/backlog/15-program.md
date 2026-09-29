# Program

M3 public program information, M4 secured content management and M9 event readiness. The typed homepage program preview is not a dynamic approved schedule. These issues implement the bounded program-specific records and behavior; shared CMS identity/publication infrastructure remains a prerequisite.

<a id="bl-pgm-01"></a>

## BL-PGM-01 — Edit a structured multi-day and parallel-session program

- **Source IDs:** PRG-01, CMS-01, CMS-02, CMS-03, TIM-01.
- **Status:** Planned; current homepage preview is not completion evidence.
- **Purpose:** Authorized organizers can maintain actual days, rooms and session details without editing application code.
- **Scope:** Structured days, parallel sessions, rooms, speakers, categories and bilingual descriptions; start/end instants; session-speaker links; draft/revision/preview using CMS grants; server validation of required schedule relationships.
- **Exclusions:** Invented dates/rooms/speakers, speaker accounts, public private contacts, arbitrary page builder, personal schedule creation.
- **Dependencies:** BL-CMS-01; BL-AUTH-01; approved actual dates/venue/program content; [DR-CFG-01](DECISION_REQUIRED.md#dr-cfg-01), [DR-CFG-12](DECISION_REQUIRED.md#dr-cfg-12).
- **Roles:** Assigned content/program editor and authorized publisher; speaker remains a content record without required account.
- **States/transitions:** Draft sessions can be previewed/revised; publish/unpublish/recovery use shared authorized CMS lifecycle; operational schedule changes follow BL-PGM-03.
- **Data touched:** Day/session/room/category records, translated fields, approved speaker links, UTC times and content revisions.
- **Acceptance criteria:** Sessions support parallel rooms and correctly ordered times; missing real dates/required translations prevents live publication; private speaker contacts never enter public projection; deleting/recovering draft content retains history.
- **English/Arabic:** Bilingual public/admin descriptions and labels; official scientific titles may be explicitly English/LTR without mixed navigation; controlled translation fallback only.
- **Accessibility:** Labelled datetime/room selection, keyboard structured editing, clear timezone/error text and semantic preview.
- **Security/RLS:** Scoped editor/publisher MFA and server validation; private draft APIs denied to anonymous users; separate speaker contact fields.
- **Audit/email:** Audit create/edit/publish/unpublish/recover; ordinary draft edits send no attendee emails; operational change notices handled by BL-PGM-03.
- **Automated tests:** Invalid interval/relationship, draft leak, translation gate, private-contact projection, unauthorized edit and revision recovery.
- **Manual UAT:** Build synthetic two-day parallel program, preview in both languages and recover a removed draft session.
- **Release gate:** REL-01 approved public content; REL-05 actual program/room correctness before event use.
- **Owner type:** Full-stack engineer with program/content lead.
- **TBD blocked:** Live content yes, CFG-01/CFG-12; synthetic schedule model and secured editing no after identity foundation.

<a id="bl-pgm-02"></a>

## BL-PGM-02 — Publish accessible day/category/room filtering

- **Source IDs:** PRG-01, SCP-02, SCP-05, LOC-01, ACC-01.
- **Status:** Planned.
- **Purpose:** Any visitor can browse the approved program and narrow it without login or creating a personal itinerary.
- **Scope:** Public published-session projection, day/category/room filters, event-timezone labels, meaningful empty state, stable shareable non-personal filter URLs; separate read-only My Bookings link when identity features exist.
- **Exclusions:** Personal schedule builder, full-site search, attendee names, draft sessions, inferred booking/seat entitlement from viewing a session.
- **Dependencies:** BL-PGM-01; public design primitives and approved content.
- **Roles:** Anonymous Visitor; Participant browsing the same public program; publisher controls source records.
- **States/transitions:** Filter selection changes only visible published sessions; no booking or attendance state is written.
- **Data touched:** Read-only published program and non-personal filter state; authenticated My Bookings reads actual records through its own authorization boundary.
- **Acceptance criteria:** Filters compose correctly and can reset; empty results explain recovery; all times label Asia/Riyadh; anonymous access works; unpublished sessions cannot be fetched by guessing IDs.
- **English/Arabic:** English-default and full Arabic RTL navigation/filter labels; approved bilingual descriptions; scientific titles preserve intended language/direction.
- **Accessibility:** Keyboard filters with selected state, announced result count, semantic session list/table, 200% zoom/mobile overflow checks and minimum touch targets.
- **Security/RLS:** Anonymous read limited to published projection; encode content; filter validation prevents arbitrary query access; no private caching in public responses.
- **Audit/email:** Browsing/filtering creates no consequential audit or emails; avoid tracking identities in URL/analytics.
- **Automated tests:** Combined filters/reset/empty state, locale routing, anonymous access, draft API denial, timezone formatting and axe/keyboard regressions.
- **Manual UAT:** Browse both languages on phone/desktop with keyboard and screen reader; compare same sessions across filters and timezone labels.
- **Release gate:** REL-01 approved bilingual content/accessibility; REL-05 current schedule when used during event.
- **Owner type:** Frontend/full-stack engineer with content and accessibility QA.
- **TBD blocked:** Technical filtering no; publishing actual schedule yes, CFG-01/CFG-12.

<a id="bl-pgm-03"></a>

## BL-PGM-03 — Publish schedule changes with affected-participant reconciliation

- **Source IDs:** PRG-01, WKS-07, EML-01, EML-03, EML-04, REL-05.
- **Status:** Planned.
- **Purpose:** Organizers can change a live schedule without silently leaving bookings or assigned participants with contradictory information.
- **Scope:** Change preview showing affected booked/assigned participants; transactional approved schedule revision; delegate workshop time/capacity conflicts to booking resolution; authorized general-change announcement option; durable event-specific notices.
- **Exclusions:** Automatically cancelling/refunding bookings, silently retaining new workshop conflicts, charging from program edits, unrestricted mass email without authorization.
- **Dependencies:** BL-PGM-01; workshop conflict/reconciliation service; durable email foundation; actual assignment/booking records.
- **Roles:** Authorized program publisher; Registration/Workshop Administrator resolves affected bookings; scientific/event assignment owner handles assigned presenters/judges.
- **States/transitions:** Proposed revision is previewed; approved publish updates public program and creates affected-user jobs; conflicting bookings enter the approved resolution workflow rather than silently becoming valid.
- **Data touched:** Program revision, affected-record references, conflict-resolution work items, notification event and deduplicated recipient jobs.
- **Acceptance criteria:** Only relevant booked/assigned recipients are notified by default; major general message requires explicit authorization; retry does not duplicate notices; workshop capacity/time edits cannot bypass allocation reconciliation.
- **English/Arabic:** Public/admin change views bilingual; scientific descriptions maintain language policy; all transactional change notices English with locale-aware links.
- **Accessibility:** Accessible before/after preview, textual conflict indication, keyboard confirmation and persistent dashboard change message where applicable.
- **Security/RLS:** Publish and booking-resolution privileges separated; preview exposes only necessary participant data; prevent client recipient injection and unauthorized broad announcements.
- **Audit/email:** Audit actor, previous/new schedule, affected scope and general-send approval; English durable jobs with honest queued/delivery/error states.
- **Automated tests:** Affected-recipient selection, duplicate publish, changed-preview race, overlap creation, unauthorized recipient override and failed-mail dashboard fallback.
- **Manual UAT:** Move a booked workshop into conflict, publish a room change and verify only appropriate synthetic participants receive queued notices; resolve conflict separately.
- **Release gate:** REL-05 program/event readiness and REL-02 booking-change rules where workshops are affected.
- **Owner type:** Full-stack engineer with program/workshop/event operations owners.
- **TBD blocked:** Synthetic change pipeline no; live schedule/booking handling and sender yes, CFG-01/CFG-07/CFG-10/CFG-12.
