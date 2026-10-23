# MSRC 2027 decision and configuration register

## 17 October 2026 — Hackathon Option E medical extension

Authority: the owner's selected written Option E direction and explicit follow-up
to keep the photographic purple header, photograph and gold Enter pill.
The referenced `.qa/opts/e.html` was unavailable; the detailed brief is the
implementation reference, not evidence of approval of an unseen mockup.
Requirements DSN-01/02, LOC-01/03, ACC-01; `/en/hackathon` and `/ar/hackathon` only.

Replace the earlier orbital/festival decoration with static DNA and a single ECG
beat. Reserve the empty hero cell for the helix and a separate full-width strip
for the ECG; use at most two faint lower heading-cell echoes. Phones retain only
the ECG. Mirror Arabic, preserve English/LTR track titles, and hide decoration in
forced colors and print. Dark glass track/day cards use 22px corners and fine
violet-to-gold bottom edges; connected step nodes follow the same local treatment.

The requested medical-hackathon label is the sole new copy and has an Arabic
translation. Preserve other copy, controls, routes and closed states. This
supersedes the Hackathon orb/circuit directions below while preserving the
photographic MSRC world, solid dark schedule and global design contract. It
authorizes no hosted configuration changes, workflow activation or merge.
[Implementation and evidence](features/hackathon-technology.md).

## 17 October 2026 — Hackathon technology throughout the page

Authority: the owner's follow-up asking for the technology theme across the whole
Hackathon page with only a few large pieces, and identifying the visible hero crop.
This refines the two-piece implementation below; DSN-01/02, LOC-01/03, ACC-01.

Use three related static orbital circuit studies: the empty desktop hero column,
the Benefits background and the opposite side of the closing section. Vary their
scale and angle; use thin purple/lilac strokes with sparse gold accents. At 1000px
and below show only the Benefits study. Mirror Arabic and fully fade the artwork
before every container edge so the hero no longer ends in a rectangular cutoff.
Preserve the later approved solid dark schedule and all content and actions.

[Implementation and verification](features/hackathon-technology.md),
[follow-up screenshots](reviews/hackathon-technology-flow-2026-10-17/README.md).

## 17 October 2026 — Restrained Hackathon technology theme

Authority: the owner's supplied technology landing-page reference and explicit
request to adapt it to MSRC branding without overdoing it. Requirements DSN-01/02,
LOC-01/03 and ACC-01; Hackathon presentation only.

Use one large, static orbital circuit study in the empty desktop hero column,
with thin lilac lines, limited gold accents and a deeper purple/ink photo wash.
Retain the existing Benefits circuit watermark; remove the Hackathon Steps echo
so desktop has two pieces and phones only one. Keep all content, actions and
workflow gates unchanged. No new image assets, motion or libraries are needed.

This builds on the later owner instructions recorded in PROGRESS: fewer large
studies and a solid dark two-day band. Those later instructions supersede the
earlier scattered-slot and gradient-transition direction below. The hero artwork
itself is physically clipped away from the text and buttons; the incumbent faint
Benefits backdrop is preserved. Other option pages and the solid schedule remain
unchanged. [Implementation and verification](features/hackathon-technology.md).

## 17 October 2026 — Participation artwork direction

Authority: the current explicit owner request. Requirements DSN-01/02, LOC-01/03,
ACC-01; presentation follow-up to ORG-053/054 and ENG-048.

For the five option pages only, replace the earlier animated background ribbons
with static, faint, page-specific SVG motifs: Attend contours/gold point, abstracts
scatter/gold trend, workshops cutting-mat grid, Hackathon circuit nodes, and 3MT
stopwatch/three-minute gold arc/sound waves. Place them in genuinely empty heading
space and outside the reading column, never behind text/cards/buttons. Use both
wide margins with varied shapes, heights and crops; phones get at most one quiet
accent. Mirror Arabic and hide decoration under forced colors. Retain and soften
the dark Hackathon two-day interlude. This supersedes ORG-054's decorative motion
direction on these pages only. Content, routes, actions and operational gates
remain unchanged; Homepage, Venue, Contact and Speakers are excluded.

Implementation and evidence: [participation artwork](features/participation-artwork.md).

## ENG-047 — Visitor interaction regression coverage, 16 October 2026

Authority: current requester real-user bug-hunt task. Requirements ACC-01,
LOC-01/03, DSN-01/02, PRG-01, MED-01/04, ERR-01/02 and REL-01.

Preserve public content/design and hosted settings. Fix only reproduced visitor
failures, with regressions that exercise state changes. Restrict generated locale
params to EN/AR so unsupported root URLs receive the existing routing-level 404
without JS. Keep zoom enabled and remove the unused viewport key Safari rejects.
JS-only header controls wait for hydration; native links remain usable. Enlarged
text can wrap the existing Team/filter composition instead of clipping content.

Contact response/body work has a 30-second client recovery bound, above the
existing 3-second admission and 6-second provider bounds. A timed-out POST stays
uncertain and never automatically resends; existing translated copy, preserved
draft and explicit new-attempt safeguards remain authoritative. No delivery,
database, production flag or new retry policy is activated.

Browser emulation is regression evidence, not hardware proof. Local HTTPS keeps
the private production CSP unchanged; ignored short-lived test certificates and
loopback-only servers are fixtures. Public native-video tests use HTTP loopback
because WebKit's decoder does not inherit Playwright's self-signed certificate
exception. CI isolates engine/profile mock state. No retry or timeout inflation
is used to hide a failure. Preserve raw failed/diagnostic receipts and list
unresolved native-device checks and deferred bugs in the
[review](reviews/real-user-bug-hunt-2026-10-16.md).

## ENG-042 — BL-AI-01 disabled DeepSeek transport, 16 October 2026

Authority: ORG-040 and the requester's scoped BL-AI-01 implementation task.
This supersedes ENG-018's Anthropic SDK/model, effort, fallback, caching and Batch
transport choices. It preserves its scientific-only payload, identity screening,
manual-review continuity and independent human/committee authority. IDs: AI-01–06,
PRV-02/03/07, CFG-03/09/10, REL-03.

- Use server-only plain `fetch` at the fixed official
  `https://api.deepseek.com/chat/completions` endpoint, a 60-second timeout and
  zero automatic retries, with redirect refusal and omitted ambient credentials.
  The approved configuration alone supplies Bearer authentication. Refuse endpoint
  and custom-header environment overrides; never log request/response bodies.
- Official documentation checked 16 October 2026 lists `deepseek-flash` and
  `deepseek-v4-pro`. Allow only `deepseek-flash` as requested and serving model;
  this documented current ID is not an immutable version pin. Strict configuration
  uses explicit `thinking: "disabled"` instead of Anthropic effort. Digest binding
  covers every operating value and fixed transport policy, with all six approvals,
  authority/MFA, atomic budget reservation and mid-operation rechecks preserved.
- Chat Completions documents `json_object`, not `json_schema`; the separate
  Responses API's schema format is not used. Keep fixed rules/rubric in the system
  message, sanitized science in the user message, explicit JSON/schema instructions,
  no tools/streaming/fallbacks/betas/cache directives and strict local validation.
- Require exactly one choice, validate the returned model and inspect
  `finish_reason` before content. `stop` permits parsing, `length` becomes
  `incomplete_output`, `content_filter` becomes `refusal`, and all other finish
  reasons become `incomplete_output`. Malformed/multiple choices or invalid final
  content become `invalid_output`. Ignore and discard `reasoning_content`, including
  in provenance/evaluation reports; no chain-of-thought is retained.
- No official batch endpoint was found in reviewed documentation/searches;
  existence remains NOT VERIFIED. `submitBatch`/`collectBatch` and local synthetic
  submit/collect return `batch_unsupported` without provider calls. Do not emulate
  batches with sync loops. Any future official batch integration is separate work.
- DeepSeek documents automatic disk caching and usual unused-cache clearance in
  hours to days. Removing application cache directives does not turn that off.
  Binding no-training, complete retention/deletion and institutional terms remain
  NOT VERIFIED. The provider/privacy, China transfer, evaluation, budget, rubric,
  disclosure and operating/integration approvals remain independent release gates.
- AI remains disabled. No real provider call, account setup, hosted configuration,
  UI, route, persistence, database migration, public policy change or live workflow
  is authorized by this switch. Synthetic fixtures remain explicitly unapproved.

Official URLs, verification limits, activation prerequisites and acceptance map:
[DeepSeek feature note](features/ai-assessment.md#deepseek-api-verification).

## ENG-044 — Staff sessions and shared-network hardening, 16 October 2026

Authority: the current implementer task, before staff approvers are invited.
Implement locally on `codex/staff-hardening`, stacked on the closed registration
foundation. The planner/QA reviews, reruns checks, commits and opens the PR.
This task authorizes no commit, branch, push, hosted migration, environment
change, invitation, real email or workflow activation.

Preserve ORG-015 exact-session regular-staff email assurance, ORG-016 Super Admin
password/TOTP, invite-only admission, ORG-043's minimum two active Super Admins,
CSRF on privileged actions, encrypted short-lived cookies, server/database
authorization and forced RLS. Privileged idle remains **30 minutes** and absolute
lifetime remains **eight hours** from the immutable native session origin. Token
refresh alone and passive/background observations do not record activity.
Current-session navigation and real user input may report activity through an
explicit same-origin, CSRF-protected POST; deny expired/revoked/held or otherwise
unauthorized evidence before moving activity. Verify a two-hour read-only work
session with periodic genuine navigation/interaction, plus idle/absolute denial.
Reuse the existing authenticated `msrc_session_activity` RPC and its existing
execute ACL: staff activity rechecks `msrc_staff.authorize(..., true)`, while
participant activity preserves `own_context(..., false)`. Add no client execute
grant or private schema/table privilege.

Save any provider-rotated session returned by privileged work before the next
request, including an authorized action that later fails safely. A failed refresh
must not grant authority. Logout remains a same-origin local-session removal:
clear its cookie even if its form token expired, a rate limit is exhausted, a
readiness gate closed, or provider/database work fails. Attempt application
revocation and native provider sign-out independently where session evidence is
available; neither failure may prevent local cookie removal. Preserve Origin/Host
validation; this exception does not relax tokens or limits on privileged actions.
When application configuration is closed/unavailable, the dedicated same-origin
logout header clears the two fixed cookie names without inspecting credentials
or constructing a provider; remote revocation then cannot be attempted. With a
valid configuration, an expired access token may be refreshed solely to attempt
remote revocation; no refreshed authority is retained in the browser.

Shared-network engineering bounds are **12,000 form admissions/IP/rolling hour**,
**300 password attempts/IP/rolling hour**, and **300 regular-staff email-code
issues/IP/rolling hour**. These allow a synthetic cohort of 100 people to perform
one activity report plus one administrative form action/minute, or three
sign-ins/code issues each per hour from a campus
egress address. These are abuse allowances, not an approved staff headcount,
provider quota or email budget. The email IP allowance narrowly supersedes
ORG-015's twenty/IP/hour under this explicit task. Retain strict account bounds:
password failures five/15 minutes; email resend 60 seconds, three/account/15
minutes, ten/account/rolling 24 hours, five wrong codes then 15-minute cooldown.
Account controls must survive session/IP changes and successful colleagues on
the same network must not share another account's lockout.

Apply the same **five failed entries then 15-minute account cooldown** pattern
to authenticator verification, with durable sanitized audit and unlock after the
window. This adds no email substitute, factor deletion or self-recovery bypass;
the existing other-Super-Admin recovery path remains in force. Show failed staff
password attempts through the existing Super-Admin-only audit boundary, with
time, known opaque account reference and outcome only; never retain submitted
passwords, raw/full IPs or provider payloads. Keep EN/AR/RTL presentation parity.
Portal attempts enforce the account counter. Direct managed-Auth wrong-code
requests remain subject to provider controls; native abuse-limit verification is
still a hosted release gate. The native guard additionally denies successful
direct TOTP proof while the portal account cooldown is active.

Document owner-run audit deletion by **28 January 2028**, with a fresh protected
backup, independently reviewed manifest-bound SQL, disposable rehearsal,
transactional guard restoration and external restore suppression. Record known
object-specific advisor exceptions in the existing baseline; do not change grants
or policies to silence them. New migrations remain **pending — owner applies
with the hosted change routine**, timestamped after `20261016110000`. Actual
checks and local database blockers belong in
[the O9 progress note](progress/2026-10-16-codex-staff-hardening.md).

Requirements: AUTH-04/05/06, ROL-10/12, ADM-04/05, SEC-01/02/06,
PRV-05/06, LOC-01/03, ACC-01, REL-06. Current behavior and limits:
[staff portal](features/STAFF_PORTAL.md); audit deletion:
[backup/restore](features/STAFF_BACKUP_RESTORE.md); known exceptions:
[advisor baseline](features/PARTICIPANT_ACTIVATION_RUNBOOK.md#advisor-baseline-and-evidence-status).

## ENG-045 — Private nonce CSP and server-rendered localized unmatched routes, 16 October 2026

Authority: the current local-only implementation task. Enforce a fresh nonce CSP
on EN/AR staff, participant account and registration documents, including encoded
locale aliases. Keep the existing public structural policy and SSG rendering.
Registration alone gains a dynamic nested layout; no operational gate opens.
Crossing between public/private pages through the shared Link loads a new document
so the browser installs the destination's policy. Scripts have no production
unsafe-inline/eval allowance. Browser connections, media and fonts are same-origin;
images additionally allow data URLs for QR/Next images. Style attributes retain a
scoped unsafe-inline exception for existing React/Next sizing and layout.

Next 16.3.8's throwing catch-all under the dynamic locale root emits an empty
error document before client recovery; a minimal production reproduction with a
server-only not-found component has the same failure. Remove that catch-all and
use documented experimental globalNotFound for routing-level unmatched URLs. The
global server component reads a proxy-controlled locale header, renders the full
lang/dir document and existing translated content, and keeps 404/noindex. Existing
in-route notFound() boundaries remain separate. No dependency upgrade or public
copy change. The experimental convention is covered by production-build tests.

Requirements: SEC-01/06, ACC-01, LOC-01/03, ERR-01, NFR-02, REL-06; ORG-008/013.
Design, full policy, implementation evidence and limits:
[strict CSP and localized 404](features/strict-csp-localized-404.md).
Progress receipt: [O9 task note](progress/2026-10-16-codex-strict-csp-404.md).
No hosted configuration, environment, migration, workflow activation, branch,
commit, push or PR is authorized by this decision.

## 15 October 2026 — Programme date card refinement

Authority: current requester screenshot and explicit instruction to make the
header box smaller, improve its gradient/transparency, and scroll to the correct
section when clicked. Apply to the programme hero date card in both languages.
Each day selects its existing programme filter and brings the stable programme
catalogue into view with keyboard focus and fixed-header clearance. Native and
reduced-motion navigation remain supported. Confirmed dates, venue, programme
publication state and calendar content are unchanged.

This authorizes the scoped reversible implementation; production merge/deployment
remains separate. Requirements: PRG-01, DSN-01/02, ACC-01, LOC-01/03.
Audit and verification: [programme header card](features/program-header-card.md).

## ENG-041 — Compact mobile menu and immediate registration access, 13 October 2026

Authority: the organizer's current phone screenshot and explicit refinement
request. Move the existing registration action/status above navigation; make the
dropdown smaller and align it with the physical right header edge in EN/AR.
Retain RTL content, all existing public destinations and the closed registration
state. Add short panel/text transitions and toggle press/icon feedback, with
immediate keyboard/reduced-motion behavior and native scrolling on constrained
screens. This supersedes ENG-028's preservation of the old mobile menu layout
only. Existing desktop navigation and operational release gates are unaffected.

Audit, implementation and observed evidence:
[mobile menu note](features/mobile-menu-panel.md). IDs: DSN-01/02, ACC-01,
LOC-01/03, REL-01. This request authorizes the scoped reversible implementation;
production merge/deployment remains a separate release action.

## ENG-040 — Edition photos and responsive album, 13 October 2026

Design correction before merge: keep Choose your path cards as full-image cards
on mobile, with copy over a strong dark bottom gradient. Do not place copy in a
separate footer or show years on these cards or other homepage backgrounds.
Years belong only to gallery photos. Use consistent image-frame proportions
within the path cards and within the galleries, with individual focal points
that retain the important subjects. This supersedes the initial natural-height
album and separated mobile photo/copy implementation. Verify the corrected
design before completing the already-authorized push and merge.

Follow-up authorization on the same date: remove audio from the four newly
supplied album clips, verify, push and merge the update. Deliver video-only
H.264 copies under new `-silent-v2.mp4` URLs and remove the audio-bearing public
copies. Preserve frame data, duration, dimensions and posters. This supersedes
the initial retained-audio/draft-only status for PR70 and authorizes its merge
after verification; it does not open operational workflows.

The organizer supplied a specific 22-file 2023–2026 Drive folder and requested
homepage/album use, subject-centered desktop/mobile framing, four-digit year
labels at the bottom-right inside each photo, and album order 2026 → 2023.
The dedicated “Build on an idea (2026)” photo is homepage-only; the remaining
17 photos and four clips form the archive. This explicit asset/placement request
supersedes older pending-selection status for these files only.

Preserve the original scene and supplied filename year. Keep original files'
dimensions and apply subject-aware framing in the interface. Gallery labels use
the requested digits and physical bottom-right placement in both EN and AR.
Keep historical content distinct from unannounced 2027 people/programme.
No public download controls, third-party embeds or operational opening.

This records requester selection, not an independent institutional rights audit.
Inventory, derivative identity, implementation and observed verification are in
[the feature note](features/edition-photo-album.md). Requirements: MED-01–04,
ARC-01, CMS-04, LOC-01/03, ACC-01 and DSN-01/02.

## ENG-039 — One gesture, one Venue journey stop, 12 October 2026

The organizer reports that the Venue journey only works when scrolled in a
specific way, that fast scrolling breaks it, that each map point takes several
scrolls, and that movement is not smooth. This explicit organizer decision
supersedes the ENG-037 and ENG-038 charge/hold entrance and the "native journey scrolling" part
of DSN-01 for this one page section only.

The journey now has four stops: the venue overview, Airport, Getting there and
Venue. One deliberate gesture moves exactly one stop in either direction:
a wheel flick of any speed, a single notch, a trackpad swipe with inertia, a
phone swipe, or ArrowUp/ArrowDown/PageUp/PageDown/Space. Gestures are separated
by a 170ms quiet gap (or a rising trackpad delta); input during a move, the rest
of the gesture that started it, and input within 220ms of arrival are consumed so
they cannot carry on as native scrolling. Moves are a 620–1100ms ease-in-out
tween, and the map camera follows stop-to-stop progress so it rests exactly on
each place. Overview -> Airport keeps the ENG-037 light-and-reveal scene; the
centered Begin action is unchanged.

Scrolling stays native above the overview and below Venue. A fast native fling
that crosses the overview or Venue is caught at that stop. Content taller than
the reading area is revealed before advancing. Reduced motion, forced colors,
enlarged text, zoom, inner scrollers, form fields and modified keys keep native
behavior. Implementation: `src/lib/journey-stepper.ts`; coverage:
`tests/e2e/venue-journey-stepper.spec.ts`.

13 October 2026 refinement, merged with the ENG-038 audit: an abstract gold
arrival thread (a smooth curve, never a road route, consistent with the existing
"not a driving route" note) draws from Airport to Venue with a travelling marker
as the journey advances. Chapters crossfade near the reading centre (55% eased
offset, fully faded by mid-move) instead of leaving an empty band; faded chapters
stay in the accessibility tree but take no pointer input, and visible keyboard
focus restores ordinary flow. Pins fade beneath map controls. Phones start each
chapter just below the pinned map. From ENG-038: a non-cancelable (latched)
wheel tail is held at the arrived stop, and scroll anchoring is disabled while
the stepper moves. Fixed the stretched FAQ link on the phone overview.

13 October 2026, organizer phone review: touch keeps fully native scrolling
(no automatic slide on swipe); the map camera, thread and traveller follow the
scroll position continuously, and phone chapter text moves 1:1 with edge fades
beneath the pinned map. Mouse wheel and keys keep one-stop stepping on desktop.
The overview and journey hand over through an eased fog matched to the
overview's rendered tone; below the overview the map is a dim horizon and the
journey controls, pins and thread arrive only once it covers the screen, while
the overview content fades. The Begin reveal feathers its rising edge. Section
targets no longer draw a focus frame after chapter links.

## ENG-038 — Venue input resilience, 12 October 2026

The organizer clarifies that the remaining failure occurs with ordinary fast
desktop wheel/trackpad scrolling and that the entrance must not require a
particular input technique. Read-only tests against the published PR64 source
confirm the gap: one large wheel packet retains only about one sixth of its
earned charge, while a trusted non-cancelable fling can pass the gate without
entering. Earlier green checks remain valid for their tested scenarios; they do
not establish these newly reproduced paths.

Preserve the approved overview, centered Begin action, persistent/reversible
charge and 850ms real-section reveal. Credit full normalized scroll distance
against the existing 480px wheel/300px touch thresholds; supersede per-packet
effort loss. Smooth the visible earned target before release, displaying positive
glow for at least140ms and three held frames before the automatic scene. These
are visual feedback safeguards; they never add effort without scrolling. Recover a measured
native crossing only within a recent eligible input session, excluding owned
scroll writes and flushing pending native movement before another clamp. Reverse
effort drains charge and carries any remainder into ordinary upward scrolling.
Rearm only after a genuine return at least 128px above the overview gate.

Keep the final positive non-cancelable wheel tail bounded: 120ms quiet/new
cancelable/reverse-input exit, with an absolute ceiling 350ms after visual finish.
Explicit navigation, pointer manipulation, keyboard escapes, horizontal intent,
pinch and visibility changes clear stale intent. Benign observer delivery must
not shorten the reveal. Preserve native controls/inner scrolling, EN/AR/RTL,
reduced motion, short/enlarged reading, no-JS and precise native Airport landing.
No whole-site scroll lock, new dependency, provider, media or factual claim.

ENG-035's publication authorization continues for this public UI correction
after current-source checks, exact-head CI and owned serving/live verification.
Existing live source remains PR64's merge until that release is verified. No
hosted settings, database, operational flags, accounts or communications are
authorized. IDs: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03, MED-01/04, PRV-03, REL-06.
Audit and receipts: `docs/reviews/venue-input-resilience.md`.

## ENG-037 — Reliable scroll-powered Venue entrance, 12 October 2026

The organizer reports that normal scrolling bypasses the published overview
hold, glow and release. Fresh-page EN/AR wheel and touch reproductions confirm
that large approach gestures can cross the late listener band and falsely mark
the entrance complete without displaying charge. Existing boundary-aligned tests
did not establish a reliable approach from the top of the page.

The latest explicit cinematic instruction supersedes the old automatic 800ms
charge decay, 2.4-second escape, 540ms jump and 160px-only touch approach. Charge
is accumulated only from deliberate scroll input; pauses preserve it and reverse
input reduces it. Hold the measured overview, then use one 850ms layered reveal
of the real incoming Journey, with a flow placeholder, restrained map parallax,
heading reveal, bottom light and bounded blur. Restore normal document geometry
and land precisely at Airport. Begin your journey stays centered and invokes the
same reveal, including deliberate keyboard activation; reduced motion remains
direct. These values describe the approved implementation contract, not travel
or operational facts.

Wheel observation begins before the first approach gesture. Touch ownership is
decided on the first move of a single-finger gesture begun within the measured
approach band, bounded to two viewports before the entrance. Outside that band
and after the completed entrance, scrolling remains native. Preserve pinch zoom,
horizontal gestures, inner scrollers, native controls, keyboard/focus access,
Escape/Tab/Home/End, short/enlarged reading, no-JS and forced-color alternatives.
Never seize an already native, non-cancelable pan or lock body overflow. Restore
temporary styles, flow, effects and listeners on completion or interruption.

ENG-035's explicit publication authorization persists for this continuing public
UI correction after verification. No dependency, provider, approved fact, hosted
setting, database, operational flag, account or communication change is authorized.
IDs: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03, MED-01/04, PRV-03, REL-06.
Audit and current evidence: `docs/reviews/venue-scroll-entry.md`.

## ENG-036 — Correct the stalled CI browser archive, 12 October 2026

PR63's initial head dd432fc passed nine substantive jobs. Public shard2 exhausted
its20-minute budget during Playwright's APT dependency setup; its application tests
never started. Preserved logs prove the runner's file mirror list repeatedly
selected HTTP Azure, while canonical Ubuntu HTTPS InRelease requests succeeded.

Before the unchanged browser installation, a helper restricted to GitHub Ubuntu
24.04 x64 rewrites only the exact Ubuntu mirror-list/direct Azure URI in the two
known Ubuntu source files to the canonical HTTPS archive. Preserve suites,
components, signing keys, package validation, permissions, all tests, zero retries
and time limits. Do not modify third-party sources, cloud-init, hosted settings or
application code. This is the smallest source correction needed to complete the
already authorized release, not an automatic rerun of an uncertain failure.
Use a new exact-head CI attempt; retain the stopped attempt as incomplete evidence.
IDs: REL-06. Evidence: `docs/reviews/venue-overview-side-reading.md`.

## ENG-035 — Hold the Venue overview and restore side reading, 12 October 2026

The organizer clarifies the authored entrance: hold the complete opening overview
frame while continued downward input strengthens the bottom light and controlled
blur; release once into Airport. The Begin action stays centered. On ordinary
desktop viewports the complete overview fits below the shared header; tall,
expanded, phone and enlarged reading layouts retain their natural content approach.
The existing bounded input, reverse/keyboard/focus escape, reduced-motion and
no-JS safeguards remain. Native scrolling resumes after the one entrance.

Journey copy is vertically centered in a leading side column, left aligned in
English and mirrored in Arabic. Reduce heading size and exchange text earlier
with softer fades, preserving readable keyboard/focus and reduced-motion views.
Keep the map exposed and its north-up geometry, interactive controls, attribution
and self-hosted privacy boundaries. No new venue, travel, hours or operational facts.

The organizer explicitly requests publication after these changes and verification.
This authorizes the reviewed UI release, not hosted settings, migrations, new
accounts, operational flags or participant communications. ENG-034's unpublished
local implementation is included. IDs: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03,
MED-01/04, PRV-03. Evidence: `docs/reviews/venue-overview-side-reading.md`.

## ENG-034 — Venue collage and charged entrance, 12 October 2026

The requester approves the annotated layout and explicitly corrects ENG-033's
entrance: the opening holds at its lower boundary while continued downward input
builds bottom-origin glow and blur, then releases quickly to the Airport chapter.
The final correction keeps Begin your journey centered; its pointer action uses
the same release. Match Program's content-driven header proportions, typography
and selective gradient keyword. Four existing venue photographs overlap in the
header, gently zooming and coming forward on hover; phones use native swipe cards.
The light stage contains a large venue introduction, relocated campus map and
compact international/FAQ/Program guidance. Remove repeated lower content.

This is an explicit narrow exception to DSN-01's normal wheel/touch scrolling and
ENG-033's no-interception choice, not permission for whole-site scroll locking.
Only downward input at the measured opening boundary may be consumed. Successful
entry is one-shot for a visit; reversed gestures, keyboard, reduced motion,
short/enlarged layouts, non-cancelable touch, pinch, native controls, inner scroll
containers and no-JS retain direct/native navigation. Normal scrolling resumes
within the journey. No body overflow lock, global touch-action override, flashing,
perpetual animation, pause control or new motion dependency. Effects and listeners
must clear on interruption/unmount. Existing facts, EN/AR, north-up geography,
local attribution, explicit provider links and operational closure remain pinned.

The requester asks to commit this approved refinement after verification.
No operational activation, database/settings/DNS or communications are authorized.
Requirements: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03, MED-01/04, PRV-03.
Audit and evidence: `docs/reviews/venue-gallery-charge.md`.

## ENG-033 — Cinematic Venue hierarchy and journey, 12 October 2026

The requester restores an image-backed Venue header using the already published
`king-faisal-venue.jpg`, purple blur/tint, and Program's display typography with
selected gradient keywords. The campus map and one four-photo card move to a
balanced light stage with existing artistic linework and a centered Begin action.
Native scrolling earns one expanding map/light transition into the desktop
journey; centered chapter copy fades in/out as it passes. Arrival essentials
remain readable when opened. International guidance is a centered bottom
disclosure, followed by the Program action at the logical end and the footer.
The header is slightly longer/thinner, with about 11% lower base opacity, a fine
white rim and restrained gold/white material accents. ENG-028 scroll-up recovery
and ENG-032 phone map/target bounds remain authoritative.

This supersedes ENG-032's three-column ivory title composition and ENG-030's
left-aligned desktop reading column. Phones keep the compact interactive map;
short/enlarged, keyboard, reduced-motion, no-JS, forced-colors and print reading
paths remain accessible. No scroll interception, flashing effect, moving reading
text, perpetual animation or pause widget. Existing approved media/geography and
travel facts remain unchanged. ENG-031's public publication authorization persists
for this continuing refinement, subject to current-head/owned Production evidence.
No operational activation, hosted settings, database or communications authorized.
Requirements: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03, MED-01/04, PRV-03.
Audit and receipts: `docs/reviews/venue-cinematic-refinement.md`.

## ENG-032 — Compact venue opening and phone map, 12 October 2026

The requester brings the existing campus map into the opening beside one
scrollable photo card, removes Waze and the final-approach/different-light
captions, and asks for a thinner phone map and blurred passing content above it.
ENG-031's explicit publication authority continues for this refinement after
current-head checks and owned live verification. Google Maps and Apple Maps
remain explicit visitor actions; the existing self-hosted geometry, attribution,
approved travel facts and closed operational gates remain authoritative.

The normal pinned phone frame targets roughly one third of the viewport,
including chapter controls. Short/enlarged reading layouts remain unpinned with
enough space for controls and information points. Reduced motion uses immediate
chapter framing on normal phones and a static fitted overview in reading flow.
The opening preserves #venue-orientation for existing directions/bookmarks.
All-width gallery controls use immediate keyboard changes and native smooth
pointer scrolling, superseding ENG-030's local smooth-keyboard exception.
Requirements: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03, MED-01/04, PRV-03.
Audit and evidence: `docs/reviews/venue-hero-phone-refinement.md`.

## ENG-031 — Mobile venue exploration and publication, 12 October 2026

The requester supersedes ENG-030's review-only boundary and explicitly asks to
publish the improved Venue page. Prioritize a genuinely interactive phone map:
native scroll camera, tap details and visible zoom/reset controls. Preserve the
accepted desktop gallery and geographic identity. Reduce repetitive EN/AR prose
and use native progressive disclosures for travel and arrival guidance. Gentle
chapter fades may support progression; keyboard, reduced motion, enlarged text,
no-JS and print remain readable. No new travel, gate, timing or workflow claims.
Update PR 59, verify its final head, then merge and verify owned Production and
the actual live page. This authorizes public UI publication, not operational
activation, hosting settings, accounts, migrations or communications.

## ENG-030 — Venue arrival journey, 12 October 2026

The requester explicitly asks for a new review PR revamping Venue into a
full-screen, native-scroll journey from airport through Jeddah to the venue,
with interactive information points and four supplied purple-tinted photographs.
Whiteout and the supplied city-map artwork are composition references, not
reusable assets or approval of their implementation. Preserve the published
brand, EN/AR, phone reading, reduced motion, approved travel guidance and accurate
geography. No invented route, pickup, fare, gate or transport claim.

This request authorizes building and opening the PR; it does not request merging
or publishing the new Venue experience. Operational gates remain unchanged.
Audit and direction: `docs/reviews/venue-journey.md`.

## ENG-029 — Phone adaptation and venue presentation, 11 October 2026

The requester asks for direct globe language access on phones, removal of the
floating skip-content artifact while preserving keyboard access, natural mobile
hero progression, no redundant phone pathway index, aligned benefit icons/copy,
and a static gradient main hero title. The Program date panel becomes smaller
with approximately 15–20% transparency. The venue hero replaces its duplicate
dates box with the supplied actual conference-room photograph and a light tint;
date/day/calendar access remains on Program. Apply EN/AR and enlarged-text parity.
This is a continuation of the already approved public design publication scope,
without operational activation, new factual claims or hosting settings.

Audit and priorities: `docs/reviews/phone-venue-refinement.md`.

## ENG-028 — Seamless, scroll-driven navigation, 11 October 2026

Following approved live publication, the requester reports a center seam in the
header and requests a continuous material, approximately 10–15% more transparent
glass, smoother Vitarc-inspired movement, and no reopening from top-edge or logo
hover. Upward scrolling restores the expanded desktop bar. This supersedes the
pointer-approach restoration in ENG-023/024/025. Keyboard-visible focus remains an
immediate accessible recovery; the mobile menu and expanded Participate dropdown
retain their existing behavior. Scope is a refinement of the published design,
with no change to public claims, media, operational gates or hosting settings.

Audit and prioritized plan: `docs/reviews/header-glass-refinement.md`.

## ENG-027 — Publish the approved design, 11 October 2026

The requester explicitly approves the ENG-026 demo and instructs: "I approve of
the Demo, bring it into the live version." This authorizes publishing the approved
public design and selected assets through the existing GitHub/Vercel release
pipeline, including the release merge after required checks pass. It supersedes
the earlier local-demo-only scope for these changes.

Preserve the accepted EN/AR visuals, placeholder rosters and illustrative CME
qualification. Registration, submissions, accounts, payment, staff, email delivery
and other operational gates are unaffected. Approval to publish design is not
approval to open workflows, change settings or provision resources. No preview
flag needs enabling: public pages already render the approved components in
Production. Publish only the selected derivatives; retain source downloads and
superseded assets locally. Third-party license provenance remains separately
recorded without claiming additional rights verification.

Release verification retains the full public browser suite by partitioning its
640 cases across three CI runners. Worker counts, retries, assertions and job
timeouts remain unchanged. All three public shard statuses are required for this
release alongside the existing application, Contact, participant, staff and
database checks. This changes test scheduling only, not repository protection or
hosting settings.

## ENG-026 — Track index and selective emphasis, 11 October 2026

The requester adds a sticky five-track index that follows the visible pathway
card during native scrolling, inspired by Cerebrium. Links remain ordinary
keyboard-accessible anchors; mobile/short layouts avoid a sticky reading trap.
Chapter headings now use solid ink (or ivory over dark imagery), with gradient
color confined to selected key words rather than entire headings.

Community statistics use translucent icon-led cards, with 2,257 Visitors most
prominent. The organizer explicitly requests the labels 4,007+ Total visitors,
2,257 Visitors and 83 Research abstracts submitted. This supersedes ENG-023's
draft-derived public wording for these labels, including its 83 presentations
description. Retain 2023–2026 and MSRC 2026 scopes; do not claim unique visitors
across editions. The source PDF itself has not been altered or reinterpreted.

Local bilingual approval demo only; no operational or publication change.
Audit and priorities: `docs/reviews/track-community-refinement.md`.

## ENG-025 — Fluid public experience, 11 October 2026

The requester asks to build on ENG-024 with a coherent Participate hover boundary,
smoother translucent navigation and Our Team after Venue. Gradient heading text,
light lilac word highlights, homepage abstract artwork, benefit pictograms and
softer city transitions are explicitly requested visual choices.

The requester clarifies that **7 CME hours is a visual placeholder to change
later**, not a confirmed accreditation or hour count. Use it only as an explicitly
illustrative graphic; preserve the approved pending language and never place it
in structured event data or operational configuration.

Selected source photos: Day 1 / Without frame / Majed / IMG_9804 for community,
IMG_9744 for Attend; Manar Jamal / IMG_2560 for Abstract submission and Workshops;
Day 2 / Without frame / Rania / IMG_9801 for Speakers. Preserve source provenance.
Participation pages adopt photographic headers, visual requirement cards and
useful next actions. Remove repeated step sections and public photo explanations;
pending brochure/ticket/catalogue actions remain visibly unavailable where needed.
Sponsors gets a medium top action; Team, Venue and Contact share the visual system.

Scope remains the local bilingual approval demo. No workflow activation, claims of
accreditation, publication, deployment or communications. Requirements: DSN-01/02,
ACC-01, LOC-01/03, MED-01/02/03/04, PRV-03. Audit: fluid-refinement-brief.md.

## ENG-024 — Premium surface refinement, 11 October 2026

The requester accepts the ENG-023 direction and asks to build on it. Benefits
become softly rectangular illuminated cards with bold headings; historical counts
receive distinct panels; localized keyword accents strengthen selected headings.
Speaker backgrounds gain restrained geometric contour motion. The requester then
explicitly says not to add pause controls: the new background runs once for at
most 4.5 seconds of visible time and settles, with a static reduced-motion path.
Existing accessible media behavior is preserved; no new playback control is added.

Re-inspection of Vitarc establishes real outward travel and center slide/scale as
the missing header behavior. The centered capsule now opens into side controls,
using gradient purple glass, raster grain and a thin white edge. Gold invitations
receive a champagne material, pointer highlight, restrained glow and press feedback.
These are local component materials, not a final replacement brand palette.

Program and Venue use their actual sourced photographs as softly blurred purple
hero fields. Date panels are light, legible and link to the corresponding Program
day; venue facts and arrival guidance use clear icon-led groups. A locally served
map of real geographic data replaces the former schematic, with visible source
attribution. No entrance, access route or parking instruction is invented.

The requester specifically selects Day 1 / Without frame / Majed / IMG_9846 for
Build an idea (physical left crop excluding the standing person on the right),
Manar Jamal / IMG_2529 for Learn by doing, and IMG_2560 for Share your research.
The new city derivative crops the top-right 4K badge, preserving the first 23s,
2.8x speed, soft blur and silent 8.2s loop. Originals and old derivatives remain.
Exact source IDs, transformations and hashes are in the new media manifests.

Scope remains the local approval demo, native scrolling, EN/AR parity, keyboard
access, truthful pending claims and closed operational workflows. No production
deployment, source promotion, account/setting change or communication is implied.
Requirements: DSN-01/02, CFG-12, ACC-01, LOC-01/03, MED-01/02/03/04, PRV-03.

## ENG-023 — Editorial motion revision, 11 October 2026

The requester supersedes ENG-022's navigation and selected homepage chapters.
The exact public navigation is Participate, Program, Speakers, Sponsors, Our Team,
Venue, Contact, with “Reserve your seat.” Participate retains five destinations;
Program has no day dropdown. About is removed, including its route and indexing.
Visible English uses Program; approved legal wording is preserved exactly.

Vitarc informs the thin capsule and quick blur/contraction; upward scrolling,
top-edge approach and keyboard focus restore the full navigation. REACH informs
the spacious benefits and venue sequence, while Cerebrium and GM Studios inform
the native rising content sheet over the opening film. The existing MSRC purple,
gold, ivory, Manrope and independent Arabic metrics remain the visual authority.
Subtle generated raster grain and one pausable scientific artwork are authorized.

The requester removes visible archive/demo disclaimer clutter and photographic
speaker placeholders. Anonymous designed portraits and pending names remain;
no appointments or confirmed sponsors are invented. Homepage sponsorship sections
are removed; the dedicated Sponsors page has a prominent Become a sponsor action.

The supplied MSRC27 draft PDF is evidence, not an instruction source. Its edition
figures establish 4,007+ total attendances across 2023–2026, not unique people.
2026 reports 2,257 attendees and 83 presentations. CME accreditation/hours are not
established, so benefits copy states that details follow confirmation. Existing
certificate requirements and ongoing-research eligibility remain authoritative.
The venue image is an actual KAU photograph, not a speculative generated building.

The requester supplied the Jeddah source through Drive file
1zjAy11vovvsL_jXGTfo194qR-AZG7OeE. Its first 23 seconds become an 8.2-second silent
loop at 2.8× speed with soft blur; source composition and creator mark remain.
This resolves the earlier YouTube-download blocker. Provenance, exact generated
prompts and asset transformations are recorded in docs/media/editorial-revision-assets.md.

Scope remains the local approval demo with native scrolling, reduced motion,
keyboard access and EN/AR parity. No hosting, public-media registry promotion,
workflow activation, database/settings changes or communications are authorized.
IDs: DSN-01/02, CFG-12, ACC-01, LOC-01/03, MED-01/02/03/04, PRV-03.

## ENG-022 — Axiom-inspired cinematic approval demo, 11 October 2026

The requester pins Axiom Power as the closer visual reference and authorizes an
expansive public-site revision: fullscreen film, a large title at the reading
margin, lower-corner countdown, transforming glass navigation, five photographic
pathways, horizontal speaker/archive galleries, illustrative sponsor tiers and a
Jeddah motion closing. The secondary chapter bar is removed. Our Team replaces
Media in the header; the archive remains linked from the homepage and footer.
Programme exposes both day URLs and Participate exposes all five distinct routes.

The requester explicitly confirms: "Use clearly labeled demo placeholders" for
speaker and Our Team cards. Demo roles and sponsorship tiers are illustrative,
not appointed people, approved committee structures or confirmed partnerships.
Real photographs from the supplied MSRC 2026 Drive folder are authorized for this
local approval demo. Their source identities and transformations are recorded in
docs/media/axiom-demo-assets.md. The Jeddah closing uses licensed Corniche footage,
accelerated fourfold; it is not represented as a recorded time-lapse or venue film.

This request supersedes ENG-021's poster composition, sharp public buttons,
chapter navigation and text-led empty visual sections. The purple/gold/ivory MSRC
identity, approved facts and legal copy, EN/AR parity, native scrolling, keyboard
access and preference-aware media remain. DESIGN.md is refreshed to describe the
requested implemented system. Team and Sponsors remain excluded from analytics
while they carry illustrative demo content. No production release, media-registry
promotion, workflow activation, database change or communication is authorized.
IDs: DSN-01/02, CFG-12, ACC-01, LOC-01/03, MED-01/02/03/04, PRV-03.

## ENG-021 — Congress-poster visual approval demo, 11 October 2026

The requester expanded ENG-020: combine the preceding changes, perform a full
visual overhaul with creative freedom, and supply a working demo for approval.
This authorizes local public presentation changes, not final brand approval or
production release. The audit and prioritized plan preceded application edits;
the expanded direction is recorded in [the demo brief](reviews/visual-overhaul-brief.md).

Carry forward MSRC purple/gold/ivory, the approved previous-edition media and all
approved public facts. The demo uses Manrope for English public display headings,
Inter for text and Noto Sans Arabic. Broad color planes, editorial rows, a ruled
masthead and a grouped footer replace the former floating-card and repeated
illustration treatment. Restricted staff interface tokens retain their baseline.
No invented sessions, speakers, sponsors, opening dates or operational behavior.

The expanded request supersedes ENG-020's preservation of the exact outgoing
layout and ORG-012 motion amplitudes for this demo. Native scrolling, reversible
chapter state and static/reduced-motion fallbacks remain. Hero lines use 700ms
with an 80ms second-line delay, supporting content 500ms with 0/160/200/240ms
delays. Chapters rise 16px without scaling; word lift is .1em with .55 opacity
floor. Hero departure moves 24px and the film scales at most 3%. The step-inside
cue completes three cycles. Prior 180ms pointer menu, 220ms pointer arrival,
400ms once-only reveals and immediate keyboard arrival remain.

Only provenance comments were added to the two existing JPEG posters; comparison
excluding JPEG COM segments confirms every other byte is unchanged. No new
photography, re-encoding, video copy, hosted change or workflow opening.
Requirements: DSN-01/02, ACC-01, LOC-01/02/03, PRG-01, MED-01/04, REL-01.

## ENG-020 — Public design engineering refinements, 11 October 2026

Engineering choices within the requester's audit-first Emil Kowalski/Impeccable task;
not new organizer content, brand or release approval. The audit's older checkout was
reconciled against main `340e36df20f601c3fa05c4aa82d8f256df7471bc` before implementation.
Preserve current approved venue/legal copy, media, palette/type, ORG-012 chapter/title
and hero scenes, header behavior, native scrolling and independent workflow gates.

Adopt inverse dark-surface focus, a visible current mobile navigation state, readable
compact-phone cards/controls, intrinsic document reflow, early pending programme
publication status, the existing background-pause hit area and stable film Play centering.
These implement audit A01–A08; executed evidence, including the previously source-only
A08 risk, belongs in the feature note rather than an inferred approval.

Routine pointer menu opening uses 180ms/4px; pointer destination arrival 220ms/8px;
ordinary below-fold reveals 400ms/12px with 45/90/120ms child delays. Their entrance
easing is `cubic-bezier(0.23, 1, 0.32, 1)`. Keyboard/assistive menu and destination
arrival are immediate. Destination reveals do not stack; interruption and reduced-motion
changes settle/cancel appropriately. Existing 180ms button feedback, 1px hover lift and
98% press remain; decorative hover requires a fine pointer. This narrowly refines prior
routine motion values while preserving ORG-012's authored title/hero behavior and the
current header positioning/tuck behavior.

No new copy approval, catalogue record, dependency, public workflow, database, hosted
configuration or deployment is authorized by this engineering entry. IDs: DSN-01/02,
ACC-01, LOC-01/02/03, PRG-01, MED-01/04, REL-01. See
[scope and verification](features/design-engineering-refinements.md) and the
[preceding audit](reviews/design-engineering-audit-2026-10-11.md).

## ENG-019 — Closed participant age declaration and retention enforcement, 8 October 2026

Implementation interpretation of existing ORG-041 and BL-AUTH-02/09, not a new
organizer eligibility or personal-data policy. Signup requires an explicit 18+
declaration, bound to an immutable private admission proof; no unnecessary date
of birth or numeric age is collected, and the declaration is not verified age.
Server/database/native paths deny missing or malformed proof. The original native
account clock controls the 30-day deadline and ever-verification is monotone.

The restricted cleanup foundation is dry-run by default and independently disabled,
with no active scheduler. It preserves immutable application evidence, protects
staff/invitations/security/retained obligations and records minimal erasure/hold
outcomes. Unexpected references or unclassified native audit histories fail
safely. Activation still requires reviewed exception/scheduling/provider-log
handling and out-of-band deletion/ever-verification ledger restore proof. This
closed implementation applies no hosted migration or setting and sends no email.

## 4 October 2026 — Auth CI stability and shared-log overlap

The requester clarified that shared PROGRESS, DECISIONS and checklist append-only
updates do not count as feature/code overlap. Fix PR25's staff focus and managed-Auth
deadlock flakes in a separate small PR before starting participant accounts from fresh
main. Preserve assertions and existing timeout/retry settings; use repeated fail-fast
verification. No hosted settings, migrations, real users or email are authorized.

Source baseline: 29 September 2026; evidence reconciliation updated 1 October 2026. This register records source-confirmed choices, working defaults, unresolved details and publication gates. It does not certify institutional approval, provisioning, implementation or test completion.

Primary source: **S1 Development Specification v0.5**, modified 2026-09-29 11:30:21 UTC / 14:30:21 Asia/Riyadh. [Current source snapshot](../sources/Development_Specification_v0.5.txt).

Supporting source: **S2 Hackathon Draft**, modified 2026-09-29 11:09:52 UTC / 14:09:52 Asia/Riyadh. [Current source snapshot](../sources/Hackathon_Draft.txt).

Planning companion: [Decision Required backlog](backlog/DECISION_REQUIRED.md) maps every CFG-01–CFG-13 packet to actionable questions and affected release gates. Creating that backlog resolved no organizer decision and changed no confirmed choice, default, source snapshot or production configuration.

## Decision identifier reconciliation — 4 October 2026

Parallel public-site and authentication branches reused ORG-010 through ORG-013.
Integration preserves main's public identifiers and assigns new canonical identifiers
to the four authentication records below. This changes references only, not organizer
instructions, dates, policy values or release approvals.

| Former authentication label | Canonical identifier | Record |
|---|---|---|
| ORG-010 | ORG-017 | Production Supabase designation, 2 October 2026 |
| ORG-011 | ORG-018 | Intended website Super Admins, 2 October 2026 |
| ORG-012 | ORG-019 | Participant 72-hour absolute maximum, 2 October 2026 |
| ORG-013 | ORG-020 | Historical participant-phone/staff-SMS decision, 3 October 2026; superseded by ORG-016 |

Dated progress/source/migration receipts retain their former labels and are interpreted
by topic and date using this table. Current authentication requirements use the new
identifiers. ORG-014, ORG-015 and ORG-016 remain unchanged.

## 1. How to interpret status

| Status | Meaning |
| --- | --- |
| SELECTED / REQUIRED | Current source carries the choice as the implementation baseline. Dependent business settings and external approvals may remain open. |
| DEFAULT | Adopted engineering starting value explicitly marked in S1, changeable by authorized documented configuration. |
| WORKING DESIGN DEFAULT | Corroborated by S8 original brand-sheet text or extended by S4/S5; usable for a draft, still requires final approval under CFG-12. |
| RECOMMENDED | Implementation suggestion, not an approved product requirement. |
| OPEN | An unresolved input, owner, approval, conflict or configuration value. Keep the affected production stage closed. |
| SOURCE PROPOSAL | A source option/example/tentative statement. Do not publish or implement it as a confirmed rule. |
| EXCLUDED | Outside current committed product scope unless the user explicitly approves a scope change. |

S1 supersedes conflicting older planning assumptions in S3/Main PDF and S5/starter. S2 Sections 2-7 support answered hackathon choices, while its questions/options remain open. If a later user decision changes a requirement, record its date, rationale if needed and affected IDs here, update the relevant documents and tests, and obtain the corresponding real-world approval evidence where required.

Named final owners and due dates are **unassigned unless explicitly recorded**. Functional owner roles below come from S1, not invented staff appointments. A planned date or instruction to secure approval is not evidence of approval.

## 2. Selected architecture and governance

| Decision | Status | Current rule | Still required | S1 IDs |
| --- | --- | --- | --- | --- |
| O1 ownership | SELECTED | MSRC/RPClub-managed organizational repository, domain and service/billing/recovery accounts with institutional authorization; delegated developer access. | Authorization evidence, continuing custodian/backup, organizational access, renewal/release/support ownership. | INF-03, CFG-11 |
| Application hosting | SELECTED | Managed Vercel. | Plan, region/data-flow assessment, organization/team access, budget, provisioning and launch evidence. No Saudi-location claim. | INF-01/02, CFG-10 |
| Database/auth/files | SELECTED | Managed Supabase PostgreSQL, managed authentication and private storage. | Plan/region/data locations, organization access, approved RLS/storage, backup and recovery setup. | INF-01/02, SEC-02, CFG-10 |
| Framework | ADOPTED FOR M1 | Next.js App Router + TypeScript + Tailwind under the explicit foundation task; versions in ENG-001 below. | Final public and operational release gates remain closed. | INF-01 |
| Development tooling | ADOPTED FOR M1 | pnpm with lockfile, Vitest/Playwright and local Supabase fixture/policy tests; see ENG-001/005/006. | Isolated Linux database CI verified; optional Windows engine still untested. Current evidence and remaining merge-check enforcement are in PROGRESS. | INF-04/05, REL-06 |
| P1 payments | SELECTED | Faculty of Medicine payment platform, `lms.waqf.org.sa`, under the authorized KAU collection arrangement (ORG-042); isolated adapter. | Real integration or approved official-report reconciliation, payee/finance authority, amounts/methods/tax/refunds/references and evidence. No webhook/API assumed. | PAY-01/04/05, CFG-02 |
| Two site Super Admins | REQUIRED, ORG-043 | Two distinct designated people; at least two active accounts after restricted first-account bootstrap. Names appear only in ORG-043 below. | Privately supplied emails, verified identity, enrollment, appropriate grants/offboarding and mutual recovery UAT; distinct from infrastructure owners. | ROL-10/12, CFG-11 |
| Production data locations | APPROVED POLICY DISCLOSURE; operational inventory OPEN | v1.0 discloses Vercel India/global network, Supabase Japan, Resend/Namecheap United States, Gmail Google data centres, Faculty payment platform Saudi Arabia and DeepSeek People's Republic of China (ORG-037/040/042). | Verify actual database/storage/auth/app/backups/email/model/log flows, processor terms and transfer safeguards before each activation. Text approval is not a fresh hosted-region inspection. | INF-02, PRV-07 |
| Participant-data responsibility | ORGANIZER DECISION; operational release evidence OPEN | ORG-038 names the Faculty of Medicine, KAU as controller and Research Principles Club as organizer acting on its behalf; supersedes ORG-022's controller ambiguity. ORG-037 approves the v1.0 English policies. | Operational institutional evidence, processor/transfer implementation, cleanup/recovery and remaining release gates; native Arabic reader review requested. | PRV-01/02, CFG-09 |
| Email/scanning/assessment/analytics | PARTIAL; dependent gates OPEN | ORG-008 selects Vercel public analytics/Speed Insights; ORG-021 sets Contact addresses without selecting a delivery provider. | Remaining provider/data terms/evaluation/quotas/secrets/budget and processing/location approval. | INF-01, CFG-10 |

The source selects providers and intended ownership; it does not create accounts, paid plans, cloud resources, production credentials, an approved legal relationship or a functioning sender.

## 3. Confirmed product choices

| Decision | Current rule | IDs / source |
| --- | --- | --- |
| Event dates | Day 1: 27 January 2027; Day 2: 28 January 2027. Confirmed by the project requester on 1 October 2026; date-only approval, no inferred start times or workflow windows. | SCP-01, CFG-01, TIM-01; ORG-001 below |
| Venue | King Faisal Conference Center / مركز الملك فيصل للمؤتمرات, King Abdulaziz University, Jeddah; Abdullah Sulayman St, Jeddah 22254. Venue only; rooms/doors/session times remain unannounced. | SCP-01/02, CFG-01, TIM-01; ORG-031 |
| Participation pathways | Separate registration, abstracts, hackathon, 3MT and workshop states linked to one account. Co-authors are not attendees automatically. | SCP-03, REG-01/08 |
| Admission | Every registration manual approval, including full discounts. Default approve before financial completion; confirm/ticket only when both exist. | REG-02/03, PAY-03 |
| Workshop dependency | Manual approval and payment/valid discount, plus confirmed conference registration before confirming workshop. | WKS-02 |
| Public registration/workshop wording | Explain account/email verification, registration/payment and confirmation email without describing manual/organizer approval or discounts. Confirmation email confirms the place. Organizers tell eligible KAU students about discounts directly; backend rules above stay enforced. | REG-02/03, PAY-03, WKS-02, LOC-01/03; ORG-030 |
| Account verification | Managed email/password and verified email; participants have no phone verification or MFA (ORG-016). Email codes six-digit numeric. No university SSO. | AUTH-01/02/06 |
| Privileged access | Individually identified accounts; regular staff password then private exact-session application email check (ORG-015), Super Admins password then authenticator TOTP (ORG-016). Server/database/storage enforcement; no interface or metadata authority. Live email/recovery gates stay closed. | AUTH-04, ROL-01/12 |
| Interface language | English-default bilingual public/participant/non-review organizer UI and Arabic RTL. | LOC-01/03 |
| Scientific language | Scientific/project text English-only, LTR scientific fields in Arabic UI. Reviewer/judge assessment English-only. | LOC-02/03 |
| Email language/channel | All platform transactional messages English-only and email-only. | LOC-03, EML-01 |
| General support | ORG-021 supersedes the Gmail routes with nine tagged topics to contact@msrc2027.com. Form remains closed; no general helpdesk. Sponsors retain their separate restricted inquiry boundary. | SUP-01/03, SPN-02 |
| Stage-one abstract | 300 body words, ordinary/case templates and ongoing studies, two finalized submissions/PI, stage-one applicable IRB + supplied similarity report only. | ABS-01/04/07/09 |
| Research supervisor | Required ONLY after research award winner selection, not submission, acceptance, presentation allocation or nomination. | ABS-08 |
| Review/anonymity | Assigned blinded pre-event review; event judging separate. Human scores and advisory assessment separate, committee publishes authorized outcomes. | REV-01/05/07/10, AI-01/03 |
| Original administrative evidence | IRB/similarity original downloads restricted to Super Admins under selected policy. | ROL-11 |
| C3 hackathon entries | Solo entrants compete independently and preformed teams up to five; no matching, cross-university teams; one team/person and project/team. | HAC-01 |
| Hackathon tracks | Translating research into practice; Advancing medical student research. Accepted track locked. | HAC-02 |
| Hackathon material/review | English title/pitch, 300-word pitch, optional prototype, new ideas, two independent reviewer assignments. Detailed quorum/rubric/files remain open. | HAC-04/05/06/09 |
| Hackathon event | Compulsory orientation and day-one mentoring; day-two pitch/judging/awards. All team members at finals for awards. Five-minute pitch + three-minute Q&A, closed panel. | HAC-08/09 |
| A1 attendance | One valid check-in on each conference day; no checkout/hours. Workshops add their own check-in and authorized completion sign-off. | CHK-03 |
| Full conference certificate | BOTH daily check-ins + general survey. No one-day ordinary certificate. | CRT-01/03 |
| Workshop certificate | Confirmed booking + workshop check-in + completion sign-off + workshop survey, independently of earning full conference certificate. | CRT-01 |
| S2 feedback | Participant-linked survey completion; unlinked answers with no retained identity map or correlatable log/token/metadata path. Method awaits approval/tests. | CRT-02 |
| Certificate issuance | Automatic eligibility/preparation, authorized template/signature/release batch, then automated issue/email. Role/competition evidence separate. | CRT-03/04 |
| CMS | Structured forms, fixed layout, draft/preview/publish/unpublish/recover; ordinary content can publish by authorized publisher, media requires explicit approval. | CMS-01/02 |
| CMS prerequisite | Staff identity/permissions must exist before exposing CMS editing, even if participant registration is built later. | ROL-01/09/12, CMS-01, SEC-01/02; implementation dependency |
| Media | Approved direct storage uploads/optimized derivatives, no third-party embeds. ORG-025 records the organizer's registration-notice-only publicity amendment; ORG-037 approves the v1.0 wording including legitimate-interest basis and removal requests. Asset rights and operational publication/removal evidence remain release gates. | MED-01/03, PRV-08 |
| Archive/editions | Reuse code, keep annual operational databases/storage/config separate, no automatic account/submission/consent transfer. | ARC-01/02 |

## 4. Hackathon and source conflicts

| Conflict / ambiguity | Source evidence | Governing behavior until resolved | Who decides / dependent gate |
| --- | --- | --- | --- |
| National ID and phone | S2 5.1 requests national ID/phone; S1 excludes ID and makes phone conditional. ORG-016 supersedes ORG-020 authentication phone requirements; ORG-039 supersedes the national-ID exclusion for conference registration. | Collect national ID/Iqama, or passport number for international attendees, at conference registration for identity verification only, with authorized internal attendee access, strict controls and one-year deletion. Implementation is backlog work; do not add an authentication/hackathon identifier field in this policy PR. No authentication phone collection/verification or SMS. | Registration + privacy/technical owners; identifier controls/deletion and production registration gates. |
| WhatsApp group | S2 6.1 mentions online orientation with WhatsApp group. S1 EML-01 confirms email-only platform and HAC-10 flags discrepancy. | No WhatsApp integration/automated notifications or automatic phone sharing. Decide separately whether an optional external organizer-run group exists. | Hackathon + operations/privacy owners; participant onboarding. |
| Solo finalist quota | S2 4.3 states eight teams per track, sixteen teams total; C3 also permits solo competition. | Do not assume extra solo spaces or sixteen people. One project per solo/team consuming an entry is only S1 HAC-07 proposal, not approved. | Hackathon lead; ranking/selection publication. |
| Eligibility | S2 3.1 broad university student/intern sentence remains labelled Options, even though international eligibility and no-healthcare-member answers are clear. | Preserve answered choices, withhold final broad eligibility rule until approved. | Hackathon lead; application opening. |
| Cross-mode duplicates | One team/person and project/team does not resolve entering solo plus a team or multiple solo projects. | Implement configurable validation boundaries, keep affected application behavior gated. | Hackathon lead; application opening. |
| Member invitation timing | S2 3.4 says accounts verified on registering, member invitation acceptance after participation acceptance. | Separate roster, competition acceptance and post-acceptance confirmation. Do not block initial review awaiting later confirmation. | Timing selected in HAC-03; owner must set editing/window/locks/refusal rules. |
| Originality checking | S2 5.2 intends AI plagiarism check to ensure creativity, but lacks provider, method, standard or human process. | Declarations/manual review now; no claim that automated checking proves originality. Production tool remains approval-dependent. | Scientific/hackathon/privacy/technical owners; check activation/selection. |
| Recording | S2 7.4 says most likely recordings restricted, while backup recording is a possible demo fallback. | Tentative wording is not a final ban. No automatic recording/publication; approve fairness, privacy and media policy. | Hackathon/operations/media owners; finals. |
| Final scoring/prizes/fees/IP/certificates | S2 Sections 8-12 contain illustrative weights/options/questions. | No 25/20/20/15/10/10 rubric, judge count, prizes, fee, ownership promise or certificate rule becomes live through inference. | Functional owners in CFG-05; each dependent stage. |
| Research vs hackathon rules | Similar 300-word limits and shared software can hide track differences. | Research author/supervisor/file/rubric rules do not automatically apply to hackathon/3MT. | Track owners; relevant forms/review/awards. |

## 5. Main PDF and prior-work reconciliation

S3 is valuable conference background. Its proposals and roster drafts need confirmation before becoming current public content. See [CONFERENCE_BACKGROUND.md](CONFERENCE_BACKGROUND.md).

| Older source detail | Current interpretation | Required action |
| --- | --- | --- |
| S3 page 15 proposes 27-28 January 2027. | The source proposal is preserved. ORG-001 confirms the two dates; ORG-031 separately confirms the venue on 5 October 2026. | Publish confirmed dates/venue and the labelled date countdown. Doors/session times and separate operational windows remain unset. |
| S3 page 15 lists King Faisal Conference Center / University Hospital theater as venue options. | ORG-031 supersedes the venue-option-only status: King Faisal Conference Center is confirmed. Original S3 options stay historical. | Publish the approved venue/address. Actual rooms, capacities and accessibility arrangements require separate operational confirmation. |
| S3 page 14 chart names Abdulrahman Ismail scientific leader and Fatimah Al Farhah organizational leader; S6 context identifies Akram as conference co-leader/scientific lead. | UNRESOLVED ROSTER DIFFERENCE. Draft chart and user role context do not establish final public organization or account grants. | Ask leadership to confirm names, titles, hierarchy and public roster before publishing; separately verify role grants. |
| S2 footer references Development Specification v0.4. | HISTORICAL SOURCE POINTER. The live technical document is now v0.5 and already reconciles current S2 answers. | Use S1 v0.5 for construction and preserve S2 answered choices without treating its old footer as priority. |
| S5 recommends framework/testing/tooling and milestone order. | RECOMMENDATIONS. S1 confirms providers and product scope, not exact frontend framework. | Record chosen framework at foundation. Move staff auth/permissions ahead of active CMS editing. |
| S8 original Canva reference and S4/S5 website guidance. | SOURCE-CORROBORATED WORKING DESIGN DEFAULTS. S8 text confirms the palette and English fonts; its uncertainty note and CFG-12 keep final approval open. Arabic font/motion remain S4 extensions. | Draft consistently with current defaults; obtain final CFG-12 approval and production source assets. |
| Earlier discussion said logo/visuals absent. | Historical state; later brand/Main materials now exist, but no final approved production asset set has been verified. | Use [DESIGN_GUIDE.md](DESIGN_GUIDE.md) and [MEDIA_REGISTER.md](MEDIA_REGISTER.md), distinguish illustrative/source assets from approved production media. |
| Project mentions purchased msrc2027.com. | User-reported domain ownership, not independently verified registrar/DNS access/renewal custody. | Verify organizational control, DNS access and renewal/recovery responsibility under CFG-11 before launch. |

## 6. Design defaults and required boundaries

| Item | Status | Value / boundary |
| --- | --- | --- |
| Video homepage, conference hierarchy, responsive buttons | REQUIRED | S1 DSN-01. Cinematic entry with clear usable content/action. |
| Scroll and motion accessibility | REQUIRED | Normal native keyboard/touch/wheel behavior; pause, poster, muted hero, reduced-motion and low-bandwidth fallback. |
| Inspiration references | USER PREFERENCE, S6 | Slush homepage video and ESC Congress information layout. Record inspiration, do not claim current audit or copy branded assets. |
| Palette | SOURCE-CORROBORATED WORKING DEFAULT, S8/S4/S5 | Royal purple #3B1E6D; warm gold #C9A24A; ivory #F8F6F0; lilac #DCCFF0; ink #1F1930. |
| Typography | SOURCE-CORROBORATED ENGLISH / WORKING ARABIC DEFAULT | DM Sans 600/700 headings/buttons and Inter 400/500 body corroborated by S8; Noto Sans Arabic added by S4. Final approval/licensing open. |
| Motion/touch | WORKING DESIGN DEFAULT, S4/S5 | Button transition 180 ms, hover lift 1-2 px, press scale 98%; reveal 400 ms/up to 12 px; working 44 px touch target. Respect reduced motion. |
| Brand approval | OPEN, CFG-12 | Exact marks/fonts/assets/video/poster/content/translations and all final approval. Textual illustrative logo is not final source mark. |
| Dark mode | EXCLUDED FROM COMMITTED SCOPE | Requires separate explicit approval to add. |

See [DESIGN_GUIDE.md](DESIGN_GUIDE.md) for implementation detail. Working visual values may change during review without silently changing product or accessibility requirements.

## 7. Engineering defaults to preserve

These are source defaults and service objectives, not measured production performance or external mandates.

| IDs | DEFAULT / objective |
| --- | --- |
| AUTH-02 | Participant email verification source defaults remain ten minutes, resend60s, <=3/email/15min, <=5 failures/code. ORG-015 carries approved staff email controls: six digits/5min, resend60s,3/account/15min,10/rolling24h,20/IP/hour,5 failures/15min cooldown,newest only. ORG-016 retires all SMS delivery/provider/budget/control requirements; these email controls remain. Native TOTP protocol/lab bounds are not an approved production abuse policy. |
| AUTH-03 | Additional challenge/cooldown after five failed password attempts/15 minutes, no permanent lock. |
| AUTH-05 | ORG-019 supersedes participant 24h default: confirmed absolute maximum 72h from original session creation, never restarted by refresh. Privileged idle 30min/absolute 8h remain. Recent-auth age and warning lead TBD; dependent actions closed. |
| AUTH-08 | ORG-041 supersedes the seven-day source default: delete never-verified accounts after 30 days; account unusable before verification. Cleanup implementation/retention-exception checks remain activation work. |
| ABS-04 | Whitespace tokens with letter/digit; no-space hyphenated term one word; shared client/server implementation. |
| ABS-07 | Withdrawn finalized research entries continue counting within two-per-PI cap unless logged exception. |
| ABS-09, ABS-14 | Stage-one administrative PDFs 10 MB/file; authorized stage-two PDF/DOCX/PPTX 50 MB/file. |
| REV-08 | Revision window 14 calendar days after request publication, exact timestamp and audited extension. |
| AI-03 | Human independent draft assessment before revealing advisory suggestion; model excluded from human average. |
| MED-04 | Gallery input JPEG/PNG/WebP and MP4/WebM; exact technical limits/codecs budget open. |
| PRV-05 | ORG-041/v1.0 confirm ordinary account/registration/research deletion by 28 January 2028 and minimal certificate verification until 28 January 2029; specified inbox/provider/media periods are recorded in v1.0. Cleanup/backup/restore implementation and unspecified exceptions remain separately gated. |
| INF-07 | Ordinary recovery objective <=24h data loss/4h restore; critical database <=15min loss/1h restore, subject to plan/budget/test. File targets separate. |
| NFR-01 | 100 active registration/submission users baseline, 1,000 public browsers stress with documented operation mix. |
| NFR-02 | Agreed-mobile p75 LCP <=2.5s and typical internal API p95 <=1s, exclusions/test conditions recorded. |
| NFR-03 | 99.9% monthly availability objective, no planned critical-window maintenance. |
| TIM-01 | Store UTC, show Asia/Riyadh with timezone label; server-authoritative deadlines. |

## 8. Complete configuration and approval gates

Every CFG item below retains the full S1 statement. All named accountable owners/approvers and target due dates remain **unassigned** in this handoff unless a later recorded decision supplies them. Suggested implementation sequence is in [ROADMAP.md](ROADMAP.md), not a fabricated calendar.

| Gate | Functional owner in S1 | Named owner | Due date | Production boundary |
| --- | --- | --- | --- | --- |
| CFG-01 | Conference leadership | Unassigned | Unassigned | Registration opening |
| CFG-02 | Finance / leadership | Unassigned | Unassigned | Relevant paid or discounted registration opening |
| CFG-03 | Scientific lead | Unassigned | Unassigned | Relevant submission/review stage |
| CFG-04 | Scientific / award lead | Unassigned | Unassigned | Event judging / award release |
| CFG-05 | Hackathon lead | Unassigned | Unassigned | Each relevant hackathon stage |
| CFG-06 | 3MT lead | Unassigned | Unassigned | 3MT opening |
| CFG-07 | Workshop lead | Unassigned | Unassigned | Workshop opening |
| CFG-08 | Operations / certificate lead | Unassigned | Unassigned | Event operations / certificate release |
| CFG-09 | Organizational / privacy owner | Unassigned | Unassigned | Production data collection |
| CFG-10 | Technical owner with privacy / scientific approval | Unassigned | Unassigned | Production provisioning / relevant integration activation |
| CFG-11 | Club / leadership | Unassigned | Unassigned | Production deployment |
| CFG-12 | Design / content lead | Unassigned | Unassigned | Public launch |
| CFG-13 | Hackathon plus privacy / operations / technical owners | Unassigned | Unassigned | Affected collection / communication / selection behavior |

S2 mentions Aisha for flow/schedule coordination and Reem for faculty/judges/mentors. Those draft operational mentions do not resolve the final owner/approver rows above, exact identities or security grants.

### CFG-01

**State: PARTIALLY RESOLVED — event dates confirmed by ORG-001 and venue by ORG-031; remaining inputs OPEN. Named operating owner: Unassigned. Due date: Unassigned.**

CFG-01. Conference leadership: exact event dates/venue, general capacity, admission categories, manual approval owners, decision turnaround, payment/seat-hold deadlines, and handling of capacity-pending requests. Gate: registration opening.

Current reconciliation (5 October 2026): Day 1 is **27 January 2027** and Day 2 is **28 January 2027**. The venue is **King Faisal Conference Center / مركز الملك فيصل للمؤتمرات**, King Abdulaziz University, Jeddah, at Abdullah Sulayman St, Jeddah 22254 (ORG-031). The statement above preserves the v0.5 question set. Rooms, capacities, admission categories, approval owners/turnaround, payment/seat-hold policy and capacity-pending handling remain open. Doors/event/session times and separate registration, submission, review, workshop, competition and certificate windows are not supplied by either decision. Registration remains closed.

### CFG-02

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-02. Finance/leadership. CONFIRMED: P1, use the authorized KAU payment arrangement. REMAINING: responsible KAU unit/contact, exact system and official payee, integration documentation/access or authorized report-based reconciliation, order references, currency/prices/tax treatment, methods actually enabled, student-discount evidence/limits, refunds/cancellations and their authority, settlement reporting, and dependent-booking rules. Test the actual confirmation process; do not assume API/webhook support. Gate: relevant paid or discounted registration opening.

### CFG-03

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-03. Scientific lead: specialty codes, study-type choices, corresponding-author eligibility, keyword requirements, rubric criteria/scales, ongoing-study treatment, required review count, acceptance threshold, tie/disagreement rules, similarity provider/settings, and final-material requirements/deadlines. Gate: the relevant submission/review stage.

### CFG-04

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-04. Scientific/award lead: award categories, event-judging rubric/ties, supervisor details/evidence required ONLY from selected research winners, verification responsibility, and response deadline. Gate: event judging and award release.

### CFG-05

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-05. Hackathon lead. CARRIED FORWARD: C3 solo/team competition, no matching, maximum five per team, cross-university teams, two named tracks locked after acceptance, title plus 300-word pitch, new ideas only, two independent reviewer assignments, compulsory orientation/day-one mentoring/day-two finals, idea-plus-pitch minimum, optional prototype, and five-minute pitch plus three-minute Q&A. REMAINING: final eligibility wording, cross-mode duplicate rules, member editing/confirmation/lock policy, solo inclusion in the eight-per-track finalist limit, detailed forms/files/references, dates, review quorum/rubrics, recording/spoken-language policy, fees/inclusions, prizes, IP terms, and hackathon certificate evidence. Resolve CFG-13 source discrepancies. Gate: each relevant hackathon stage. [H1]

### CFG-06

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-06. 3MT lead: postgraduate eligibility, presenter limits, form/file requirements, stage deadlines, presentation rules, judge/rubric configuration, and certificate/award evidence. Gate: 3MT opening.

### CFG-07

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-07. Workshop lead: catalog, rooms, per-workshop capacity, price, reserved seats, approval responsibility, hold/offer windows, deadlines, prerequisites, cancellation handling, and whether the 30–100 estimate is per workshop or total. Gate: workshop opening.

### CFG-08

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-08. Operations/certificate lead. CONFIRMED: A1 daily check-in; full conference certificate requires BOTH days plus general survey; NO one-day certificate; workshop certificate requires its booking/check-in/completion sign-off/survey, independently of earning the full conference certificate. S2 feedback is unlinked while completion is tracked. REMAINING: sign-off owners/procedure, survey questions/deadlines and privacy-tested unlinking method, templates/signatures, role/competition certificate rules, release authority, correction handling, and outage contingency. Gate: event operations and certificate release.

### CFG-09

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-09. Organizational/privacy owner: record legal controller/contact and institutional approval evidence under the selected O1 model. Finalize field purposes, media/minor policies, notices/legal bases, processor contracts, actual locations/transfer assessment, retention exceptions, request handling, certificate-verification lifespan, and S2 metadata/log separation. Resolve the hackathon's requested national ID/phone fields against the existing minimal-profile policy before opening its form; national ID remains excluded pending an explicit decision and approved handling. Gate: production data collection.

Current reconciliation (6 October 2026): ORG-037–042 supersede the related source
TBDs: v1.0 English wording approved, Faculty controller, registration-only national
ID/Iqama/international passport, minimum age 18, approved retention clocks, DeepSeek
in China and Faculty payment platform. The paragraph above preserves v0.5's question
set, not a current national-ID exclusion. Identifier controls, actual processing/
transfer evidence, cleanup/restore, request operations and S2 separation still gate
production collection. No account, registration or AI activation follows publication.

### CFG-10

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-10. Technical owner with privacy/scientific approval. CONFIRMED: managed Vercel + managed Supabase. REMAINING: approved plans/regions and complete data-flow assessment, KAU payment integration details, email sender/DNS, assessment provider/data terms/evaluation, hackathon originality-check procedure, malware scanning, storage/backups, throughput/quotas, monitoring, and monthly/event budget including video delivery. Use synthetic development data while production location/processing approvals are pending. Gate: production provisioning or relevant integration activation.

### CFG-11

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-11. Club/leadership. CONFIRMED: O1 MSRC/RPClub-managed organization accounts with institutional authorization. REMAINING: authorization evidence, named continuing custodian and backup owner, organizational repository/domain/Vercel/Supabase/billing access, DNS/recovery controls, three website Super Admins, release approver, support/incident coverage, renewal responsibility, and annual handover. Infrastructure ownership and website Super Admin roles remain separate. Gate: production deployment.

### CFG-12

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-12. Design/content lead: logo/brand system, English/Arabic fonts, homepage video/poster, approved speaker/committee/sponsor assets, translations, public-page content, media permissions, and archive/domain continuity. Gate: public launch.

### CFG-13

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-13. Hackathon lead with privacy/operations/technical owners. SOURCE RECONCILIATION REQUIRED: (a) requested national ID and phone/profile fields versus current exclusions/conditional fields; (b) the draft's WhatsApp group versus confirmed email-only platform communications, including whether any external group is optional; (c) whether solo projects consume the stated eight-team-per-track/sixteen-team finalist quota; (d) broader eligibility still labelled Options; (e) originality-check method and human decision process. Do not silently resolve these or activate the affected collection/communication/selection behavior. [H1, Sections 3–6]

## 9. Source links and snapshot discipline

- [S1 Development Specification v0.5](https://docs.google.com/document/d/12LjPNVdnI10eC8ul9I-NZcBGj8a0Y3r7qcrgs-PoACo), modified 2026-09-29T11:30:21.017Z.
- [S2 Hackathon Draft](https://docs.google.com/document/d/1eVBuk33QhS-UDbic17Vh06M5RaqA1RzdRRoxGP7NZ7M), modified 2026-09-29T11:09:52.079Z.
- [S7 2026 media folder, Without frame](https://drive.google.com/drive/folders/1wkez3zex5RiTc3dM85s9QLO07rpLrsEu), folder metadata modified 2026-01-25T17:28:42.121Z; accessible metadata checked 29 September 2026. Rights, consent and selected hero quality have not been established by listing.

The snapshots describe the source state read for this handoff. If live documents later change, read the current source, reconcile affected requirements, and record the change rather than merging historical proposals automatically.

## 10. Change record template

Use this only when a real decision is made:

- Decision ID / affected requirement IDs:
- Actual decision date and source:
- Previous rule or open question:
- New approved rule:
- Named decision owner / approver:
- Evidence and remaining external approvals:
- Affected documents / configuration / tests:
- Gate opened or still closed:
- Implemented by / verification evidence:

No approvals, completion marks, due dates, staff identities or production launch state have been filled by inference.

## 11. ENG-001 — local M1 engineering baseline, 29 September 2026

Authority: the user's explicit first foundation task authorizes adopting the recommended
stack and routine reversible local implementation. This is an engineering decision;
it does not appoint organizational owners or approve a public launch.

Actual inspection found documents only, no package manifest, app, local Git history or
configured remote. The only registered local MSRC project is this working handoff.
The separate Downloads folder also contained handoff documents. A new local `main`
repository was initialized; no remote was created or cloud infrastructure inspected.
Original instructions and sources were preserved. Next.js automatic AGENTS additions
are disabled with its installed `agentRules: false` option.

| Choice | Exact baseline | Reason / limitation |
|---|---|---|
| Runtime | Node 24.21.0 LTS | Official Node release metadata and SHA256 checked. Installed system Node25.6.0 is outside Vitest5's supported range. Portable local Node is ignored by Git; system installation unchanged. |
| Package manager | pnpm11.19.0 | Available compatible tool, pinned via packageManager; frozen lockfile and explicit native build allowlist. Settings live in pnpm-workspace.yaml. |
| Framework/UI | Next16.3.7, React/React DOM19.3.0 | Registry versions and current official App Router docs checked. Default Node runtime and Turbopack; no experimental locale routing. |
| Styling | Tailwind and @tailwindcss/postcss4.3.3 | Working handoff palette, native scrolling, no external asset/font requests. System fonts are an M1 fallback; final typography remains CFG-12. |
| TypeScript/lint | TypeScript5.9.3; ESLint9.39.5; eslint-config-next16.3.7 | Current TypeScript7 exceeds parser's supported <6.1 range; React/import lint plugins still declare ESLint9 compatibility. ESLint9 reports end-of-support: re-evaluate supported lint stack before public release. No peer bypass was used. |
| Tests | Vitest5.0.2, Playwright1.63.0 | Node24 compatible; unit and Chromium desktop/tablet/mobile checks, separate Docker database policy suite. |
| Data | Supabase CLI2.118.0, supabase-js2.117.2, local Postgres17 config | Clients optional, loopback/public-key only, separate browser/server modules. SSR auth/cookie refresh deferred to M4 because there are no sessions in M1. |
| Unknown business values | Typed nulls | CFG-01/02/07/10 dates, venue, prices, capacities and regions remain unset. |
| Operational release | All15 gates hard-closed | Server-only guards reject requests regardless of role claims/environment. No feature business logic or operational tables. CMS editing and advisory assessment remain closed. |

Official checks: [Next installation](https://nextjs.org/docs/app/getting-started/installation),
[i18n](https://nextjs.org/docs/app/guides/internationalization),
[Node releases](https://nodejs.org/en/about/previous-releases),
[pnpm settings](https://pnpm.io/settings),
[Tailwind Next setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs),
official npm registry package metadata, installed CLI help, and Supabase references in
[local-data.md](features/local-data.md). Exact pins are in package.json; transitive
versions/integrities are in pnpm-lock.yaml. The exact Next16.3.7 package family was
accepted despite pnpm's freshness window after inspecting official metadata; the
version-specific exceptions are visible in pnpm-workspace.yaml. Future changes are
strictly checked rather than silently widening these exceptions.

Local data start is BLOCKED by missing Docker/Podman. This does not block the static
app. No alternative production provider, hosted database, new region or paid plan is
inferred. Email has no live adapter and remains console/test-only policy; payment has
no live adapter and remains mock-only policy until its later authorized milestone.
Local Git commits use an explicit automation identity when no user Git identity is
configured; this is not a named organizer approval. External CFG/REL gates stay closed.

## 12. ENG-002 — M2 design system and focused M3 preview, 29 September 2026

Authority: the user's explicit second task authorizes the reversible local design system
and homepage preview. Source IDs: SCP-02, DSN-01/02, LOC-01/02/03, ACC-01, CMS-04,
MED-01 through MED-04, CFG-12. This decision adopts working design defaults; it does not
approve a final brand, translation, public launch or media publication.

- Use the five documented colors, DM Sans for English headings/buttons, Inter for English
  body text and Noto Sans Arabic for Arabic. Self-host variable WOFF2 assets with `next/font/local`
  from exact Fontsource packages5.3.0. OFL1.1 notices are retained in `docs/licenses`.
- Adopt additional semantic colors solely as engineering defaults: success `#245D45` on
  `#E9F2EB`, error `#A02935` on `#FFF0F0`, warning `#755119` on `#F4EDDB`, information purple
  on `#EBE3F4`. Use written state labels as well as color. Keep native scrolling,180ms
  button feedback and a single400ms/12px entrance; remove nonessential motion on request.
- Use an original abstract SVG poster and provisional text identity while approved MSRC/KAU
  marks and conference footage are absent. The homepage video stays `null`. A61KB silent
  four-second original geometry animation is authorized as a clearly labelled synthetic
  component test fixture only. No2026 source footage was downloaded or reused.
- Keep the full15-entry future public sitemap typed. Existing homepage section destinations
  are links; unpublished entries are labelled non-links. Missing standalone pages return404.
  No invented schedule, dates, prices, speakers, sponsor roster or capacity values are added.
- The server-rendered showcase is allowed in development or with an explicit server-only
  flag on local/protected staging; `VERCEL_ENV=production` always denies it. It contains no
  private/admin data or operational actions. Deployment protection remains a separate gate.
- The synthetic form retains only one of two predefined choices in sessionStorage, allowing
  language switching without retaining personal/research data. Scientific sample text remains
  English/LTR. Real participant forms, authentication and CMS are outside this milestone.
- Decorative video enhancement uses local approved paths only, muted inline playback,
  explicit pause/resume, poster on error, reduced-motion and save-data/slow-connection
  fallbacks. Network Information API support varies; unsupported browsers cannot report
  connection speed. Final footage codecs/crops/size budget and frame contrast remain open.
- Added exact `@axe-core/playwright4.13.0` for automated accessibility evidence. Package pins
  and the lockfile are preserved. Disabled pnpm optimistic repeat installs so dependency-store
  configuration is checked after this machine's old global-store metadata was discovered.

Current API references reviewed: installed Next font documentation and
[Next font optimization](https://nextjs.org/docs/app/getting-started/fonts),
[Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing),
[Fontsource variable fonts](https://fontsource.org/docs/getting-started/variable),
[React external store hook](https://react.dev/reference/react/useSyncExternalStore),
[MDN media play](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play) and
[data-saving preference](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData).
Registry metadata and local tool help were checked before package/CLI use.

Verification is recorded in PROGRESS.md. All15 operational gates remain false. M3 is a
homepage preview only; full public content, final brand/media approval and deployment are pending.

## 13. ENG-003 — bilingual About preview after M2 review, 29 September 2026

Authority: the user explicitly requested review of the completed M2/homepage changes and
continuation with the bilingual About page. This authorizes local implementation and review,
not final content approval, new organizer policy, infrastructure changes or public launch.

- Add `/en/about` and `/ar/about` as the next SCP-02 public-content slice, reusing M2
  components and the current pinned stack. No dependencies, database/storage schema,
  authentication, operational transitions, media assets or jobs are added.
- Draft English/Arabic identity, purpose and audience copy from the source context recorded
  in CONFERENCE_BACKGROUND.md (S3 pp1,4,13,17,33,37). Show an explicit draft notice. Host
  institution is not an approved venue; community descriptions are not eligibility criteria.
  No source snapshot or organizer decision is superseded.
- Header/footer About links now reach the standalone page; a contextual homepage link
  provides the same destination. Language switching retains the page/query/section. Unknown
  routes/locales remain 404. The homepage introduction anchor remains available.
- Retain all 15 closed operational gates and the null dates, venue, price/capacity values.
  No legal, editorial, brand, media or institutional approval is inferred. The preview stays
  unindexed and local; a future remote draft still needs approved deployment protection.
- M2 code review found no actionable defect. Extend one media browser regression to verify
  that a visitor's pause survives reduced-motion changes; do not mislabel this coverage gap
  as a proven implementation failure.

Affected requirements: SCP-01/02, LOC-01/02/03, CMS-04, DSN-01/02, ACC-01, CFG-12,
REL-01. See [About feature contract](features/about.md), [M2 review](reviews/m2-homepage.md)
and the current PROGRESS entry for executed checks. All production gates remain closed.

## 14. ENG-004 — M1 reproducibility audit, 29 September 2026

Authority: explicit user request to ensure M1 only. Preserve existing M2/About code and
all product exclusions; no new operational feature or organizer decision is authorized.

- Retain the pinned stack and lockfile. Add only the playbook's missing README-only
  boundaries; keep the established `(preview)` group, root `tests/` and `lib/i18n.ts`
  with the reasons recorded in ARCHITECTURE. Empty folders are not feature completion.
- Correct local Supabase's key prerequisite: CLI 2.118.0 exposes its publishable key only
  with the local Auth service enabled. Enable that infrastructure container, while global
  and email signup, anonymous sign-in and the application's auth workflow stay disabled.
  No account, cookie/session feature, SMTP provider, storage or hosted connection is added.
- Add an explicit safe local-env helper and a separate live-local integration suite for
  both existing data-client wrappers. Capture status privately; copy only local public
  values; reject linked projects/privileged keys and refuse existing-file overwrite.
- Pass the same loopback-bound network to startup, reset and pgTAP. The pinned CLI's
  reset/test paths otherwise choose its default network instead of the custom one;
  in-process type generation explicitly rejects the network flag and stays unchanged.
- Extend the database CI job with local environment generation and the 10 integration
  checks after migration/seed/pgTAP. The application CI contract remains lint/types/unit/
  build/E2E. Capture credential-bearing startup output in a restrictive temporary file,
  print only sanitized status and delete the file without uploading it. A workflow
  definition or local run is not a passed hosted GitHub run.
- Docker/Podman and WSL are absent on this host, and no Git remote is configured. Those
  prevent executing local database acceptance and hosted CI respectively. They do not
  authorize production provisioning or fabricated passes. No new migration is required.

Relevant requirements: INF-01/04/05, SEC-01/02/06, ROL-01, ERR-01, REL-06. See
[M1 audit](reviews/m1-foundation.md) for commands, evidence, file list and remaining steps.
The implementation follows the [pinned CLI source](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/status-values.ts)
and installed CLI help. All 15 operational flags and unknown business values are unchanged.

## 15. ENG-005 — Windows runtime and private GitHub verification, 29 September 2026

Authority: user explicitly requested Docker/WSL installation and database/CI verification,
then asked to create the repository on their own GitHub account. The user separately
approved Git Credential Manager's displayed OAuth access and completed GitHub's security
verification. Credentials are handled by the credential manager, never copied into source.

- Install WSL 3.0.1 and verified Docker Desktop 4.93.0 per-user, using its WSL2/Linux
  backend. No automatic restart or Docker terms acceptance. Windows reports a required
  restart to activate Virtual Machine Platform; local engine/database checks remain pending.
- Create private development repository `xpexellent-dotcom/msrc-2027`, preserve all five
  existing commits and set it as origin. No collaborator, paid plan, production service,
  public repository, DNS record or platform email change. Personal development custody is
  expressly authorized; institutional production custody remains an unresolved release gate.
- Execute the committed workflow on GitHub's Ubuntu runner. Its local synthetic Supabase
  stack is separate from this Windows installation and all managed production projects.
- Add the already-documented local security-advisor and generated-type commands to CI.
  Findings and generated fixture types are review evidence; neither command prints keys.
  Advisor warnings remain visible while its error threshold fails the job.
- Compare generated fixture types with the checked-in contract. Match the four empty
  schema registries to the generated empty-key form; this tightens compile-time keys
  without changing the migration or runtime behavior.

No business requirement, operational flag, dependency pin, migration or application page
changes. See [database/CI verification](reviews/m1-database-ci.md) for evidence and limits.

## 16. ENG-006 — Direct hosted Supabase connection, 29 September 2026

Authority: the user explicitly requested direct use of live Supabase and supplied
`https://ecemjggwlzqpjcwmchrl.supabase.co`. This supersedes the M1 local-only connection
restriction and the requirement to finish Windows Docker setup before continuing normal
development. It does not authorize any operational workflow or unrelated hosted mutation.

- Connect to existing project `msrc` / `ecemjggwlzqpjcwmchrl`, observed ACTIVE_HEALTHY
  in `ap-northeast-1`. Its actual region is evidence of the existing project, not a new
  institutional data-residency approval. The project was not provisioned by this task.
- Use its existing enabled modern publishable key in ignored `.env.local`, with explicit
  hosted target and HTTPS origin validation. Retrieve no secret/service-role key or DB
  password. No schema/table/row/Auth/Storage setting is changed; no local fixture is deployed.
- The hosted public schema and migration history were empty on inspection. Supabase's
  security advisor returned no findings; empty-schema checks do not prove future policies.
  Default client types expose no tables. Only explicit guarded local factories expose the
  synthetic fixture contract for CI tests.
- Keep local reset/seed/pgTAP commands strictly local and make integration tests reject
  hosted settings before collection or client construction. Use a separate read-only
  metadata request for hosted connectivity. The GitHub workflow keeps synthetic containers;
  Docker on this Windows PC becomes optional for daily development.
- Preserve all 15 closed flags, source snapshots and unresolved business values. Separate
  staging/production data and access (INF-04), ownership, region approval, backups and
  release authorization remain gates before operational use. No paid plan, DNS, Vercel
  deployment, real emails or account workflow is added.

Relevant source requirements: INF-01/04/05, SEC-01/02/06, REL-06. See
[hosted connection contract](features/hosted-supabase.md) for actual verification and rollback.

## 17. ENG-007 — Complete M2 component system, 30 September 2026

Authority: the current user request to implement M2 using the approved MSRC visual system.
Adopt the specified five colours, DM Sans / Inter / Noto Sans Arabic, native scrolling,
180 ms feedback, 1 px hover lift, 98% press and 400 ms one-time reveal as the M2
implementation baseline. This supersedes the earlier provisional implementation status
of those exact values in ENG-002; it does not approve final marks, public copy or media.
Semantic state colours, spacing, radii and shadows remain configurable engineering tokens.

Complete the shared native-control library and bilingual synthetic showcase. Extract the
existing footer/mobile navigation without introducing product workflows. Keep both locale
routes and add the gated `/design-system` English alias. Local development is permitted;
remote staging requires the explicit server flag and separately configured deployment
protection. Vercel production refuses all showcase entry points even if the flag is set.

Use native modal dialog behavior, persistent dismissible toast announcements and static
loading skeletons. Keep reveal text opaque while it moves to preserve contrast. Only
explicit same-page link activation requests smooth scrolling; reduced motion jumps directly.
FileUpload is a file-selector UI only: no reading, persistence, storage or upload endpoint.

The user reconfirmed the MSRC2026 Drive folder for future hero, highlights, gallery and
mobile-poster selection. Metadata access was verified again; final per-asset review and
publication clearance remain open. No footage was copied into the app in M2.

Relevant source IDs: DSN-01/02, LOC-01/02/03, ACC-01, MED-01/02/03/04, CFG-12,
CMS-04, INF-04. No migrations, dependency changes, new environment values, Supabase
mutations, live workflow release or deployment are part of this slice.

## 18. Checklist reconciliation — 1 October 2026 (no new product decision)

Authority: the user's request to audit and update the
[feature checklist](https://chatgpt.com/space/page_5962a54672888191869e3c6108c27678).
Its earlier architecture and completion statements do not supersede v0.5 or current
ENG-001/005/006/007. Current implementation/hosting evidence is recorded in
[PROGRESS](PROGRESS.md) and the [audit](reviews/checklist-audit-2026-10-01.md).

- The Page mentioned a later AI-proposal/committee-approval design without an exact
  organizer decision source, date or approver. Record that as an unreconciled reference,
  not a replacement policy. AI-03 remains the configurable default: independent human
  draft before advisory reveal; separate human/model/committee records; no model score
  in the human average absent an explicit later policy. DR-CFG-03/10 stay open. The
  separate prototype and its historical20-test claim do not select DeepSeek or prove
  integration, data-processing approval, calibration or platform permissions.
- ABS-01/04/07/08/09–11 and HAC-01/02/04/05/06/08/09 contain settled baseline rules;
  the checklist now separates them from remaining DR-CFG-03/04/05/13 inputs. 3MT
  retains its separate DR-CFG-06 gate. No scientific value or rule was invented.
- Hosting/DNS and a successful Production deployment are observed engineering facts,
  not proof of REL-01 or CFG-09/10/11/12 institutional, privacy, content or media approval.
  Public Home/About drafts are accessible. Noindex is not privacy. A responsible
  approver must resolve the public-draft boundary and release evidence; this audit
  changes no deployment protection, DNS, environment variable or operational flag.
- The M3 continuation and parallel BL-SEC-01 contract are unblocked; M4 staff identity,
  grants and MFA precede CMS writes. Static public content need not expose the editor.
  ENG-006 continues to make Windows Docker optional for daily hosted development.

Rollback is documentation-only. Preserve earlier source snapshots and later human edits;
no schema, data, infrastructure or product behavior changes accompany this reconciliation.

## 19. ENG-008 — Provisional interface polish and local film review, 1 October 2026

Authority: the user's current Brand/interface checklist, motion and montage request.
Official brand information is expected next; retain ENG-007 colours/fonts/motion rather
than inventing final marks or changing the public content approvals. Slush supplies the
video-first reference and ESC Congress the information-hierarchy reference; neither
licenses reuse of their assets, copy or operational claims.

- Improve the shared English/Arabic Home/About hierarchy and directional button feedback.
  Keep native scrolling. Interpret guided section movement as optional CSS `y proximity`
  settling on large/tall screens, explicit anchor links and a free-scrolling toggle; no
  wheel/touch/key cancellation or mandatory stops. Disable snapping for reduced motion.
- Prepare a roughly19-second proposal from the user-supplied MSRC2026 montage: audience,
  auditorium and research discussion with short dissolves and a seamless loop. Encode
  desktop/mobile versions and posters as private local review derivatives; preserve the
  original. The measured18.7-second duration and codecs/budgets are candidate engineering
  settings for this cut, not final conference media policy.
- Serve only four allowlisted derivatives through a loopback development process with
  `LOCAL_MEDIA_PREVIEW_ENABLED=true`. A production build or Vercel production context
  denies the preview and media endpoints even when the flag is enabled. Keep all real
  footage outside `public/` and ignored by Git. Public Home/About retain safe artwork.
- Preview before publication is an explicit user requirement. Selection, encoding and
  technical checks do not approve identifiable people, scientific posters/slides, marks,
  captions or rights/consent for public use. CFG-12/MED-02 remain open; final brand, copy
  and media owner approval must be recorded before any release.

Relevant source IDs: DSN-01/02, LOC-01/03, ACC-01, MED-01/02/03/04, CMS-04, CFG-12,
INF-04, REL-01. No operational gate, schema, dependency pin, hosted environment, service
or DNS changes. See [feature record](features/brand-motion-media-preview.md) for evidence,
manual setup, verification limits and rollback.

## 20. ORG-001 — Confirmed conference dates, 1 October 2026

**Status: CONFIRMED calendar dates; related operating inputs remain OPEN.**

- **Source/date/approver:** The current explicit instruction from the project requester in this chat, 1 October 2026. The requester provides the organizer decision; no additional staff identity or institutional approval is inferred.
- **Exact decision:** “The dates are confirmed add a countdown on the frontpage and also update everything related: Day 1: 27th of January; Day 2: 28th of January. Also publish and push all the updates after.” The year is **2027**, from the current MSRC 2027 edition context.
- **Approved values:** `2027-01-27` for Day 1 and `2027-01-28` for Day 2, displayed bilingually in the event's Asia/Riyadh timezone. Public calendar-date copy and a homepage countdown are authorized.
- **Superseded:** Only the exact-event-date TBD in SCP-01/CFG-01 and the former source-proposal-only treatment of S3 page 15. The original Development Specification v0.5, Main File and historical engineering/task notes stay unchanged as dated evidence. Historical null-date statements describe their earlier snapshots and are superseded for current configuration by this entry.
- **Countdown convention:** Show calendar days until Day 1 using the current Asia/Riyadh calendar date and date-only typed configuration. Do not invent a doors opening or first-session instant to produce an hours/minutes/seconds clock. Use honest Day 1, Day 2 and finished display states once the corresponding calendar dates arrive; never show negative countdown values. No application cutoff or operational workflow transition follows from this public display.
- **Affected requirements and work:** SCP-01, CFG-01, CMS-01, TIM-01, LOC-01/03, ACC-01 and DSN-01; typed event configuration, English/Arabic Home/About/date notices, countdown boundary/localization/accessibility tests, project brief, current requirements and DR-CFG-01. No migration, grant, RLS or email change is required for public date copy. CMS editing remains closed.
- **Release boundary:** The user authorizes pushing/publishing the reviewed date/interface changes. This date decision does not settle venue, schedule times, admission capacity, prices, registration/submission/workshop windows, payment integration, media rights/consent, final brand or unrelated approvals. Every operational workflow remains closed behind its existing gate; REL-01 and the remaining CFG packets retain their independent requirements.
- **Audit/email and rollback:** This versioned decision record is the change evidence; no participant email or operational mutation follows from it. A rollback can restore the prior public UI/configuration without deleting this confirmed decision or changing stored participant data.

Implementation and executed verification are recorded in [PROGRESS.md](PROGRESS.md) by the date-countdown slice.

## 21. ORG-002 — Public use of the reviewed MSRC2026 homepage montage, 1 October 2026

**Status: PUBLIC HOMEPAGE USE AUTHORIZED; push/deployment and live verification pending.**

Authority: the project requester's explicit approval in the current chat on 1 October
2026 of the reviewed **18.7-second MSRC2026 montage**, including the people and research
posters shown, for public homepage use. The requester also explicitly authorized pushing
and publishing the current updates. This is the supplied organizer approval evidence;
no independent legal/institutional review or named media custodian is inferred.

- Approved placement: the decorative English/Arabic homepage hero, with a visible
  **MSRC2026 previous-edition** caption. The approval covers this reviewed cut, desktop
  and mobile crops and their still-image fallbacks; it does not approve the entire Drive
  collection, a gallery, new footage, new crops or 2027 participation claims.
- Supersession: ENG-008 and the initial Brand/film feature note correctly recorded local
  review only. Their earlier no-publication status is superseded for these four approved
  derivatives by this later explicit decision. Preserve their historical commands,
  results and source records. Other media, final marks, branding, translations, privacy
  procedures and REL-01 evidence retain their independent requirements.
- Public derivative paths: `public/media/msrc2026/hero-desktop-v1.mp4`,
  `hero-mobile-v1.mp4`, `poster-desktop-v1.jpg` and `poster-mobile-v1.jpg`.
  Publish the compressed silent derivative files only, retaining their reviewed encoding
  and crops; no third-party embed or audio track. Pause/resume, reduced-motion,
  low-bandwidth, failure and responsive still modes remain required.
- Original protection: the Drive item and ignored read-only source copy remain unchanged
  and are never public assets. Original SHA256 is
  `2b2b82e05c11e0eeeacfef60efed222f1cfba439003e210b9c521202ea90372c`.
  Private manifests and encoding recipes are not copied into `public/`.
- Keep `/en/hero-preview`, `/ar/hero-preview` and `/api/preview-media/*` development-only.
  Their production404 boundary remains intact after public derivative approval.
  `LOCAL_MEDIA_PREVIEW_ENABLED` is not a production publication switch.
- Affected IDs: MED-01/02/03/04, DSN-01/02, LOC-01/03, ACC-01, CMS-02/04, CFG-12,
  INF-04/05, REL-01. This versioned record is the approval audit reference; no participant
  email, database/storage mutation, grant/RLS change or operational publication follows.
  CMS editing and all 15 operational workflow flags remain closed.
- Verification/release: technical verification and actual GitHub/Vercel/live results belong
  in the current feature record and PROGRESS. Authorization is not evidence that a push or
  deployment has already completed, nor a blanket REL-01 or institutional brand sign-off.
- Withdrawal/rollback: the scoped app change can restore the synthetic hero or prior
  deployment and remove public derivative references. Removing the local-review flag
  closes only local review, not the approved public hero. Handle controlled derivative
  unpublication/cache invalidation when required; no promise to erase third-party copies.
  Named removal, retention and backup responsibilities remain to be assigned.

See [MEDIA_REGISTER.md](MEDIA_REGISTER.md) for the per-asset reconciliation. The original
v0.5 and earlier source snapshots stay unchanged.

## ORG-003 — Homepage playback and presentation corrections

- Status: CONFIRMED scoped requester instruction, 1 October 2026, current chat.
- Public Home must attempt muted inline autoplay and remove its automatic `Still image
  mode`. This supersedes the earlier DSN-01 working preference policy only for the public
  homepage: reduced-motion, data-saving and slow-network preferences no longer suppress
  its video. Preserve translated Pause/Play controls, frozen paused frames, hidden-tab
  pause, browser-denied autoplay recovery and a poster for actual media failure. Synthetic
  design-system fixtures retain their preference-safe default. The source snapshot is
  preserved; this explicit exception is not an unnoticed source-rule change.
- Remove awkward mobile arrow glyphs, add controlled navigation slides, and retain native
  scrolling. Other UI animations retain reduced-motion alternatives and visible focus.
- Enlarge the Day 1 countdown with days, hours, minutes and seconds on the desktop right.
  Engineering display boundary: 27 January 2027 at 00:00 Asia/Riyadh, explicitly labelled
  as the start of the date. This is not approval of a conference opening time; that value
  remains unset. ORG-001's approved dates are unchanged.
- Replace the hero title/lead with welcoming English/Arabic copy. This authorizes the
  requested presentation refinement, not full institutional brand/editorial REL-01 sign-off.
- Earlier push/publication authorization remains applicable. No operational workflow,
  CMS editing, migration, privilege, real email, production secret or DNS change follows.
  ORG-002's original and approved derivative files remain unchanged.
- Affected IDs: DSN-01/02, ACC-01, LOC-01/03, MED-01/04, TIM-01, CFG-01/12, REL-01.
  Scope, verification, recovery and rollback are in
  [the feature note](features/homepage-experience-fixes.md).

## ORG-004 — Concise premium public interface, 1 October 2026

- Status: CONFIRMED scoped requester instruction in the current chat. Restore the exact
  English title “Where curiosity becomes discovery.”, shorten the welcome to a single
  line, replace repetitive prose with visual elements, add restrained animation, and
  give the countdown its own premium background. Apply equivalent Arabic/RTL treatment.
- Remove the separate visible hero Pause control and repeated public draft/disclaimer
  blocks. Retain the single top Development preview banner, factual previous-edition
  identification, honest unknown venue/session fields and closed action states. This
  does not approve a schedule, institution-wide brand, roster, prices or other TBD values.
- Supersedes ORG-003's hero wording and visible Pause/Play UI; ORG-002's caption is now
  the concise MSRC2026 / نسخة ٢٠٢٦ provenance label. Media authorization remains limited
  to the original four homepage derivatives; originals/crops/encoding are unchanged.
- Public motion is stopped through a semantic background interaction with bilingual
  accessible naming, native Space/Enter activation, durable pause and visible keyboard
  focus. No permanent text/icon control is rendered. Browser autoplay refusal can expose
  temporary Play recovery; actual media failure keeps the approved poster. Human
  screen-reader/device review remains required because this interaction is less visually
  discoverable. Synthetic showcase fixtures keep their original explicit controls.
- Display typography engineering choice: exact self-hosted Manrope5.3.0 Latin variable
  font for public English titles; existing DM Sans actions, Inter body and Noto Sans Arabic
  remain. This is a working visual refinement authorized by the font request, pending
  final institutional brand assets. Original SVG line art is decorative, not data or a logo.
- Native scrolling, reduced-motion UI, existing400 ms directional navigation slides,
 180 ms button feedback,44 px targets and visible focus stay. Viewport reveals occur
  once, have short child stagger, and never hide content before JavaScript.
- Publication/push authorization from the current sequence persists. No workflow, CMS,
  secret/environment, Supabase/schema/grant/RLS, real email or DNS change. All15 workflow
  gates remain closed. Unknown conference opening time stays null; the timer continues
  to use the start of the confirmed date in Riyadh, with its exact target accessible.
- IDs: DSN-01/02, ACC-01, LOC-01/03, MED-01/04, TIM-01, CFG-01/12, SCP-02, REL-01.
  Implementation, checks, limitations and rollback: [feature note](features/premium-public-interface.md).

## ORG-005 — Cinematic public website and dedicated journeys

- Status: CONFIRMED scoped requester instruction, 1 October 2026, current chat.
  Design and implement the public experience using the supplied brand, the existing
  architecture and four named references. This authorizes public presentation work;
  operational release gates, approvals and data processing stay separate.
- Retain the supplied purple/gold/ivory/lilac/ink palette, current self-hosted fonts,
  accurate text wordmark and approved MSRC2026 homepage derivatives. Original flowing
  SVG lines connect editorial sections and future portrait treatments. Final official
  MSRC/KAU marks and institutional brand/copy sign-off remain pending.
- Homepage: viewport film, floating centred navigation, concise identity and two actions,
  followed by purpose, participation, programme, speakers, previous-edition highlights,
  partners, practical information and FAQs. Move the existing date-boundary countdown
  below the film; its target and confirmed dates are unchanged.
- Current explicit request supersedes ORG-003's automatic preference override and
  ORG-004's hidden pause interaction. Home again respects reduced motion and data-saving
  preferences, with a discreet visible bilingual Pause/Play button, frozen paused frame,
  hidden-tab pause, browser autoplay recovery and responsive poster fallback. Other
  nonessential movement also respects reduced motion; scrolling stays native.
- Add working public information destinations for programme, speakers, media,
  participation, registration, research, hackathon, workshops and 3MT in EN/AR.
  Preserve English/LTR scientific content and honest announcement/closed states.
  Registration is not open; research submission cannot be offered as an active action.
- Engineering choice: typed content records and a server-only approved-publication
  boundary. Only approved records enter client props or resolve session/speaker detail
  URLs. Query filters are addressable and survive language changes. No CMS integration,
  operational form or recording access entitlement is inferred from this interface.
- No invented venue, opening time, roster, sessions, sponsors, prices, capacity, deadline
  or recording policy. No new asset rights, gallery permission, paid resource, database,
  migration, grants/RLS, secrets/environment, DNS or participant communication change.
  All15 operational gates remain closed.
- IDs: SCP-01/02/03/05, DSN-01/02, PRG-01, CMS-01/02/04, MED-01 to MED-04,
  LOC-01 to LOC-03, ACC-01, TIM-01, CFG-01/12, REG-02/03, ABS-01/04/07/08/09,
  HAC-01/02/04, WKS-01/02, REL-01. See [handoff](features/cinematic-public-experience.md).

## ORG-006 — Public refinements and authorized publication, 1 October 2026

- Status: CONFIRMED scoped requester instruction in the current chat. The latest
  explicit organizer request authorizes the requested design refinements and publication
  when their implementation and verification are complete. This authorizes this public
  presentation/release; it does not resolve unrelated product or institutional gates.
- The supplied project instructions and specification remain the baseline for factual
  accuracy, permissions, English/Arabic interfaces, English/LTR scientific content and
  operational separation. The latest requester decision supersedes ORG-005's permanent
  visible Pause/Play treatment: remove that button from the normal homepage, retain the
  accessible semantic background interaction, keyboard focus, durable pause, preference-safe
  poster behavior, hidden-tab pause and browser/error recovery. Temporary Play recovery
  remains available when playback requires it.
- Watch opens a nearly full-screen view of the same approved homepage film, with its
  reading/navigation layers hidden while open. Retain an accessible close action,
  keyboard interaction, Escape/Tab handling, `#film` URL and browser Back/Forward behavior,
  and restoration of scroll/focus. Direct-link entry respects motion/data preferences
  until the visitor explicitly chooses Play. This is not a second gallery asset/player.
- Make the chapter index numbered and useful, with native anchors and current-reading
  states. Use warm ivory/white participation surfaces, stronger supplied DM Sans heading
  weights with Noto Sans Arabic/RTL parity, shorter public copy and fewer repeated actions.
  Existing dates, useful FAQ/programme facts, working journeys and the 3MT anchor stay.
- Existing ORG-002 assets, source originals, crops, encoding and rights scope are unchanged.
  No other footage, gallery, portrait, logo, recording policy or publication permission is
  approved by inference. Final official brand/media/editorial inputs remain open.
- All 15 workflow gates remain closed. No CMS or operational form is enabled; no application,
  approval, payment, booking, attendance or certificate result follows from these pages.
  No database/schema/migration/grant/RLS, secret/environment, package, email, domain/DNS
  or paid hosted-resource configuration change is part of this task.
- Verification: `pnpm check` PASS and exact c1f7273 [CI36905277026](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36905277026)
  PASS both jobs (258 units/264 browsers/3 duplicate skips/20 pgTAP/10 integrations).
  [PR11](https://github.com/xpexellent-dotcom/msrc-2027/pull/11) merged at e70bf38;
  the complete tree matches the checked head. Vercel Production6791979347 succeeded.
  Live EN/AR six visual journeys,24 public routes,14 private404 paths,15 closed gates,
  four enlarged-text layouts and two reduced-motion/filter/film journeys passed.
  Preview app UAT remained blocked by existing Vercel Login; production was independently
  checked. Earlier ORG-005 evidence remains historical. See the feature note for commands,
  exact receipts, retained failed runs and untested physical-device/human review.
- Affected IDs: SCP-01/02/03/05, DSN-01/02, ACC-01, LOC-01/02/03, CMS-01/04,
  MED-01 to MED-04, PRG-01, TIM-01, CFG-01/12, REG-02/03, ABS-04/07/08/09,
  HAC-01/02/04, WKS-01/02, REL-01. See the
  [latest refinement/release note](features/cinematic-release-refinements.md).
  [ORG-005's original note](features/cinematic-public-experience.md) remains unchanged as
  a dated baseline; the presentation supersession is scoped to the changes above.

## ORG-007 — Hero scroll cue and caption, 2 October 2026

- Status: CONFIRMED explicit requester instruction in the current chat, with an annotated
  homepage screenshot: make the Step inside button "more centralized and a scroll option
  with a smooth animation when you scroll down", and remove MSRC2026.
- One centred Step inside / «اكتشف الأجواء» cue replaces the left-aligned link and right-hand
  caption. A gold segment loops down its line. Activation scrolls to the dates band directly
  below the hero (`#essentials`) through the existing explicit-navigation helper, which glides
  smoothly and moves focus to the band. With reduced motion, the line is static and the
  scroll jumps, as DESIGN_GUIDE and AGENTS require. On phones the band stops below the
  floating header.
- Supersedes ORG-004's concise hero label (MSRC2026 / نسخة ٢٠٢٦) on the homepage hero only.
  The film view keeps its translated MSRC 2026 identification, and the previous-edition
  section still names MSRC 2026, so the footage stays identified as the previous edition.
  ORG-002 files, crops, encoding and rights scope are unchanged; development-only preview
  captions still render.
- Affected IDs: SCP-01, DSN-01/02, ACC-01, LOC-02, MED-01/04.

## ENG-009 — BL-SEC-01 synthetic authorization contract, 2 October 2026

- Status: engineering implementation choice; no product permission or release decision changed.
  Authority: requester accepted BL-SEC-01 as the next complete engineering PR and said to begin.
- Adopt frozen purpose-sized role/scope rules, a server-only fresh AuthorityReader contract,
  independent synthetic allowed/denied tests and a transaction-rolled-back pgTAP fixture.
  Scope IDs and scientific ownership must be present; undefined actions/scopes deny.
- Source ROL-01–12/SEC-01/02/AT-02 remain authoritative. Require current grants/session,
  individual staff identity and trusted AAL2/TOTP. Unresolved conflict remains a denial after
  assignment withdrawal; an active duplicate cannot clear it. Original evidence requires
  scoped MFA Super Admin access plus clearance, not participant ownership or generic admin.
  REV-10 pre-event review and event-day judging use separate assignment kinds, including
  assignment-bound grants; holding both roles does not merge stages.
- Check-in/category/content duties use explicit function/resource bindings. Scientific packet,
  participant, score, file and operational projections remain separate. Purpose names/technical
  fixture metadata do not define approved production fields or domain tables.
- No production reader, hosted migration, bucket, credential, account, named staff appointment,
  actual file link, audit/email job or live endpoint is introduced. All 15 workflow gates closed.
  PRIVACY/provider/custody/identity/session/annual-isolation and per-feature REL gates remain.
- [Feature contract](features/authorization-contract.md) records fixtures, audit/language/error
  behavior, verification limits and rollback. BL-AUTH-01/05 must integrate current persisted
  grants/managed identity/TOTP before M4 staff or CMS activation.

## ENG-010 — Closed persisted authorization foundation, 2 October 2026

- Authority: requester asks to review the feature checklist, continue its next actions and
  deploy the reviewed application schema/permissions, asking about uncertain choices.
  This authorizes the bounded additive hosted migration; it does not open product workflows.
- Reviewed BL-SEC-01 PR15 at exact head `e297c86` was merged as `7ce3112` after its final
  application and isolated database CI passed. Original checkout changes are preserved
  in place; implementation continues in the attached managed worktree.
- Adopt private persisted edition/account-access/scoped-grant/audit metadata and a minimal
  own-context RPC. Its narrow definer boundary is needed to inspect private managed Auth
  session/factor records; fixed search path and authenticated-only execution are required.
  No browser/service-role table maintenance, user-metadata roles or initial grants.
- Verify bearer identity through managed `getUser` each call, then validate fresh own RPC
  context. No complete domain AuthorityReader, resource ownership, reviewer identities,
  profile fields, assignments or operational records are exposed or inferred.
- Context operational/privileged readiness and session activation remain false. AUTH-05
  session limits/recent authentication and AUTH-04 enrollment/recovery must be implemented
  and tested before staff activation. No timeout is invented; refresh is not user activity.
- Existing selected Supabase project `ecemjggwlzqpjcwmchrl` is verified empty before this
  change. Environment classification and exactly three named Super Admins were requested;
  CFG-09/10/11 production/privacy/custody gates remain open. No account, email, secret,
  paid resource, synthetic hosted record or workflow activation is authorized here.
- Apply only the reviewed application migration, not the earlier local foundation fixture
  or seed. Current database/CI receipts and deployment state are recorded in PROGRESS and
  the [feature note](features/persisted-authorization.md).
- Deployed after source review and exact-source full CI: hosted version20261002173712,
  four private forced-RLS tables, authenticated-only minimized own-context RPC, zero rows.
  Real anonymous API denial passed. Aligned the migration filename to provider history
  without changing its reviewed SQL. Hosted 0029 definer warning is an intentional bounded
  exception, independently reviewed against current official guidance; retain and re-review
  before staff activation. No RLS/table grant is widened to silence it.

## ORG-008 — Visitor analytics, Speed Insights and hosting efficiency, 2 October 2026

- Status: CONFIRMED explicit requester instruction in the current chat. The requester sent a
  screenshot of Vercel's Web Analytics setup page ("Can you do this"), then asked to optimize
  the Vercel hosting settings for efficiency, enable Speed Insights and add other useful
  settings or integrations; a Pro plan may follow at publication. This is the approved
  analytics configuration that INF-01 requires.
- Vercel Web Analytics (`@vercel/analytics` 2.0.1) and Speed Insights
  (`@vercel/speed-insights` 2.0.0) load on the production deployment only
  (`VERCEL_ENV=production`): previews, local and CI builds render neither, and only Vercel
  serves their scripts (from project-specific same-origin paths). Both are cookieless and
  send their beacons to the site's own origin. Before anything is sent, the page address
  loses its query string and fragment (PRV-03), and automated browsers
  (`navigator.webdriver`) send nothing, so test runs against a deployment neither count as
  visits nor make write requests.
- Only public information pages are counted: the locale home and the sections listed in
  `countedSections` (`src/lib/vercel-observability.ts`), with one slug segment under
  programme and speakers. Future account, review and organizer areas, 404s and internal
  previews send nothing; a unit test fails when a new public page folder is not listed, so
  each addition is deliberate. This follows ChatGPT's 2 October analytics review (public
  routes only, no previews, no query strings).
- The referrer is sent by Vercel's script, not by `beforeSend`. The site's
  `Referrer-Policy: no-referrer` leaves internal navigations without one, and browsers send
  other sites' origins only by default.
- Data flow (PRV-07): Vercel receives the page path and route pattern, referrer, country,
  and device, browser and OS class, plus Core Web Vitals. Visitors are counted by a hash that
  rotates daily, not by a cookie or a stored IP address. Vercel processes this outside Saudi
  Arabia. The cross-border assessment remains with the organizers; this decision claims no
  compliance. The Privacy page must describe both services before it is published.
- Speed Insights reports field p75 LCP, CLS and INP per route: the evidence NFR-02 asks for
  (public-page LCP ≤ 2.5 s at p75).
- Functions run in `bom1` (Mumbai) instead of the default `iad1` (Washington, D.C.), set in
  `vercel.json`. Requests from the organizer's connection in Saudi Arabia enter Vercel at
  the Mumbai edge, and uncached pages (programme, media, 404s, health) then crossed to `iad1`:
  0.42–0.48 s to first byte, against about 0.21 s for CDN-cached pages. `dxb1` (Dubai)
  appears in the dashboard, but a deployment with it failed with "Invalid region" on this
  plan. No public function
  reads Supabase or personal data. This is a latency setting, not a production
  data-location approval (INF-02, CFG-10): review it together with the Supabase region
  (`ap-northeast-1` today) before any personal-data workflow opens.
- The approved film and posters under `/media/` may be cached by browsers for 30 days
  (`max-age=2592000, stale-while-revalidate=86400`) instead of being revalidated on every
  visit (NFR-03). Replacement media must ship under a new file name.
- Dashboard settings checked and left as they were: Fluid compute on, Node.js 24.x,
  Prioritize Production Builds on, Vercel Authentication on previews, protected source maps,
  Web Analytics and Speed Insights enabled, firewall bot protection off (a challenge would
  also stop link previews and automated QA). Plan-dependent options are listed in PROGRESS.
- Affected IDs: INF-01/02/08, PRV-03/07, NFR-02/03, CFG-10.

## ORG-009 — Chapter navigation on phones and tablets, 2 October 2026

- Status: CONFIRMED explicit requester instruction in the current chat, with an iPhone
  screenshot of the homepage chapter index. On phones the second navigation bar "isn't
  convenient": on desktop it follows the reader, but on a phone "when you scroll it's kinda
  just gone". The requester suggested a sidebar, leaving the form open.
- First version (PR 18), now superseded: a floating pill that opened a side panel. The
  requester tried it on an iPhone and rejected it the same evening. The panel needed two taps
  to reach a chapter, the 2×3 index still looked out of place on a phone, and the bar's
  appearance and chapter changes were not smooth. The requester asked for something "smooth
  and convenient", perhaps on the side or centred, with creative freedom, and noted that
  the desktop version is fine.
- Current version (PR 20): below 1100px the chapter index is one swipeable row of chapter
  chips that sticks under the floating header, as the desktop bar does. It is styled as a
  second deck of the header card. A purple highlight glides to the current chapter, and the
  row slides that chip to the middle (mirrored in Arabic). One tap goes to any chapter, and the
  highlight moves straight there rather than through each chapter between. The first time the
  bar scrolls into view its chips glide in one after another; docking under the header settles
  it with a short motion and the header's shadow. At 1100px and above nothing changes.
- Reduced motion: no entrance, settle, glide or slide, and the scroll jumps (DESIGN_GUIDE).
- Partners chip, 3 October 2026 (requester: "Yes add a partners chip"). The bar listed six
  chapters, so "Plan your visit" was 06 in the bar but "07 / Plan your visit" on the page:
  section 06 ("Shared purpose", partners) had no chip. The bar now has seven chips on every
  width, adding 06 Partners / «الشركاء». Every chip's number matches its section eyebrow; the
  desktop grid has seven columns, and the partners section takes focus like the others.
- Superseded below 1100px by ORG-010 (3 October 2026): the requester rejected the phone bar
  once it was live. The seven-chapter bar and its numbering remain from 1100px.
- Affected IDs: SCP-01, DSN-01/02, ACC-01, LOC-02.

## ORG-010 — Chapter titles replace the phone chapter bar, 3 October 2026

- Status: CONFIRMED explicit requester instruction in the current chat, after PR 20 went
  live: "I hate the navigation bar on phone." Instead, on reaching each section its title
  should be "big and centered", then "smoothly shrinked to original size and placed back",
  with creative freedom over the look and feel, and it "should be smooth".
- Below 1100px the chapter bar is not shown. From 1100px it is unchanged (ORG-009).
- Phones (up to 700px, where every section is one column): each of the seven chapter titles
  is staged while it is still below the screen. It rises big and centred under its eyebrow,
  in its section's own colours: up to 1.8 times its size, rewrapped only within its own line
  breaks. It then pins in the middle of the screen while the reader scrolls, and settles. It
  shrinks to its own size while still centred, and its words slide across and drop into their
  lines, so no two words cross. The section's content rises to meet it. Each staged chapter
  adds a hold of about 150–440 px of scroll, depending on the phone and language.
- Timing: the settle takes 1.2 s from pinning. Scrolling through the hold can only hurry it,
  so it is complete before the content reaches the title. It plays once per chapter per visit.
- Text is enlarged, never hidden. Titles stay as rendered without JavaScript, with reduced
  motion, from 701px (two-column sections on tablets, the bar on desktop) and for chapters
  already on screen or above when the page loads, for example after a link to `#legacy`.
- Each title keeps one accessible name: an `aria-label` equal to its text, with the moving
  word spans `aria-hidden`.
- Engineering choice: `src/components/chapter-titles.tsx` measures each title in its final
  font and a hidden centred copy, then animates only `translate` and `scale` (WAAPI). The
  pinned title is `position: sticky` within its stage. Staged stages clip horizontal
  overflow: in Arabic a centred, full-width eyebrow widened the page, and a phone zooms out to
  fit a wider page. `.program-section` uses `overflow: clip` on phones so that the window
  stays the scroller the pinned title sticks to.
- Affected IDs: SCP-01, DSN-01/02, ACC-01, LOC-02.

## ORG-011 — Mobile homepage scrolling and presentation refinement, 3 October 2026

- Status: CONFIRMED requester instruction to improve Claude's mobile homepage design,
  fix up/down scrolling bugs, and refine heading wording with creative freedom.
- Preserve ORG-010's removal of the phone chapter bar and desktop chapter navigation.
  Replace its pinned, individually moving words and added scroll holds with one centered
  arrival of the complete heading. The enlarged heading settles in 650 ms, fits its column,
  and stays in normal document flow. Fast flicks and fragment arrivals settle immediately.
  This supersedes ORG-010's 1.8× size, 1.2 s word motion and 150–440 px sticky runways.
  Timing and the bounded 1.2× scale are reversible design choices under this request.
- Scrolling back never pins or replays a started title. Text remains native, with natural
  line breaks and accessible heading names. Reduced motion, no JavaScript and wider screens
  keep the static presentation. Text/width changes refresh only eligible offscreen titles;
  browser-toolbar height changes alone do not reset them.
- Refine EN/AR section titles and phone menu spacing. Preserve the approved hero identity,
  confirmed facts, chapter numbering, media provenance and honest closed action states.
- The floating header docks after 48 px and returns at less than 8 px to avoid oscillation
  near the former 24 px boundary. Measure actual card/banner heights for enlarged-text menu
  bounds and mobile anchor clearance; retain native scrolling and disclosure semantics.
- No migration, provider setting, operational opening, live publication or final brand
  approval is authorized or implied by this presentation task.
- Affected IDs: SCP-01, DSN-01/02, ACC-01, LOC-01/03, CMS-04.
- Evidence and rollback: [mobile homepage refinement](features/mobile-homepage-polish.md).

## ORG-012 — Scroll-linked homepage motion and a larger opening headline, 3 October 2026

- Status: CONFIRMED requester instruction in the current chat, after ORG-011 went live: the
  phone titles now arrive "immediately" in place, which "doesn't really give that feel". The
  requester gave creative freedom over phone and desktop to add smooth transitions and fade-ins
  while scrolling, referenced faithibiza.com, armor-bd.com and dibiconference.com, and asked
  that the opening headline over the film stand out, clear and large.
- Chapter titles follow the reader's scroll on every width. As a title's stage travels from
  the bottom edge to the upper reading line (about half a screen), the heading rises about
  3.4rem into place. On desktop it also settles from 107% size. Its words light up in reading
  order, each lifting slightly, and the gold rule draws. The state is a pure function of scroll
  position: scrolling back reverses it, and nothing pins, replays or adds scroll distance.
  This supersedes ORG-011's once-only 650 ms phone arrival. ORG-011's copy and header remain.
- A title wholly below the screen keeps its rendered state, so automated contrast checks and
  off-screen text never read as faint. Titles never widen the page: they grow only from
  1100px, and stages clip sideways.
- Content held below the screen at hydration fades up the first time it scrolls in: 1 s, up
  2.2rem, with a 90 ms cascade. Content already on screen keeps the 400 ms settle. Nothing is
  hidden without JavaScript, an observer, or with reduced motion. Chapter titles are left to
  their scroll scene.
- Opening: the headline is 700 weight. It is 2.9–4.6rem on phones (about 51px at 390px) and
  up to 8rem on desktop; Arabic is 2.5–3.9rem and up to 6.4rem. A soft shadow lifts it off the
  film. Its lines rise out of a fold on load, followed by the lead, facts and actions. While
  the first screen scrolls away, the headline drifts up and fades and the film eases 8% closer.
  None of this runs in the film view.
- Reduced motion removes all of it; print shows the static page.
- Affected IDs: SCP-01, DSN-01/02, ACC-01, LOC-01/03.

## ORG-013 — Public search indexing, preview notice removed, one canonical domain, 3 October 2026

- Status: CONFIRMED requester instruction in the current chat. Google showed "No information is
  available for this page" for msrc2027.com because every deployment blocked crawlers. The
  requester asked to open the site to search, remove the "Development preview" notice, and
  re-route the other Vercel domains to the main domain.
- Production only (`VERCEL_ENV=production`, www.msrc2027.com):
  - `robots.txt` allows crawling and links `/sitemap.xml`. It excludes `/api/`, the design system, the local hero preview and staff, review and check-in routes.
  - The sitemap lists the ten public information pages in EN and AR, with hreflang alternates.
  - Pages built with `localizedPageMetadata` are `index, follow`. Registration and submissions stay noindex while closed.
  - The global `X-Robots-Tag: noindex` header is dropped.
- Everything not built with `localizedPageMetadata` (staff, workflow and review routes) keeps
  the layout's noindex default. Branch previews, local runs and CI stay fully noindex and
  disallowed.
- `msrc-2027.vercel.app`, `msrc-2027-msrc2027.vercel.app` and
  `msrc-2027-git-main-msrc2027.vercel.app` 308 to `https://www.msrc2027.com` with the same path
  and query. This is an edge redirect in the production build only, so branch previews still
  open.
- The development-preview banner is removed. The header rests 1rem from the top (0.75rem on
  phones), and the opening film fills the full screen height.
- Unchanged: the footer's approval note and closed workflow states. Search visibility does not
  approve content, brand or operations; those remain under REL-01/CFG-12. Google Search
  Console registration is the requester's step.
- Affected IDs: SCP-01, DSN-01, LOC-01/03, INF-04/06, REL-01.
## ORG-017 — Production Supabase designation, 2 October 2026

Authority: explicit organizer instruction in this conversation on 2 October 2026.
Project `ecemjggwlzqpjcwmchrl` is Production. This resolves the environment classification
question in ENG-006/010; development fixtures are prohibited there. Synthetic database tests
use isolated GitHub CI, and the local MFA lab uses ephemeral memory with no hosted request.
Production plan, region/data location, privacy/retention and operational approvals remain
unresolved. New migrations are review-only; no hosted reset, seed, historical migration push
or repeat of deployed `20261002173712_persisted_authorization.sql`. INF-04, CFG-09/10/11.

## ORG-018 — Intended website Super Admins, 2 October 2026

Authority: explicit organizer instruction in this conversation on 2 October 2026.
Akram Awan is the first intended website Super Admin; second and third remain TBD.
Login addresses are retained only in ignored local private designation material, excluded
from repository, PR and checklist. This is designation, not activation: no invitation,
account creation, live grant or reset is authorized. Exactly three individually identified
administrators, verified appointment/MFA and offboarding evidence remain required
(ROL-10/12, CFG-11). Recovery approver, operator and verified procedure remain TBD;
privacy/retention/location and live security-email provider/sender remain TBD. Console/test
email only; this slice sends no real security notification.

## ORG-019 — Participant absolute session maximum, 2 October 2026

Authority: explicit organizer instruction in this conversation on 2 October 2026.
AUTH-05 participant absolute maximum becomes 72 hours from original session creation,
superseding v0.5's 24-hour default in current requirements/configuration/tests. Preserve
the source snapshot. Public browsing requires no login. Privileged idle remains 30 minutes
and absolute remains 8 hours. Refresh, MFA challenge and activity cannot restart absolute
lifetime. Fresh sign-in creates a new origin only after old-session denial and current
authority checks. Recent-auth maximum age and warning lead remain unset; dependent
sensitive actions stay closed.

## ENG-011 — Closed local staff security foundations, 2 October 2026

Historical TOTP implementation decision; ORG-020 temporarily superseded its factor/UI choice. ORG-016 restores Super Admin authenticator TOTP while regular staff retain ORG-015 email checking. Local-only, synthetic-data, audit and closed release boundaries continue to apply.

Authority: bounded BL-AUTH-05/06 task; AUTH-04/05, ROL-12, SEC-01/06, LOC-01, ERR-01.
The local synthetic TOTP lab uses temporary individually scoped identities, server-held
keys and challenge/replay controls. QR/manual setup show a fresh synthetic key during
enrollment only; credentials/codes never enter audits or browser storage.
Routes require `MSRC_AUTH_PREVIEW=synthetic`, loopback Host and no deployment environment;
Next binds to 127.0.0.1. All Vercel environments reject the lab. It is dynamic, private,
no-store and excluded from indexing/production analytics. The managed-provider adapter
is a disabled integration contract; preview never calls Production Auth. Reset requests
fail closed pending approved recovery. Synthetic revocation scenarios reset no live factor.
New database policy/session evidence and own-context RPC are review-only; readiness
remains false. Privileged activity must be server-observed, with expiry checked before
idle evidence changes; refresh/context reads are never activity. No domain AuthorityReader,
feature RLS, signup, CMS, operational workflow, email provider or production authorization
is added. Verification/rollback/release gates are recorded in the feature note and PROGRESS.

## ORG-020 — Participant verification and staff SMS authentication, 3 October 2026

**Historical decision:** ORG-016 supersedes every phone/SMS authentication requirement below. ORG-015 regular-staff email controls and the distinct-person/in-person recovery safeguards remain current; no SMS provider, sender or budget is required now.

Authority: explicit organizer instruction in this conversation on 3 October 2026:
participants do not need MFA; verify accounts via email verification and phone verification;
staff/admins use password then SMS OTP. This overrides v0.5 AUTH-04's TOTP requirement,
AUTH-06's optional-phone baseline and the authentication part of SCP-05/EML-01's SMS
exclusion. Preserve `sources/Development_Specification_v0.5.txt` and dated TOTP receipts.

- Primary sign-in remains managed email/password. Participants require both current
  managed email and phone verification, stay AAL1 and acquire no staff authority from either.
- Staff/admins require current password proof followed by a verified phone MFA challenge,
  AAL2 and current scoped grants. Primary phone OTP, participant verification, email code,
  old TOTP and generic AAL2 are insufficient. Offboarding/factor change/reset still revoke.
- SMS is limited to authentication. Operational/security notices remain English-only email;
  WhatsApp/push and other SMS communications remain excluded. Supabase `mfa/phone` AMR
  proves the phone factor, not its delivery channel: trusted challenge code must explicitly
  select SMS, and approved provider configuration/UAT must verify SMS-only delivery.
- SMS provider/sender/budget, expiry/resend/attempt/account/IP controls, verified phone
  change/loss/reset process and recovery approver/operator remain TBD. Email OTP defaults
  do not approve SMS controls. Recent-auth maximum age and timeout-warning lead stay null.
  Phone authentication purpose is approved; privacy/retention/data-location documentation,
  production plan/region and operational release approvals remain separate gates.
- The closed local preview simulates successful password entry without collecting a real
  password. Its ephemeral test inbox displays generated email/SMS codes only when issued;
  no real delivery/account/invitation/grant/reset is performed. Live provider and both
  readiness flags remain false. No participant signup or operational workflow is added.
- ORG-019's participant 72h and privileged 30min idle/8h absolute limits remain; refreshing
  a token never changes the original absolute origin. New hosted migrations remain review-only.

The organizer reported the previous preview worked. This is bounded feedback on the
previous TOTP preview, not proof of the new SMS flow, real delivery, screen-reader review,
managed-factor lifecycle or release approval. Updated evidence belongs in PROGRESS.

## ORG-014 — Isolated managed-Auth testing and SMS control targets, 3 October 2026

**Historical decision:** ORG-016 supersedes every phone/SMS authentication requirement below. ORG-015 regular-staff email controls and the distinct-person/in-person recovery safeguards remain current; no SMS provider, sender or budget is required now.

Authority: the organizer's explicit answers in this conversation on 3 October 2026.

- First delivery test scope: Saudi numbers only. This is not a restriction on the
  eventual conference audience. No existing SMS service is available; RPClub is
  the designated contracting entity. Legal/vendor registration evidence is still needed.
- Shortlist Vonage with proposed sender `MSRC2027`, conditional on Saudi domestic
  eligibility, registration and a later approved quotation. This does not select an
  active provider, register a sender or authorize vendor messages or purchases.
- Keep testing in disposable GitHub CI for now. No paid hosted test project, Pro
  upgrade, phone-MFA add-on or SMS spend is authorized. Hosted organization/region
  selection is deferred; no need to settle it for the no-delivery CI test slice.
- Approved SMS control targets: six digits, five-minute expiry, 60-second resend
  cooldown, maximum three sends per phone and account per 15 minutes, ten per day,
  twenty per IP per hour, five failed entries then a 15-minute cooldown. Only the
  newest challenge may authorize access. Engineering interpretation: each daily
  cap uses a rolling 24-hour window and phone/account caps apply independently.
  Target approval is not implementation proof. Native managed APIs must not bypass
  these controls; all live/readiness flags stay false until enforcement passes.
- Approved recovery target: suspend/revoke first; verify identity and staff
  appointment; distinct approver and operator; remove old factor; require password
  and replacement-phone SMS enrollment; audit restoration. Both recovery roles
  are Super Admin and identity review is **in person**. Individual custodians are
  not named by this role-level answer and remain TBD. Participant loss uses
  verified email plus manual identity review and new-phone verification, without
  MFA. No live reset or staff/grant activation is authorized.
- Recent-auth maximum age, warning lead, privacy/retention/location, real-human
  UAT, security-email delivery and production release settings remain unresolved.

Managed compatibility conflict: current Supabase phone MFA documents successive
codes remaining valid until their five-minute expiry. Its verification hook does
not carry a challenge ID. UI/gateway-only throttling and the synthetic lab's
replacement invalidation do not establish the approved newest-challenge/abuse
controls on direct managed API calls. This is a release blocker requiring trusted
hook/database evidence and dedicated integration tests, not a reason to relax the
approved targets. See [managed test and decision packet](features/managed-authentication-plan.md).

The organizer reported the current synthetic SMS preview works. Record this as
bounded requester feedback, separate from real SMS delivery and real-human UAT.

## ORG-015 — Regular staff password then application email check, 3 October 2026

**Historical decision:** ORG-016 supersedes every phone/SMS authentication requirement below. ORG-015 regular-staff email controls and the distinct-person/in-person recovery safeguards remain current; no SMS provider, sender or budget is required now.

Authority: the organizer's explicit narrow amendment in this conversation. Replace
SMS OTP for **regular staff only** with password followed by a fresh code delivered
to the account's current verified email from trusted managed records. Super Admins
retain ORG-020's password/SMS phone MFA; participants retain email/password plus
email and phone verification without MFA. Roles/grants, ORG-019's participant 72h
and privileged 30min idle/8h absolute limits, and all operational gates are unchanged.

Conflicts flagged before implementation: current code/draft documents treated every
staff role as SMS/AAL2; Supabase email OTP is passwordless sign-in, not a native MFA
factor. AUTH-04/ROL-12 now distinguish the additional regular-staff email check from
Super Admin native MFA. Calling managed email OTP sign-in after password is not
proof of the approved sequence. No approved live SMTP/provider/sender exists.

- Use a server-generated single-use code and private database receipt bound to the
  exact user, managed session, current verified-email/user version, password proof
  and grant history. Fresh login requires a fresh check; refresh preserves the same
  receipt only while current evidence and session policy remain valid. Password-only
  access must fail at server and restrictive database/storage boundaries. This check
  creates no grant, native factor or AAL2 and no approval in user-editable metadata.
- Reuse approved ORG-014 staff targets for this additional email check: six digits,
  five minutes, 60-second resend, three/account/15min, ten/account/rolling24h,
  twenty/IP/hour, five wrong entries then 15-minute cooldown; newest challenge only.
  Account caps survive new sessions/email changes; no phone cap applies to email
  delivery. Participant AUTH-02 email defaults remain unchanged. This is an explicit
  carry-forward of approved staff controls, not a new production policy selection.
- Authentication emails stay English-only; UI instructions/errors support EN/AR/RTL,
  accessible code entry, expiry, resend and sanitized failure/retry. Console/test
  delivery only; do not fall back to Supabase's development email service.
- Preserve suspension/session revocation, in-person identity/appointment review,
  distinct Super Admin approver/operator and audit requirements. Regular-staff lost
  email/address-change recovery must verify a replacement email and require a new
  password session plus email check before restoration. No inbox-only support bypass,
  live reset or address-change endpoint is authorized. Exact evidence/procedure,
  named custodians and recent-auth timing remain unresolved; these actions stay closed.
- Inbox compromise may permit both password reset and receipt of the login code.
  This is weaker than authenticator-based MFA. It is the organizer-selected regular
  staff check, not independent-factor security or permission to reduce Super Admin MFA.
- Review-only additive migration; preserve both previous migration snapshots and v0.5.
  Use disposable CI and a loopback synthetic preview. Do not merge, deploy, modify
  production Auth, apply hosted migrations or send real email/SMS in this amendment.
  `codex/regular-staff-email` has Vercel Git deployment explicitly disabled.

Implementation and executed evidence: [regular staff email check](features/regular-staff-email-check.md)
and PROGRESS. Privacy/location, recent-auth age, warning lead, human UAT, production
configuration/release and all existing Super Admin/participant SMS gates remain open.

Implementation conflict found by genuine managed refresh testing: native
`auth.users.updated_at` changes on token refresh although email, password proof and
session origin are unchanged. Use a private relevant-field revision for email,
email-confirmation and password changes, rather than that generic timestamp. This
preserves the approved fresh-check-per-login requirement and revokes stale identity
proof without treating every token refresh as a new login.

Integration note: during this task remote main advanced to `c10b2c5` (PR21 public
chapter-title transitions). Its separate public decision also uses ORG-010. In this
authentication draft ORG-010 explicitly means the organizer's **2 October Production
designation** above. Preserve both decisions and reconcile their identifiers when
later integrating the drafts; do not silently substitute the public title decision
for the environment decision. No public/auth runtime overlap was found in PR21's
changed-file list, apart from shared decision/progress documents. This amendment
stays stacked on unmerged PR19; no merge or public redesign is performed here.

## ORG-016 — Remove authentication phone/SMS; Super Admin authenticator MFA, 3 October 2026

Source: explicit organizer instruction in this chat: remove all SMS and phone number verification because no provider will be purchased; Super Admins use authenticator MFA, staff use email OTP after password; leave SMS out.

- Participants use managed email/password and verified email only, with no phone collection/verification and no MFA. Public browsing stays open.
- Regular staff retain ORG-015's fresh private exact-user/session email check after password. This is application assurance at native AAL1, not email OTP sign-in, native MFA or AAL2.
- Super Admins require password followed by current verified authenticator TOTP at native AAL2, bound to the exact managed session/factor. QR/manual setup alternatives and accessible EN/AR/RTL instructions are required. Email receipts, phone factors or generic AAL2 do not substitute.
- Retire SMS/provider/sender/budget registration, delivery hooks, phone fixtures and phone recovery work. Historical source snapshots, dated decisions and prior migration files remain preserved; a new additive review-only override supplies current policy.
- Preserve all roles/scopes, strongest tier across editions, ownership/assignment, 72h participant absolute and privileged30min idle/8h absolute. Refresh never restarts origin or counts as activity. Keep every operational/readiness gate false.
- Approved staff email limits remain unchanged. Participant email defaults remain separate. TOTP native protocol and accelerated lab bounds are test configuration, not silently approved live abuse controls.
- Recovery keeps suspension/revocation before restoration, distinct Super Admin approver/operator and in-person identity/appointment review. Replacement authenticator setup or lost/changed email requires a verified procedure, fresh password and the appropriate check; named people, evidence/procedure/rehearsal and recent-auth remain TBD. No support bypass/reset endpoint is opened.
- Production email provider/sender/SMTP is missing. Console/test only, English-only emails, no Supabase development email fallback. Privacy/retention/location, recent-auth age, warning lead, production release and real-human UAT remain unresolved.
- Scope permits reversible review work, local synthetic preview and disposable GitHub CI only. No merge/deploy, hosted Auth/migration/reset, real delivery, invites/grants, recovery execution or paid resources.

Conflicts flagged before edits: PR22 code/docs still required participant phone and Super Admin SMS, with active Vonage/MSRC2027/budget/hook work and SMS-only adapter. Those are superseded, rather than treated as required approvals. Current remote main8482abf contains independent public mobile changes and ORG-010/011 IDs colliding with this stacked authentication draft's Production/private-administrator records. Preserve both meanings and reconcile IDs during later integration; do not merge unrelated public changes or publish administrator addresses.

### Dated exception — Isolated email readiness tests, 3 October 2026

The organizer selected a Gmail mailbox for sender and self-recipient, reported its
manager can assist, and explicitly approved one reviewed English readiness message.
The initial approval covered that single diagnostic attempt: no OTP/account data,
automatic retry, production Auth/SMTP changes or operational opening. This supersedes the
no-real-email restriction solely for isolated testing; it does not approve a production
provider, recurring delivery, participant communications or staff login release.
The credential remains locally encrypted outside Git; no Supabase development-email
fallback or credentials in CI. The initial attempt failed or could not confirm acceptance;
credential-free SMTP connection/TLS checks passed. Retain the one-attempt marker and
retain bounded per-attempt guards and diagnose failures before repeat delivery. At that stage,
Inbox receipt and full managed login/cookie/delivery UAT were unresolved; see PROGRESS.
The organizer reported no test message received and confirmed the credential was
created under the intended sender account.

The organizer subsequently stated, "Allow test emails whenever no need to ask."
Standing authorization therefore covers small isolated test emails from/to the already
selected self-recipient inbox without repeating send-approval questions. It does not
approve production authentication, live staff/participant communications, new recipients,
account/grant activation, hosted migrations or operational release. Preserve attempt
receipts, avoid blind retries and keep credentials outside Git. The second approved
attempt returned a generic SMTP general failure; sender readiness was then unverified.
The third bounded PowerShell7 diagnostic returned SMTP530; this is an authentication
or STARTTLS prerequisite error, not proof that the password itself is incorrect.
An AUTH-only verified-TLS diagnostic then returned535: the stored sender credential
was not accepted for the selected username. No email was submitted in that probe.
This identified the then-current username/credential/setup blocker without establishing
why it was rejected. Retries stopped pending mailbox-manager account checks and a
fresh dedicated credential entered through the hidden local test-only store.
Preserve earlier records; no live
staff access or production email configuration is approved.

The organizer then reported the replacement stored. Its single bounded AUTH-only
probe also returned535; no follow-on email was attempted. A read-only comparison
confirmed it is a different credential. Retain both encrypted local credentials and
all five attempt records. Sender readiness was then blocked pending mailbox-manager
account/security status checks; another rotation or retry required that evidence.
Standing isolated-test authorization and every production/release gate
remain unchanged. This result does not approve a weaker login flow or another provider.

The organizer subsequently confirmed Google2-Step is on and requested another try.
One further bounded AUTH-only attempt returned535 without a send. Read-only browser
inspection verified2-Step ON and revealed that the signed-in account address differs
from the earlier selected test address. The organizer explicitly chose the corrected
sender/self-recipient for isolated tests. A fixed corrected-account test then returned
AUTH235, SMTP acceptance and observed Primary Inbox delivery of the reviewed English
message. Earlier rejection referred to the submitted username/credential pair; do not
describe the replacement password itself as invalid. Preserve both local credentials
and all eight records. The standing test authorization follows the corrected mailbox;
it still does not approve production email, staff login release or other recipients.

## ENG-012 — Isolated staff email delivery and managed cookie composition, 3 October 2026

The organizer continued the next bounded delivery/cookie test after isolated sender
readiness. Existing standing test-email authorization covers small English synthetic
staff-code messages to the confirmed self-recipient only. This does not authorize real
staff accounts, other recipients, production SMTP or managed Auth changes.

- Reuse the existing staff email receipt, policy and role enforcement. An optional
  Windows loopback preview passes codes by bounded stdin to the private local helper;
  it returns safe delivery mode/expiry, never a code or recipient. Missing/invalid
  configuration, deployment/CI, delivery failure or uncertainty denies without fallback.
  The default synthetic inbox and participant/Super Admin flows remain unchanged.
- Test genuine managed password and staff email receipts through an actual loopback
  HTTP listener in the disposable unlinked GitHub runner. Native tokens remain in
  bounded server memory behind an opaque HttpOnly/SameSite cookie. Current database
  context remains the authority before protected access and before/after refresh.
  No production Next route, active grant or provider credential is installed.
- Cookie lifetime follows the immutable native session origin. Refresh preserves the
  receipt and idle/absolute clocks; new login needs a new email check. Cookie deletion
  after failed logout is local fail-closed cleanup, not proof of native revocation.
- HTTP lacks the Secure cookie attribute solely on the isolated loopback listener.
  This is test transport, not an approved production session-store/cache/CSRF design.
  Lab capacity and fixture acceleration are development bounds, not new live policy.
- Storage is disabled on the disposable stack. Its unavailable route cannot prove
  private-object authorization. Real domain storage policies and human inbox/login,
  screen-reader/device, recovery and outage UAT remain release gates.
- Native cookie CI exposed an existing read-only RLS incompatibility: GET/HEAD cannot
  call a locking/mutating context. The additive review-only migration
  `20261003180734_readonly_authentication_context.sql` preserves all assurance rules
  while separating pure statement-snapshot observation from trusted initialization
  and mutation. Stable role projection and authentication predicates share the same
  snapshot (`msrc_read_access_context` and `msrc_second_step_satisfied`). Missing
  initialized history denies; reads cannot touch idle/absolute clocks. The existing
  volatile `msrc_access_context` stays the POST initializer, not an RLS read helper.
  Existing write RPC semantics and historical migrations remain unchanged. Read
  snapshots observe revocations committed before the statement; subsequent statements
  observe later revocations. This is not permission or workflow activation.
  Pure reads use statement-start admission time, not transaction-start time: a read
  begun before expiry can finish afterward; its next statement denies even in the
  same transaction. Reads never move origin, idle activity or absolute deadlines.
  Existing server/write/consume paths retain actual-clock rechecks after lock waits.
  This timing/snapshot boundary must be reviewed with future resource policies before
  activation; no response-completion deadline guarantee is claimed.

The new migration is review-only and tested exclusively in disposable CI. No dependency,
hosted migration/fixture/reset, deployment, merge, paid service, recovery action or
production readiness change is performed by this slice.
Recent-auth age, warning lead, named distinct recovery custodians/procedure and
privacy/retention/location remain unresolved. Executed evidence belongs in PROGRESS.

## ENG-013 — Authentication foundation closeout, 3 October 2026

The organizer reported that the isolated preview works and requested the next steps,
then directed: finish these foundations without an additional recovery rehearsal and
identify the next task from the linked checklist. The organizer also confirmed that
a Super Admin manages account recovery. This identifies the responsible role; it
does not name the two distinct approved custodians or waive the in-person safeguards.

- Close the bounded BL-AUTH-05/06 development work as implemented and verified:
  participant verified email/password without MFA, regular-staff password plus the
  private current-session email receipt, Super Admin authenticator TOTP, preserved
  grants/scopes and participant 72h/privileged 30min idle/8h absolute session policy.
- Do not add a synthetic recovery page, workflow or native recovery adapter. Live
  restoration, factor reset, identity changes and all operational/readiness gates
  remain closed; this closeout is not a production release or approved procedure.
- Preserve user-reported preview success as partial human feedback. Exact devices,
  locales and accessibility tests were unspecified. Managed no-delivery CI and
  actual local test email remain separate evidence, not combined native-login/
  real-inbox human UAT.
- Correct active READMEs and feature notes that still mention superseded phone/SMS
  flows or entirely untested cookie/test-delivery work. Historical sources, dated
  decisions, migrations and test receipts remain unchanged.
- The dormant private maintenance helper is currently closed by postgres-only
  invocation, denied API execution, unconditional factor-reset denial and enforced
  false-only readiness. Before eventual activation it needs complete current
  session/idle/cutoff/password/TOTP/grant checks and actual recent-auth age enforcement.
  Configuring a timing value alone is insufficient. No extra migration is needed to
  close the current path, and no live helper is connected in this task.

Next checklist development item is sequence 3: BL-PUB-06 Contact and BL-PUB-08
Privacy/Terms. Build truthful bilingual closed scaffolds while controller/contact,
service-processing/location/retention facts and final copy approval remain pending.
This is separate from review/merge of PR19/25 and unresolved authentication release
approvals. No merge, deployment or production authentication change is authorized.

## ENG-014 — Rebase the closed authentication foundations onto main, 4 October 2026

Authority: the organizer requests rebasing `codex/email-authenticator-no-sms` (PR25)
onto current main including PR28, retaining both PROGRESS entries, running `pnpm check`
and the authentication Playwright configuration, pushing and marking ready for review.

- Rebase the complete authentication stack onto main 1cac875, preserve both public and
  authentication progress/decision records, and target PR25 directly at main. Preserve
  current public motion, indexing, locale redirects, structured data and calendar.
- Retain main's push-to-main-only CI trigger together with the auth browser and disposable
  managed database checks. Both authentication branch deployment-disable entries remain.
- Resolve parallel decision-ID collisions as documented at the start of this register;
  no organizer policy is changed. Correct the current issue index's obsolete phone/SMS
  descriptions, preserving source snapshots, historical receipts and migration contents.
- PR25 contains PR19's implementation with the explicit later email/TOTP amendments.
  PR19 has no unique implementation requiring a separate merge; recommend closing it as
  superseded after PR25 is merged and verified. PR2's complete head is already an ancestor
  of main and can be closed now. This task reports those findings without closing either PR.
- Ready for review is not merge/release approval. All operational/readiness gates remain
  false; no deployment, hosted migration/reset/fixture, live account/grant/reset or test
  email is performed. Current execution receipts belong in PROGRESS and the PR.

## ORG-021 — Closed Contact route and fixed email routing, 4 October 2026

Authority: explicit organizer instruction in this conversation. BL-PUB-06 uses the
following topics and subject tags, in this exact order; each routes to
`contact@msrc2027.com`:

1. General — `[MSRC General]`
2. Registration — `[MSRC Registration]`
3. Research & abstracts — `[MSRC Abstracts]`
4. Workshops — `[MSRC Workshops]`
5. Hackathon — `[MSRC Hackathon]`
6. 3MT — `[MSRC 3MT]`
7. Sponsors & partners — `[MSRC Sponsors]`
8. Website & account support — `[MSRC Support]`
9. Privacy & data requests — `[MSRC Privacy]`

Planned sender: `no-reply@msrc2027.com`; Reply-To is the visitor's server-validated
email. Subject: `<tag> <short summary>`. The summary is derived from the message,
without adding another required visitor field. The form has topic, name, email,
optional related reference and message; expose the recipient as a mailto link.
The organizer reports that forwarding and Gmail tag filters were tested. This is
user-reported evidence, not a fresh application delivery test.

This supersedes v0.5 SUP-01's Gmail plus-address routes for Contact only. Preserve
the source snapshot. Render the EN/AR form disabled, rejecting API requests before
reading their contents: no sending, storage, provider, secrets or CAPTCHA. An email
provider remains unapproved. Fixed planned addresses do not authorize live delivery,
DNS/provider configuration, authentication-email changes or other workflow openings.

## ORG-022 — Participant-data responsibility and policy wording, 4 October 2026

Authority: explicit organizer instruction. The Research Principles Club is responsible
for participant data. The policy follows Saudi Arabia's PDPL and links to KAU's policy:
[English](https://kau.edu.sa/en/page/privacy-policy) and
[Arabic](https://kau.edu.sa/ar/page/privacy-policy).
Emad Khoja writes and approves the final wording. Terms wording is pending from Emad
and remains a placeholder. EN/AR routes may expose clearly labeled read-only drafts
with version `2026-10-04-draft`; this date identifies the draft, not legal effectiveness.
Every unapproved section and translation approval remains a placeholder. Institutional
authority, legal bases, processors, actual locations/transfers and final policy approval
are not established by this organizer responsibility decision or links to KAU.

## ORG-023 — Registration, abstract and certificate retention, 4 October 2026

Authority: explicit organizer instruction; Abdulrahman Ismail set retention.
Registrations and abstracts are deleted one year after the conference. The certificate
record consisting of name, certificate number and date is kept for two years so
certificates stay verifiable. This confirms those durations, not a working cleanup job.
The certificate period's starting point, other record types, inbox/media/log/export/
backup handling and restoration/deletion implementation remain unresolved. Do not
invent a certificate deadline or extend this decision to unrelated data.

## ORG-024 — Data requests and responsible owner, 4 October 2026

Authority: explicit organizer instruction. Data requests go to `contact@msrc2027.com`
with topic "Privacy & data requests"; response is within 30 days. Akram Awan handles
requests. This does not grant account permissions or implement identity verification,
deletion automation, a case database or approved request-email retention.

## ORG-025 — Photography notice and publicity amendment, 4 October 2026

Authority: explicit organizer instruction. The event is photographed and recorded,
and the registration page states this clearly. Organizer decision: that notice is
sufficient for publishing identifiable photos and recordings, with no separate consent
step. This explicitly supersedes BL-PUB-08's "no default publicity consent" exclusion
and the source-based assumption that optional publicity consent must be a separate
product step. Record this product decision without adding a consent checkbox/bypass.

**Conflict and release limitation:** a notice is not itself evidence of a lawful basis.
The [official PDPL](https://misa.gov.sa/app/uploads/2025/08/PersonalDataProtectionLaw.pdf)
includes identifiable photographs/videos in personal data and applies conditions to
processing/disclosure (Articles 1, 5–7 and 15). Emad's final publication wording and
institutional/privacy review of the applicable legal basis remain pending. Public
drafts state the photography fact and label publication/legal-basis wording as a
placeholder; they do not assert that notice legally substitutes for consent. This
slice publishes no new identifiable media and leaves media rights/removal gates closed.

## ORG-026 — Current public-site data description, 4 October 2026

Authority: explicit organizer instruction. The organizer describes the current site
as collecting no personal data except cookieless, anonymous visit analytics (Vercel).
Public copy identifies those analytics and states that the closed website forms do
not accept personal information. This is not an audit of all hosting/network/provider
logs or a claim of anonymization across every processor. Existing analytics/Speed
Insights configuration remains; Contact and draft policy routes stay excluded from
its route allowlist. Provider processing, log retention, actual locations/transfers
and email-inbox handling remain clearly marked placeholders pending approved wording.

## ENG-015 — Contact and policy draft boundaries, 4 October 2026

BL-PUB-06/08 add static bilingual pages and a permanently closed Contact handler,
without database/storage schema, outbox, provider or production setting changes.
Server-only validation is independently tested using synthetic values and is not
invoked by the closed endpoint. Its defensive input bounds (name/reference 120,
email 254, message 4000 and derived subject summary 80 characters) are implementation
bounds, not organizer-approved live anti-spam quotas. A honeypot uses no CAPTCHA;
live rate limits/abuse handling, CSRF/origin protection and delivery/retention approval
must be reviewed before any future opening. Draft policies remain noindex and outside
the production sitemap. Footer links reach the new routes; registration stays closed
and adds only the confirmed photography fact. Authentication/permissions/session
policies, all readiness flags, migrations and original v0.5 snapshots are preserved.

## ORG-027 — Public policies use organizational roles, 4 October 2026

Authority: explicit organizer review of PR30. Remove internal personal names and
decision/drafting attributions from public Privacy/Terms in both EN/AR, including
their shared draft notice and metadata. Data-request wording becomes "Our privacy
lead responds within 30 days" and its Arabic equivalent. Preserve the contact channel,
response period, retention decisions, draft version/status and all release gates.
ORG-022–024 retain Emad Khoja's wording/approval responsibility, Abdulrahman Ismail's
retention decision and Akram Awan's request-handling responsibility as internal records.
The photography-publication section stays a placeholder for Emad; this copy amendment
does not approve it, appoint a different owner or activate collection/delivery.

## ORG-028 — Contact Resend provider and routing, 4 October 2026

Authority: explicit organizer instruction. For BL-PUB-06 only, use Resend through a
server-only direct HTTP fetch, with no added SDK. The organizer reports that
`msrc2027.com` is verified in Resend and the Vercel Production-only `RESEND_API_KEY`
is set with Sending access restricted to that domain. This is supplied configuration
evidence, not a fresh credential inspection or successful application delivery test.

From is `MSRC 2027 <no-reply@msrc2027.com>`; every topic goes to
`contact@msrc2027.com`. Reply-To is the validated visitor email; subjects preserve
ORG-021's ordered tags and derived short summary. Use plain text with escaped visitor
input and the visitor's EN/AR language, English envelope labels, no HTML or attachments.
No automatic reply goes to the visitor. Add no provider accounts, DNS changes or secrets.

This supersedes ORG-021/ENG-015's no-provider/permanently-closed implementation for
Contact only. The default remains closed; no hosted migration, production setting,
merge, production deployment or real email is authorized in this implementation task. Staff email
delivery, grants, participant flows, authenticator MFA, session policies and all other
operational gates are unchanged. Source specification v0.5 is preserved.

## ORG-029 — Contact delivery switch, abuse counters and data boundary, 4 October 2026

Authority: explicit organizer instruction. Require server-only
`CONTACT_DELIVERY_ENABLED=true`; without it retain the original closed form and
before-input API denial. Keep the honeypot and add minimum fill time, per-IP and per-email
hour/day limits using only expiring hashed counters in the existing Supabase project,
forced RLS and no browser access. The Contact global cap is **60 admitted attempts per
UTC day**, preserving headroom under the organizer-reported Resend 100/day plan budget.
Contact reservations are charged before the provider attempt; failures/uncertainty are
not refunded. This cap does not itself reserve or enforce quotas for future staff emails.

The instruction's `3/hour` and `10/day` are examples. The implementation proposes these
for each IP/email and a 3-second minimum fill time as configurable engineering defaults;
organizer confirmation is still requested. They are not silently recorded as approved
production policy. No app/database/log/analytics copy of inquiry content is retained.
Application submission logs contain only outcome (`sent`, `rejected`, `limited`) and
allowlisted topic. Plaintext email necessarily passes through Resend and the receiving
inbox; the instruction's literal "don't store message content anywhere" conflicts with
that delivery/reply flow. Clarification of the intended external-storage exception and
provider/inbox retention remains pending. Public factual copy explains conditional
Contact processing, superseding ORG-026's no-form-collection description for Contact only.
This is not new final legal wording or approval of processors, locations/transfers or
inbox retention. All Privacy/Terms/publication placeholders and ORG-027 role wording remain.

## ENG-016 — Contact admission, delivery and activation boundaries, 4 October 2026

The Contact adapter uses exact-origin checks, Vercel's trusted IP header, bounded JSON,
strict validation, a signed single-attempt 30-minute token and domain-separated HMAC
hashes. A service-role-only SECURITY INVOKER RPC serializes five UTC quota buckets and
a nonce in one transaction. It stores no email/IP plaintext or inquiry content. Forced
RLS denies browser roles. A pg_cron job physically deletes expired counters every five
minutes; expiry is not a claim about provider logs, database backups or instant deletion.
The standalone migration `20261004114603_contact_abuse_counters.sql` is review-only;
do not push historical pending migrations or apply it to hosted Production in this task.

One Resend attempt has a bounded timeout and idempotency key. Provider acceptance is not
inbox delivery. Used tokens, ambiguous outcomes and failures do not trigger automatic
retries. UI retries require explicit fresh-attempt preparation and a separate send action.
No outbox or inquiry history is added; durable notification/batch delivery remains future
work. Loopback tests use hard-coded dummy credentials and intercepted services; Vercel
Preview refuses live delivery even if mistakenly flagged on.

`sb_secret_` counter access is backend-only with `apikey`, not a Bearer token. Supabase's
secret key carries broad service_role privilege, not native per-RPC scope; isolate custody
and call only this counter RPC from the adapter. Vercel environment changes take effect
on a new deployment, so the requested flag is a redeploy switch, not an instantaneous
runtime kill switch ([Vercel environment variables](https://vercel.com/docs/environment-variables)).
Resend documents stored data in the US and 30-day email/log retention on Free/Pro/Scale
([Resend security](https://resend.com/security)); a sending region does not change storage
location. These are provider facts to review, not organizer-approved privacy settings.
The activation/rollback runbook records these limits and the remaining manual checks.

## ENG-017 — Closed participant account protocol, 4 October 2026

BL-AUTH-02/03/04/06 participant/08 shell follows ORG-016/019: Supabase-managed
email/password, verified email, 72-hour original native-session deadline, no phone,
SMS or participant MFA. Name/email/password are the only signup fields. The dashboard
has own account state/name and closed registration; no operational action or grant.

Application-owned six-digit HMAC codes use reviewed private SQL for expiry, newest
code, single use, failed attempts, account/IP throttling, provider delivery state and
an explicit email budget. Supabase owns all password hashing and native password
mutations. Database admission and transaction-bound one-use operations prevent raw
native verification/recovery tokens or participant recovery from bypassing controls
or changing a privileged actor. Existing stronger all-edition roles still prevail.
Server validation respects the pinned native Auth provider's 72-byte UTF-8 password
maximum, including Arabic, before account creation or code consumption. This is provider
compatibility rather than a new organizer password-policy decision.
Email templates use the approved Resend sender and English text; the custom Supabase
SMTP plan is documented without changing hosted settings.

Generic issuance acknowledges before private account lookup/password hashing/provider
work using bounded Next `after`, with shared public timestamps and readiness rechecks.
This removes account-dependent response timing; it is one attempt, not durable delivery
or a sent-email promise. Explicit resend/recovery remains rate-limited. Native Admin
creation inserts before requested metadata; the authoritative reservation therefore
binds the exact actor/email at insertion, never user-editable metadata.

The server flag, database readiness, budget and approved EN/AR Privacy record are
independent gates. The current `2026-10-04-draft` has no approval/effective date, so
the new approved registry remains null. Synthetic notice approval exists only in
strict loopback/disposable tests. Production and Preview remain closed. New migration
`20261004164034_participant_accounts.sql` is review-only and has not been applied
to hosted. [Implementation and exact activation guide](features/PARTICIPANT_ACCOUNTS.md).

The preceding staff CI fixes are separate PR37. Fresh main was `bc2fb87`; PR38 changes
only shared PROGRESS. Shared append-only logs do not constitute code/feature overlap.
The participant workflow and native fixture are separate new files, preserving PR37's
staff code, tests and CI files. No merge, hosted configuration, real user or email is
authorized by this implementation task.

PR39 review on 4 October 2026 sets a minimum of ten Unicode characters for participant
sign-up, email verification and password reset. Sign-in remains compatible with existing
shorter passwords, and the 72-byte UTF-8 maximum remains enforced. EN/AR hints and
field errors explain the requirement. The activation guide includes the corresponding
future managed Auth setting; this review changes no hosted settings.

## ENG-018 — BL-AI-01 Claude advisory design, 5 October 2026

Authority: the requester selected the Claude API, official `@anthropic-ai/sdk` and
`claude-opus-5-5` for this disabled adapter and synthetic evaluation task. This is
a provider design selection, not approval to process real manuscripts. The earlier
DeepSeek prototype is not used, imported or migrated. AI-01 through AI-06, PRV-07,
CFG-03/09/10 and REL-03 govern the remaining processing and scientific gates.

- Use structured JSON output, adaptive thinking with explicit effort, no tools,
  cached fixed system/rubric text and application validation of criterion coverage,
  score ranges and short comments. Check `stop_reason` before reading content.
  Pin SDK 0.131.0 and commit its lockfile; official docs and installed SDK types
  are the API authority.
- Individual requests opt into Anthropic server-side refusal fallback with
  `fallbacks: "default"` and `server-side-fallback-2026-07-01`. Record the model that
  actually serves the response. Default fallback routing is also subject to
  scientific/privacy/budget approval; model changes require reassessment.
- API limitation: [Anthropic explicitly excludes server-side fallback from
  Message Batches](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback).
  Bulk runs use Message Batches without the unsupported parameter; refusals and
  failed items remain manual-review cases. No automatic resubmission or client retry.
  [Raw JSON Schema numeric bounds are unsupported](https://platform.claude.com/docs/en/build-with-claude/structured-outputs);
  describe ranges in the schema and enforce them locally before accepting a score.
- Production remains disabled: flag, key and placeholder rubric cannot activate it.
  Complete version-bound approval evidence, approved committee rubric, scientific-lead
  evaluation, privacy/data-flow approval, privileged execution, audit and atomic
  budget reservation are required. No route, persisted job, reviewer reveal or
  outcome publisher is connected by this contract. The evaluation rubric is
  `UNAPPROVED`; synthetic human/model values are not committee calibration.
- A separate local CLI may send only the built-in synthetic set with an explicitly
  supplied local key and run consent, bounded operating configuration and provider
  account spend limit. It rejects CI and hosted execution. This task makes no live
  model request and introduces no API key, account or hosted configuration.

The activation checklist, API references, disable procedure and remaining
BL-AI-02/03/04 integration work are in [the feature note](features/ai-assessment.md).

PR #40 review clarification, 5 October 2026 (explicit requester instruction):
identity screening blocks the submission's own author names and institution names
from its locked snapshot, emails, phone numbers, licence numbers and IRB numbers.
Generic institution words such as university, hospital or college of medicine,
including Arabic equivalents, are non-blocking warnings recorded as safe categories
in provenance. This avoids suppressing ordinary study-setting descriptions such as
"patients at a tertiary hospital in Jeddah". EN/AR synthetic pairs verify the
distinction. These changes do not approve real-manuscript processing or alter
the remaining privacy, scientific evaluation and activation gates.

## ORG-030 — Public registration and workshop wording, 5 October 2026

- Status: CONFIRMED explicit organizer decision from the requester in this chat.
- Public English and Arabic copy must not describe the registration/booking back-office
  approval process or discounts. Organizers tell eligible KAU students about discounts
  directly. Public steps describe account creation, email verification, registration and
  payment, then the confirmation email and ticket. Workshop steps describe choosing a
  workshop, booking with confirmed conference registration, then confirmation email.
- A place is confirmed by its confirmation email; account creation, email verification,
  requesting registration or booking does not promise a confirmed place. Use a clear
  promise to email the visitor to confirm their place.
- Supersedes the public descriptions introduced under ORG-005/006 and any earlier
  public presentation of REG-02/03, PAY-03 and WKS-02 manual approval or discounts.
  The underlying specification rules, backend transitions, approval enforcement tests
  and discount support remain unchanged. Ethical/scientific approval requirements are
  separate and remain accurate where applicable. Source snapshots stay historical.
- IDs: REG-01/02/03/05, PAY-03, WKS-02, LOC-01/03, CMS-04, SCP-02, REL-01.

## ORG-031 — Confirmed venue, 5 October 2026

- Status: CONFIRMED explicit organizer decision from the requester in this chat.
- Venue: **King Faisal Conference Center / مركز الملك فيصل للمؤتمرات**,
  King Abdulaziz University, Jeddah. Address: **Abdullah Sulayman St,
  King Abdulaziz University, Jeddah 22254**, Saudi Arabia (country code SA).
- Publish the bilingual venue in the shared typed configuration, public key facts,
  Dates & venue, relevant FAQs and pathway/registration copy, search/link descriptions,
  schema.org Event Place/PostalAddress and the all-day calendar LOCATION. Add an
  accessible EN/AR Google Maps directions link opening in a new tab.
- Supersedes the venue-TBD portion of CFG-01, the venue-unset summary in PROJECT_BRIEF,
  and earlier unknown-venue public copy and no-venue tests from ORG-001/004/005/006.
  It does not change the approved 27–28 January 2027 dates or invent an opening instant.
  Session times, doors and rooms stay to be announced; operating windows, capacities,
  prices and workflow release gates remain unresolved. Source snapshots are unchanged.
- IDs: SCP-01/02, CFG-01, TIM-01, LOC-01/03, CMS-04, REL-01.

## ORG-032 — Plain localized numbering, 5 October 2026

- Status: CONFIRMED explicit organizer decision from the requester in this chat.
- Section eyebrows, chapters, pathway/card/programme numbers, step lists and internal
  design-system examples use 1, 2, 3 in English and ١، ٢، ٣ in Arabic. Remove zero
  padding at the shared formatter and hard-coded content sources. Homepage fifth-edition
  art uses **5 / ٥**.
- Supersedes the zero-padded working presentation in ENG-007, ORG-006/009/010/011/012
  and earlier source/content examples. Number order, useful chapter links and RTL remain.
  Date/time/countdown formatting and internal identifiers are unchanged; this is an
  index display decision. Check alignment at 320px, phone, tablet and desktop in EN/AR.
- IDs: DSN-02, ACC-01, LOC-01/03, CMS-04, SCP-02, REL-01.

Implementation and verification for ORG-030/031/032:
[public copy, venue and numbering](features/organizer-public-decisions-2026-10-05.md).
This task authorizes a draft PR. It does not authorize merging, production publication,
opening workflows, DNS/paid resources or real participant communications.

## ORG-033 — Full venue sentence, 5 October 2026

- Status: CONFIRMED explicit organizer instruction in the PR #41 follow-up.
- The Dates & venue location sentence is **King Faisal Conference Center, King
  Abdulaziz University, Jeddah, Saudi Arabia.** / **مركز الملك فيصل للمؤتمرات،
  جامعة الملك عبدالعزيز، جدة، المملكة العربية السعودية.**
- Supersedes the incomplete institution/city-only `locationBody` left after ORG-031;
  it does not change the confirmed venue/address or the remaining schedule TBDs.
- IDs: SCP-02, CFG-01, LOC-01/03, CMS-04, REL-01.

## ORG-034 — Getting there and optional visitor guidance, 5 October 2026

- Status: CONFIRMED explicit organizer instruction in the PR #41 follow-up.
- Add bilingual Getting there content using the existing design system and an
  original self-hosted SVG schematic of Jeddah, labelled Map not to scale /
  الخريطة ليست بمقياس رسم. Show JED airport, the Haramain Airport and Jeddah
  Al-Sulaymaniyah stations, KAU and the highlighted conference venue, with main
  roads. Include a route text alternative and correctly shaped Arabic/RTL labels;
  keep north-up geography. No map embed, SDK/key, tracker or provider request on
  page load. Ordinary Google Maps, Apple Maps and Waze links derive their encoded
  destination from venue config and open a new tab only when activated.
- Airport options: taxi/Uber/Careem directly to the venue; Haramain Airport station
  to Jeddah Al-Sulaymaniyah then a taxi; airport car rental. No distances, travel
  times, prices or train schedules are approved by this decision.
- Optional typed venue config supports travelTimes and entry gate, parking,
  entrances, accessibility, prayer areas, food and Wi-Fi guidance. Render each
  supplied localized value only; omit empty sections/fields and all public
  placeholders. Leave these fields empty now. The international note states
  Saudi local time (UTC+3); the optional official Visa information URL is unset.
- Extends ORG-031's venue presentation and supersedes the earlier Dates & venue
  page scope that ended at venue/calendar/directions/schedule information. Existing
  confirmed dates, venue, calendar and directions stay; session times, doors and
  rooms remain unannounced. Operational closures and ORG-030 copy rules stay.
- IDs: SCP-02, CFG-01, LOC-01/03, ACC-01, PRV-01/07, CMS-04, REL-01.

Implementation, optional-field contract and verification:
[Getting there feature note](features/venue-travel.md). Work remains on draft PR #41;
this follow-up authorizes its update and CI verification, not merging or publication.

## ORG-035 — Confirmed arrival, venue support and visa responsibility, 5 October 2026

- Status: CONFIRMED explicit organizer instruction in the latest PR #41 follow-up.
- Taxi/ride-hailing and car-rental cards publish **About 35–40 minutes by car from
  King Abdulaziz International Airport** / **نحو ٣٥–٤٠ دقيقة بالسيارة من مطار
  الملك عبدالعزيز الدولي**. This estimate does not appear on the Haramain card.
- Publish all six supplied bilingual venue details:
  - Entry gate: **Enter King Abdulaziz University through the Main Gate (Wing Gate).
    There are no checks at the university gate.** / **ادخل جامعة الملك عبدالعزيز
    من البوابة الرئيسية (بوابة الطير). لا يوجد تفتيش عند بوابة الجامعة.**
  - Your ticket: **Your QR ticket is checked at the conference entrance. Save it
    on your phone before you arrive.** / **يُتحقق من تذكرتك (رمز QR) عند مدخل
    المؤتمر. احفظها على هاتفك قبل وصولك.**
  - Parking: **Parking is available, including accessible parking spaces.** /
    **تتوفر مواقف للسيارات، بما فيها مواقف مخصصة لذوي الإعاقة.** This does not
    establish step-free or lift access inside the building.
  - Accessibility support: **Need accessibility support? Our organizers on site
    can help. You can also let us know before the event through the contact form.** /
    **تحتاج إلى مساعدة في الوصول؟ يسعد المنظمون في الموقع بمساعدتك. ويمكنك
    إبلاغنا مسبقًا عبر نموذج التواصل.** Link the contact-form phrase to the
    corresponding `/en/contact` or `/ar/contact` page.
  - On site: **Prayer areas and food are available.** / **تتوفر مصليات وأماكن للطعام.**
  - Wi-Fi: **Wi-Fi is available but may be unreliable. Please use mobile data and
    save your ticket offline.** / **تتوفر شبكة Wi-Fi لكنها قد تكون غير مستقرة.
    يُنصح باستخدام بيانات الجوال وحفظ التذكرة مسبقًا.**
- Retain Saudi local time (UTC+3). Publish **Attendees travelling from abroad are
  responsible for their own visa. MSRC is unable to provide visa invitation letters.** /
  **يتحمّل المشاركون القادمون من خارج المملكة مسؤولية الحصول على التأشيرة.
  لا يستطيع المؤتمر إصدار خطابات دعوة للتأشيرة.** Remove the optional visa-link
  field and public link entirely.
- Supersedes ORG-034's empty travel/venue guidance, prohibition on publishing a
  travel estimate and optional visa-link contract. Other empty optional localized
  fields still render no placeholders. No prices, train schedules, distances or
  additional accessibility facilities are approved. Session times, doors and rooms
  remain unannounced; backend enforcement and workflow gates remain unchanged.
- IDs: SCP-02, CFG-01, LOC-01/03, ACC-01, CMS-04, REL-01.

## ORG-036 — Corrected Jeddah schematic and phone labels, 5 October 2026

- Status: CONFIRMED explicit organizer instruction in the latest PR #41 follow-up.
- The Haramain airport station is at JED: show one combined airport/station
  marker, with the railway extending south to Jeddah Al-Sulaymaniyah. Remove
  the separate station east of the airport and the intervening rail segment.
- Place the conference-center label directly beside its highlighted pin, inside
  or attached to the KAU campus area; no connector crosses a road. The campus
  label remains King Abdulaziz University / جامعة الملك عبدالعزيز.
- The only named road is Abdullah Sulayman St / شارع عبدالله سليمان, from the
  confirmed address. Remove Prince Majid and other unverified names; other
  main-road lines are unlabelled. This schematic shows general orientation,
  not precise routes, distances or geography.
- Use a simplified phone layout where needed so labels do not intersect lines
  or each other at 320–430px in EN/AR. Keep the sea west and north up in both
  languages; Arabic label shaping/RTL does not mirror geographic positions.
- Supersedes ORG-034's initial map geometry/labels, separate airport-station
  presentation and road/connector artwork. Keep the local SVG, accessible text
  alternative, not-to-scale label and no-provider-request privacy contract.
- IDs: SCP-02, CFG-01, LOC-01/03, ACC-01, PRV-01/07, CMS-04, REL-01.

## ORG-037 — Approve and publish Privacy Policy and Terms v1.0, 6 October 2026

Authority: explicit organizer instruction in the current publication task. The
English source documents in `docs/policies/privacy-policy-v1.0.en.md` and
`docs/policies/terms-v1.0.en.md`, supplied by `docs/policy-text-v1` commit `48017fa`,
are approved for exact publication. Use the label "Version 1.0" and one configured
effective date set to the date this PR is published. Publish a complete, faithful
formal Modern Standard Arabic translation with equivalent sections, tables and
localized internal links. Organizers should have a native reader review the Arabic
translation, particularly because the Arabic Terms prevail.

The latest and stable v1.0 routes become final, approved and indexable, with sitemap
EN/AR alternates. Remove public draft banners and old draft-version links; if the
historical dated snapshot is retained it remains noindex. This supersedes ORG-022,
ORG-026/027 and their related placeholder/unapproved-wording descriptions for these
two policies. Keep their dated receipts and the v0.5 source unchanged as history.

Approve the participant sign-up privacy notice as Privacy Policy v1.0, with short
EN/AR summaries and a policy link. Approval of text is separate from account release:
`PARTICIPANT_ACCOUNTS_ENABLED` stays default-off, hosted migrations and database
readiness/activation are unchanged, and no live user or email is authorized here.
Policy statements about future registration, retention and AI do not establish that
those implementations exist. Commands and actual results belong in PROGRESS.

IDs: SCP-02, PRV-01/02/04/05/07/08, LOC-01/03, CMS-04, AUTH-06, CFG-09/12, REL-01/06.

## ORG-038 — Faculty of Medicine as data controller, 6 October 2026

Authority: explicit organizer decision and approved Privacy Policy v1.0 section 1.
The Faculty of Medicine, King Abdulaziz University is the controller of personal
information processed for the conference. The Research Principles Club organizes
MSRC 2027 and handles personal information on the Faculty's behalf. This supersedes
ORG-022's earlier responsibility description where it left the controller unresolved;
it does not appoint a new internal request handler or change infrastructure custody.
Actual processing safeguards and operational release evidence remain separately
required before an affected workflow opens. IDs: PRV-01/02, INF-03, CFG-09/11.

## ORG-039 — Registration identity verification and internal attendee list, 6 October 2026

Authority: explicit organizer decision and approved Privacy Policy sections 2, 3 and 7,
and Terms section 3. Conference registration must collect **national ID or Iqama
number**, or **passport number for international attendees**, for identity
verification. Registered attendees have an internal attendee list accessible only
to authorized organizers. There is no public attendee directory.

This explicitly supersedes the "No national IDs" project rule and the exclusions in
AUTH-06, PRV-03, HAC-10/CFG-09/13 as they apply to conference registration. It does not
authorize identifier collection during account creation or create a separate hackathon
field. Retain the historical source snapshot. Add the registration implementation
requirement to BL-REG-01: strict server/database access control, encryption at rest if
feasible, protected exports/logging, and deletion one year after the conference
(by 28 January 2028), including controlled exports/files and backup-cycle handling.
The current task is documentation/publication only: build no registration field,
schema, migration, export or cleanup job, and keep registration closed.

IDs: AUTH-06, REG-01/05, ROL-07/08, PRV-03/05/06, HAC-10, SEC-01/02, CFG-09/13, AT-02/17.

## ORG-040 — DeepSeek provider and China processing, 6 October 2026

Authority: explicit organizer decision and approved Privacy Policy v1.0 sections 4
and 6. The selected advisory AI provider is **DeepSeek**, processing in the
**People's Republic of China**. This supersedes ENG-018's Anthropic/Claude provider
selection for future activation. PR #40's built adapter still targets Anthropic;
do not change its provider code in this policy PR. Add a BL-AI-01 backlog task to
switch the adapter to DeepSeek before activation and repeat provider-specific
sanitization, schema/output, failure, provenance, cost and evaluation checks.

Keep AI disabled. Only approved scientific content may be transmitted; author/account
names, emails, affiliations, contact details and supporting documents are excluded,
and suspected identifying text stays human-only. Provider terms, retention/training,
transfer safeguards, credentials, budget, model/rubric configuration and committee
evaluation remain independent activation gates. Human reviewers retain independent
scores and the scientific committee alone decides outcomes. The older DeepSeek
prototype is not adopted automatically. IDs: AI-01–06, PRV-02/03/07, CFG-03/09/10, REL-03.

## ORG-041 — Age, password, unverified retention and controlling language, 6 October 2026

Authority: explicit organizer decision and approved Privacy Policy v1.0 sections 7
and 9 and Terms sections 2 and 8. Minimum age is **18** to create an account or
participate. Passwords must have at least **10 characters**; the existing creation/
reset codepoint minimum and provider byte limit remain unchanged in this publication
task. An account is unusable until email verification. Accounts whose email is never
verified are deleted after **30 days**, superseding AUTH-08's historical seven-day
default; implement and verify that cleanup in a separate task before account
activation. Do not change retention code or migrations here.

The Terms are published in English and Arabic; if the versions differ, **the Arabic
version prevails**. The complete Arabic translation accompanies publication and a
native Arabic reader review is requested in the PR. Privacy v1.0 also fixes ordinary
account/registration/research deletion by 28 January 2028, minimal certificate
verification retention until 28 January 2029, Contact inbox deletion one year after
the conference, Resend sent-email retention of 30 days, spam-prevention codes up to
24 hours and published media until removed. These supersede ORG-023's related clock/
record-type TBDs as wording decisions; cleanup, exports, backups, restoration and
verified-request execution still need implementation evidence.

IDs: AUTH-01/06/08, PRV-02/04/05/06/08, CRT-05/06, LOC-01/03, CFG-09, AT-17.

## ORG-042 — Faculty of Medicine payment platform, 6 October 2026

Authority: explicit organizer decision and approved Privacy Policy v1.0 sections 2
and 6 and Terms section 4. The payment platform is the **Faculty of Medicine payment
platform (`lms.waqf.org.sa`)**. It processes payments and issues receipts; MSRC never
receives or stores card details. Approved refunds return through that platform to
the original payment method and are complete only when funds have been returned.
This resolves P1's responsible unit/platform choice, without inventing an API,
callback, credential, payee account, settlement or reconciliation contract.

Keep the mock adapter and financial workflows closed until the actual authorized
confirmation/reconciliation, prices, deadlines, refunds and release evidence are
supplied. No payment code, real charge or hosted configuration changes in this task.
IDs: PAY-01/04/05/07/08, REG-03, CFG-02/10, REL-02.

### ORG-037 Arabic editorial follow-up — 6 October 2026

Explicit organizer correction: use «مسابقة الأطروحة في ثلاث دقائق» throughout
Privacy/Terms Arabic, «ولائحته التنفيذية» instead of «واللائحة التنفيذية», and
«الباحث الرئيسي» (inflected «للباحث الرئيسي» in the existing Terms sentence).
Apply to both Arabic Markdown sources and rendered policy content. English wording,
version 1.0, effective date and operational gates remain unchanged. This is an
editorial correction within the approved version, not a new policy version.
IDs: BL-PUB-08, PRV-01/02, LOC-01/03, CMS-04.

## ORG-043 — Two distinct Super Admins, 7 October 2026

Authority: explicit organizer instruction for the closed staff portal foundation.
The two designated Super Admins are **Akram Awan** and **Abdulrahman Ismail**,
distinct people. Their verified email addresses are supplied privately at activation.
Record these names in this register only; do not put them in application code,
scripts, fixtures, seed data or credentials. This supersedes the historical
exactly-three requirement in S1 ROL-10 and the earlier third-admin TBD. Preserve
the source snapshot. Maintain at least two active Super Admins after the initial
bootstrap; the sole first account can enroll its authenticator and invite the
second, with other administration restricted until the second completes enrollment.
Nobody can remove their own Super Admin role or suspend themselves. Serialized
database checks must protect the minimum during concurrent role/status changes.
IDs: BL-AUTH-01/05/06, ROL-10/12, CFG-11, SEC-01/02.

## ORG-044 — Invite-only staff and mutual recovery, 7 October 2026

Authority: explicit organizer instruction. Staff access is invite-only; there is
no public staff sign-up. A Super Admin chooses edition-scoped roles and sends an
English transactional invitation through the existing Resend sender,
`MSRC 2027 <no-reply@msrc2027.com>`. A single-use invitation expires after 72 hours;
resending replaces the link and revocation invalidates outstanding use. After
setting a password the invitee must complete the current strongest second step:
session-bound email verification for regular staff, authenticator enrollment/TOTP
for Super Admins. Every transition is audited without passwords, codes or tokens.

A Super Admin's lost authenticator or account is reset by the **other** Super
Admin, never by themselves. This supersedes the prior separate approver/operator
TBD for this two-person procedure. Revoke access first, record the actor, target
and reason, then complete provider reset; failed or interrupted provider work must
remain denied and recoverable. Recovery does not bypass enrollment. Human identity
verification and provider/inbox UAT remain activation evidence, not completed work.
IDs: BL-AUTH-01/05/06, AUTH-04/05, EML-01, LOC-03, ADM-04/05, SEC-06.

7 October 2026 follow-up: recovery denial must persist in the database while
recovery is pending, failed or interrupted. Expiring the provider-operation window
must not restore access. If authenticator deletion succeeds but password reset
fails, fresh password login and authenticator enrollment remain denied until the
other Super Admin completes the authorized recovery. Verify this partial failure
with genuine synthetic native Auth, and verify mobile staff table actions. Keep
PR43 draft, all release flags closed, and hosted migrations/settings, live
bootstrap and real email unperformed.

## ORG-045 — Closed staff portal and identity masking, 7 October 2026

Authority: explicit organizer instruction. Build the staff portal foundation behind
server-only `STAFF_PORTAL_ENABLED`, closed by default, with independent database
readiness. Staff pages are unindexed, absent from public navigation and separate
from participant sign-in. Current persisted grants and strongest authentication
tier govern all server/database actions; menus only describe those permissions.
Non-review organizer screens are bilingual with RTL; reviewer/faculty-judge
assessment remains English-only.

The internal participant account list is limited to Super Admins and edition-scoped
registration/workshop administrators. Prepare the ORG-039 registration identifier
policy/component now: masked by default as `••••••1234`, full reveal only through
an explicit audited Super Admin action. This slice collects no identifier and
adds no registration identifier field. No bulk export. Future registration must
provide the protected storage/reveal implementation and satisfy its own release gate.

Only persisted authorization and Contact counters are applied to hosted state
according to the organizer's current instruction; #25 and #39 migrations remain
pending. This task writes reviewed migrations and a bootstrap/activation procedure,
uses synthetic records, and opens a draft PR. It does not apply hosted migrations,
modify production settings, bootstrap live accounts, send real invitations/email,
or activate registration, finance, review, check-in, content or exports.
IDs: BL-AUTH-01/05/06, BL-RPT-01/03, ROL-01/07/10/12, ADM-01/02/04/05,
PRV-03, LOC-01/03, SEC-01/02/06, REL-06.

## ORG-046 — Authorized restricted first-admin Production setup, 7 October 2026

Authority: explicit organizer instruction in the current chat. Complete the staff
setup without repeated manual execution approvals: verify actual Production
prerequisites; apply the six reviewed pending migrations sequentially with
verification after each; configure staff-only Production settings; bootstrap only
the organizer as the first Super Admin from privately supplied credentials;
enable restricted onboarding and verify password sign-in/authenticator TOTP.

This supersedes earlier no-hosted-execution/no-settings/no-bootstrap scope for
this specifically authorized setup. It authorizes no other account until the
organizer provides its actual identity inputs. Preserve the initial bootstrap
exception, minimum-two/self-protection and durable recovery safeguards. Keep
participant and every other operational workflow closed. Complete review/tests
for any code changes and record outcomes and rollback/reconciliation instructions.

Stop on failed checks, missing private inputs, unapproved costs or unresolved
policy decisions. Approval to execute is persistent; a technical prerequisite
failure is not a reason to request the same approval again or bypass its check.
Email demand is "as many as needed"; this does not authorize buying a plan,
unbounded spend or bypassing actual provider quotas. Configure a positive matching
staff cap within verified existing limits for the authorized scope.

The designated people remain in ORG-043 only. Email/password/operator/key inputs
stay in the organizer's private channel, never in this register or source.
First-admin TOTP does not create a second account or establish other-admin
recovery availability; pairing and wider staff acceptance await supplied inputs.
IDs: BL-AUTH-01/05/06, BL-RPT-01/03, ROL-10/12, AUTH-04/05, SEC-01/02/06,
INF-02/03, CFG-10/11, REL-06.

## ORG-047 — Requested authenticated account password change, 7 October 2026

Source: the organizer clarified, "i intended an account password change", after
successful own-device staff password/TOTP sign-in and after a private comparison
showed the newly saved password was not the hosted account password.

The new private value is the requested replacement password. Editing the private
input file does not change the account. Prepare an authenticated owner password
change that retains the verified authenticator, audits the action and revokes
existing sessions. This request does not authorize a lost-access self-reset,
authenticator reset, bootstrap replay or another account. ORG-044's other-admin
recovery, self-protection and two-admin safeguards continue to apply.

Implementation uses a separate reviewed additive migration and default-off server
and database gates. Its short fresh-authentication and admission windows are
engineering safeguards for this operation, not changes to the existing 30-minute
idle / eight-hour absolute session policy. The additional migration and new
password-change flow are not part of the six completed setup receipts. Account
password change is NOT APPLIED until the reviewed flow is activated and the
owner completes it privately. IDs: BL-AUTH-01/05/06, AUTH-03/04/05, SEC-01/02/06.

## ORG-048 — Resume the reviewed owner password-change release, 8 October 2026

The organizer explicitly authorizes completing the release with the corrected
readiness check under the existing restricted setup authority. Do not replay
migrations or bootstrap. Use a new attempt, preserve the stopped first attempt,
verify the already-committed migration and current closed state, then enable only
the reviewed password-change gates and verify the owned serving deployment.

The owner privately confirms the currently working password and their retained
authenticator, chooses a fresh replacement, and verifies a new-password/TOTP
sign-in. Preserve the authenticator, audit the committed change and revoke old
sessions. Do not substitute another-admin lost-access recovery or infer a password
from a label, a database password or an unlabelled line. Private input fields must
be explicitly named; preserve literal password bytes without silent trimming,
quote removal or normalization. No password or TOTP value is requested in chat.

All invited staff use the same EN/AR sign-in. Current persisted database roles
select the applicable assurance, menu and server-enforced permissions: Super
Admins receive their authorized tools and other staff their assigned tools.
Preserve the two-admin/self-protection/recovery safeguards, the restricted
single-admin pairing state, and closed unrelated workflows. No additional account
or real email is authorized by this resumption. IDs: BL-AUTH-01/05/06,
BL-RPT-01/03, ROL-01/07/10/12, SEC-01/02/06, LOC-01/03.

## ORG-050 — Team page committee roster (14 October 2026)

The owner supplied the MSRC 2027 committee roster for the public Team page and chose
layout A (one row per committee lead with a members box). Structure: two conference
leaders (Head of Scientific: Abdulrahman Ismail Maqbool; Head of Organization: Fatima
Salem Alfrhah), the Scientific Committee (9 leads) and the Organizing Committee (10
leads, including the three cross-committee roles the owner placed under Organization).
Names, roles, one-line descriptions and LinkedIn links come from the organizer roster
sheet and team spreadsheet, which each person filled in themselves; photos come from the
shared team Drive folder, which each person uploaded. "(Joker)" is omitted from the
Scientific Officer title and "3TM" is corrected to 3MT. Arabic names, Arabic role
labels (gender-neutral "قيادة …" form) and Arabic renderings of descriptions are
drafts pending organizer review. Members per committee are pending and render as "to be
announced". Removal or correction requests use the "Privacy & data requests" contact
topic. ORG-049 was reserved by closed PR #53 and is not reused. IDs: CNT-01, PRV-01.

## ORG-051 — Registration and organizing-team priority, recorded 16 October 2026

Authority: the owner's current registration slice instruction records organizer
decisions confirmed by the owner on **5 October 2026**, and the separate
organizing-team priority decision on **15 October 2026**. This entry reconciles
the registration backlog; it authorizes closed implementation, not activation.

- General conference capacity is **2,000 seats**, held as private per-edition
  configuration rather than a public constant. General registration has a waiting
  list, an early-access window before general opening, an opening countdown, and
  a later confirm-your-seat step. Wallet passes are later work.
- One registration request per verified participant account per edition. Use
  **“Reserve your seat”** as the public call to action. Requests begin pending
  internal approval; support bulk approval internally. Never describe approval or
  discounts in public registration copy. Submission does not confirm a seat.
- Members of the MSRC organizing team and volunteers receive priority access:
  early registration and first pick of workshop seats. Store an internal,
  per-edition account designation, not a self-declared public profile field.
  Qualification, verification evidence and the responsible roster process remain
  open questions. The existing homepage benefits publication is the public copy
  authority; this slice adds no new volunteer publicity.
- Every capacity, threshold, duration and opening/closing instant is a setting.
  Do not seed production values or infer opening authorization from the confirmed
  capacity. National ID/Iqama or international passport follows ORG-039; minimum
  age and controlling Arabic Terms follow ORG-041. QR ticket requirements remain
  CHK-01/02 and published Terms v1.0 §3. Cancellation/financial conditions remain
  the published Terms §§4–5 and the REG requirements, including item 6's expiry
  of approved unpaid requests. Consequential bulk actions follow ADM-02/04.
- **PENDING CONFIRMATION:** 50 workshop seats — per workshop or total — remains
  unresolved under DR-CFG-07. No default workshop capacity is approved by this
  entry. This current instruction governs any older plan claiming a settled
  interpretation; preserve that plan as dated reference.
- **PROPOSED, NOT APPROVED:** 72-hour early access; KAU students, past attendees
  and club members as early-access groups; confirm-seat email seven days before
  the conference with 72 hours to respond; a 24-hour waitlist offer; and showing
  places remaining below 400. These may appear only as labelled synthetic test
  values, never migration seeds, production defaults or public commitments.
- **NOT DECIDED:** free versus paid, prices, opening dates/times, early-access
  proof method, number of workshops, and refunds beyond published Terms. The
  earlier paid-product description does not resolve the current registration
  pricing decision. ORG-042's selected platform remains relevant if paid.

DR-CFG-01 and DR-CFG-07 retain their unresolved questions and release gates.
Design, slices and activation evidence: [REGISTRATION](features/REGISTRATION.md).
IDs: REG-01–08, CHK-01/02, ADM-01–05, TIM-01/02, WKS-01/03/04/06, CFG-01/07,
PRV-03/05/06, LOC-01/03, REL-02/06; BL-REG-01/06–11 and BL-ABS-09.

## ENG-043 — Closed registration authority, identity protection and priority, 16 October 2026

Authority: the current registration slice instruction and ORG-051. This additive
foundation replaces hard closure only for registration, behind server-only
`REGISTRATION_ENABLED === "true"`, independent private database registration
policy, participant-account readiness, complete required per-edition settings,
current verified participant session and age declaration, and database-time window
checks. Public environment variables and browser clocks confer no authority.
All other workflow gates remain hard-closed. Migrations seed no settings.

Deadlines for offers, holds, payment windows and confirm-seat responses are expiry
timestamps enforced by the database at read/claim time. Schedulers only sweep;
late scheduler execution never extends eligibility. Seat claim and seat confirm
will each be one Postgres RPC per request; Vercel functions are in `bom1` and the
database is in `ap-northeast-1` (ORG-008), so correctness must not depend on a
multi-round-trip application transaction. Neither allocation nor confirmation is
built in slice 1. Email must use a transactional durable outbox in slice 2; no
registration request sends email inline.

Choose application-level **AES-256-GCM** so database snapshots contain ciphertext
without the decryption key. Each record stores a random 12-byte IV, 16-byte
authentication tag, ciphertext, key version and masked display value; bind edition,
actor, document type and key version as authenticated additional data. A separate
HMAC-SHA-256 secret derives the edition/document-type-scoped duplicate digest from
the normalized number. Encryption keys and the duplicate secret must be distinct.
Cipher-key rotation retains old decrypt keys and keeps the HMAC secret stable, so
existing records remain readable and duplicate detection survives rotation.

Server-only configuration names (never values):
`REGISTRATION_IDENTITY_ENCRYPTION_KEYS` (version-to-64-hex-character key map),
`REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION`, and
`REGISTRATION_IDENTITY_HMAC_SECRET` (separate 64-hex-character secret). The owner
generates each secret independently from 32 CSPRNG bytes and records only version
labels in evidence. Vercel Production custody must use Sensitive environment
variables, with an independently encrypted offline copy. The intended named
two-person custody handoff is **Akram Awan** and **Abdulrahman Ismail**, the distinct
people in ORG-043; the owner must confirm their key-custody responsibilities and
record both acceptances before activation. Their Super Admin designation alone
does not prove key possession, offline recovery or a completed restore drill.
Keep their names in this register only. No key is added to Vercel by this task.

New private registration tables use forced RLS, no client table grants, indexed
foreign keys, and guarded SECURITY DEFINER RPCs with `search_path=''`. Participant
RPCs require the server's verified native-session context and recheck database
authority; privileged operations reuse `msrc_staff.authorize`. Only **Super Admin**
can set/remove the per-edition organizing-team/volunteer designation, with a reason,
actor/timestamps and immutable audit evidence. The flag is server-queryable for
later workshop priority; it grants no admission, seat or workshop booking here.
During the configured priority window only designated accounts may request;
during general opening every otherwise eligible participant may request.

Ordinary staff projections expose only the masked identity value. Wire the existing
`identity_reveal` boundary to the stored encrypted document: current Super Admin
assurance, a nonblank reason and a durable audit are required before ciphertext is
returned to the server for decryption. Never return identity plaintext through
participant/ordinary staff RPCs, ordinary logs, analytics, email or audit details.
Legacy reasonless reveal cannot return a number. Delete registration identifiers
by **28 January 2028** under ORG-039/041; purge jobs, controlled exports/backups and
restore suppression are later work and remain release gates.

The new migration follows `20261013205046` lexically but depends on the age-proof
migration `20261008160137` rather than the cleanup-scheduler migration. It remains
**pending — owner applies with the hosted change routine; requires
20261008160137 first**. No hosted SQL, environment setting, scheduler, email or live
workflow is changed. Rotation, key recovery and restoration procedures are in
[REGISTRATION](features/REGISTRATION.md); observed checks belong in the O9 progress
note, not inferred from this decision.

## ENG-046 — Closed durable email outbox and job boundary, 16 October 2026

Authority: the current registration slice 2 implementation task, BL-FND-04/05.
This records engineering design for review, not approval of live recipients,
delivery, hosted configuration, paid resources or O10's scheduling choice. No
ORG-052 decision is inferred. EML-01 through EML-05, API-01/02/03, ERR-01/02,
DAT-03/04, LOC-03 and BL-DEP-08 remain the requirement boundary.

Use additive review-only migration `20261016140000_email_outbox.sql`, after the
reserved registration migrations but depending only on main, for a private
`msrc_outbox` schema, forced RLS, no client grants and service-role-only public
RPCs with empty search paths. Opaque event keys and canonical inputs are hashed
into minimal retained deduplication identities. Future reviewed postgres-owned
registration RPCs enqueue inside their own business/audit transaction; a
separate post-commit HTTP enqueue does not satisfy atomicity. This slice wires
no domain producer and accepts only `synthetic_notice` v1 with a bounded
reference variable and `@example.invalid` recipients. Transactional templates
remain English-only; locale is reserved under AGENTS.md/EML-01. No public UI,
Contact delivery-path change or authentication email activation is included.

Claim small batches with `FOR UPDATE SKIP LOCKED`, expiring leases and
owner/token-fenced prepare/finish. Persist immutable provider requests before
sending and retain one provider idempotency key across uncertain retries. Keep
bounded allowlisted error classes, exponential backoff with positive jitter,
max attempts and atomic nonrefundable UTC-day attempt reservations. Existing
Contact 60/day and staff 36/day caps remain separate; no shared provider ledger
exists. Participant volume needs separately approved paid capacity/allocation.

Verified official [Resend idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys)
on this date: identical requests deduplicate for 24 hours; changed payloads
conflict and simultaneous same-key requests may be retried. The design stops
automatic retries after 23 hours from the first claim/charged attempt. An
uncertain result outside that horizon requires reconciliation before a new
business notification; there is no unbounded exactly-once delivery promise.
Provider acceptance is not inbox delivery. Terminal-row purging retains minimal
hash identities so an old event cannot be freshly enqueued after payload purge.

Closed engineering proposals, needing owner approval before activation:
delivery/sweeps off; daily cap zero; five attempts; 120-second lease;
60-second base backoff with up-to-25-percent jitter capped at 3,600 seconds;
23-hour retry horizon; at most ten messages and 20 seconds per drain;
100-row state sweeps every five minutes; 30-day terminal-message retention,
aligned as a proposal with approved Privacy Policy Resend retention; indefinite
minimal hash-tombstone retention. Native postgres owns the pg_cron state job
and aggregate health function. The maintenance switch is checked before any
sweep mutation; no client/operator dashboard access is opened.

POST `/api/jobs/outbox/drain` requires the closed flag and constant-time Bearer
secret validation and returns counts only. O10 is unresolved: do not add a
Vercel `crons` entry, environment values, hosted scheduler activation or `pg_net`
in this slice. The recommended future Vercel per-minute cron needs Pro or
Enterprise and a same-auth protected **GET bridge**, because Vercel invokes
production cron paths by GET while this slice exposes POST only. Store
`CRON_SECRET` as Production-only Sensitive/Secret when separately authorized.
The alternative pg_cron-to-HTTP option requires separately reviewed `pg_net`
and secret custody and is not recommended. Exact owner steps, pause/monitor/
replay safeguards and remaining BL-DEP-08 gates are in
[EMAIL_OUTBOX](features/EMAIL_OUTBOX.md); check receipts are in the
[per-task progress note](progress/2026-10-16-codex-email-outbox.md).

## ORG-052 — Attendee-only homepage benefits and a one-screen mobile menu, 16 October 2026

Authority: explicit owner instruction, 16 October 2026. The homepage benefits section
speaks to attendees only. The "For the organizing team" group published on 15 October
(organizing experience, a certificate from the Dean, networking, priority access) is
withdrawn from public copy. The section is one list of six attendee benefits: CME hours
(illustrative figure unchanged), hands-on workshops, networking with experts, research
exposure, awards and cash prizes, and certificates. Its action now reads "How to take
part" and links to the participation page instead of the Team page. No new facts are
introduced: workshops, certificates, prizes and abstracts were already published.

Organizing-team/volunteer priority (ORG-051) remains an internal, closed registration
setting with no public promise; its eligibility and proof remain organizer questions.

The phone menu must show every destination, including Contact, in one panel without
scrolling. The owner asked to keep the existing format and make everything slightly
smaller: the same single-column list and two-column Participate sub-pages, with rows
36px (sub-pages 34px), type one step smaller and a slimmer registration action. This
supersedes ENG-041's 44px menu-row minimum for the phone menu only; targets stay above
the WCAG 2.2 AA 24px minimum. Rows enter with a short staggered rise; reduced motion and
keyboard opening remain instant.

## ORG-053 — Participation flow redesign, 16 October 2026

Authority: explicit owner-approved implementation task in the current chat.
Intent: **“Reserve your seat goes to the Participate hub”**, **“one shared layout
for all five option pages”**, and **“Public pages only; no workflow opens.”**

- Keep “Reserve your seat” / «احجز مقعدك» in the header, phone menu, homepage hero
  and closing action, pointing to the localized `/participate` hub.
- Give the hub the owner-supplied MSRC 2026 opening-session photograph and five
  horizontal whole-row links in EN/AR, including mobile, with replaceable icon slots.
- Use benefits, three or four simple steps, a compact unavailable program download
  near the header, and the next-move links. Preserve removed bilingual rules in a
  non-rendered future-form guidance export, with requirement IDs.
- Attend uses “Sign up for MSRC” / «سجّل في MSRC» after benefits and steps, leading
  to the existing closed `/sign-up` page. Certificate eligibility still requires
  both day check-ins and the general survey. CME wording matches the homepage;
  no accredited number is confirmed.
- Label the abstract path “Abstract submission” / «تقديم الملخصات» throughout its
  navigation, category, breadcrumb, title and closed state. Keep “Submit your
  abstract” at the top. Public benefits may mention scientific feedback, awards
  and cash prizes with categories/details to be announced. No presenter
  publication, CME or certificate entitlement is authorized.
- Workshops introduce practical learning, the separate booking and certificate
  requirements, and non-overlapping attendance above the slider. “Explore
  workshops” targets the existing slider. Hackathon and 3MT use only existing
  published facts; unresolved terms remain unresolved.

This supersedes ORG-051's direct public CTA destination only, not its registration
authority or privacy gates. ORG-037–042, ORG-049's reserved historical reference,
ORG-050's media boundaries and ORG-052's attendee-only/phone-menu decisions remain
in force. No backend, database, environment, hosted setting, live workflow,
communication, branch, commit, push or PR is authorized. Claude owns review,
rechecks, commit and PR. IDs: SCP-02, DSN-01/02, ACC-01, LOC-01/03, MED-01/04,
REG-01/07/08, ABS-01/04/07/08/09/15, WKS-01/02/06, HAC-01/02/04/08/09,
TMT-01/02, CRT-01–04, CMS-04, REL-01.

## ENG-048 — Shared public participation presentation, 16 October 2026

ORG-053 uses the incumbent shared JourneyExperience, a dedicated CSS file and typed
bilingual presentation content. The full preceding journey copy is retained verbatim
in `participation-form-guidance.ts`, never imported by public rendering. Icon paths
are nullable content fields with neutral geometric fallbacks. The existing unavailable
program-brochure control is shared near all five headers; no download file is invented.

Main and open PR #95's DECISIONS diff were checked: ENG-047 belongs to that visitor-QA
task; ORG-053 and ENG-048 were free. Keep header changes to labels and destinations,
leave `conference-experiences.css`, `playwright.config.ts` and `docs/PROGRESS.md`
untouched, and record evidence in the O9 task note.

Existing ENG-045 explicitly keeps `/registration` dynamic for its request nonce CSP
and closed operational foundation. Preserve it rather than weakening that boundary
to meet a conflicting blanket static-page acceptance line. Hub, submissions,
workshops, hackathon and 3MT must retain their SSG entries. This task adds no dynamic
route or account opening. Audit, copy, icon replacement and verification:
[participation feature note](features/participation-flow.md); exact receipts:
[O9 progress note](progress/2026-10-16-claude-participation-flow.md).

## ORG-054 — Mobile polish of the homepage, Program and option pages, 17 October 2026

Authority: explicit owner instructions, 17 October 2026 (phone review of the live site).

- Program: the venue line leaves the Program header; the day filter reads "Day 1",
  "Day 2" and "Both days" (dates already appear in the header).
- The date / "MSRC / 2027" / venue block appears only on the Participate hub and Attend.
  Abstract submission, Workshops, Hackathon and 3MT headers no longer repeat it.
- Header photos keep their subject when phones crop them (per-page focus points; the
  Hackathon header centres on the group discussing). Workshops uses its own MSRC 2026
  workshop photograph (`learn-doing-manar-2529.jpg`) instead of the abstract image.
- Option pages gain soft animated brand linework behind benefits and steps
  (reduced motion: static).
- Abstract submission "Good to know" becomes clear bullet points: completed or
  ongoing work; the per-principal-investigator limit explained in plain words; English
  and no patient-identifying details; abstracts do not register attendance. The
  300-word limit stays in the form guidance only.
- Hackathon shows its two tracks distinctly ("Choose your track", pick one) and the
  two-day format: Day 1 mentoring, Day 2 pitching and judging; preparation and the
  compulsory orientation come before the conference. No new rules are introduced.
- Homepage: shorter benefit copy and larger titles, compact history numbers, gallery
  arrows that move exactly one item, the benefits section mirrored for variety, a
  seamless transition into "Meet the speakers", and subtle light linework on the
  dark history section.
- Phones hide the pause control on the opening and closing films; both films keep
  playing and desktop keeps the controls. This is an owner-accepted exception to
  WCAG 2.2.2 on phones; reduced-motion users get the static poster.

## ENG-049 — Closed staff registration queue and allocation, 17 October 2026

Authority: the current ORG-055 backend task; the planner records the organizer
decision separately. REG-01–08, ADM-01/02/04/05, ROL-07/10/12, PRV-03/05/06,
SEC-01/02/06, LOC-01/03 and ENG-043/044/046 remain applicable. Verified remote
`main` and this worktree both at `3ac79d91` before reserving this number. This
authorizes closed source implementation only, with no commit, branch, push,
hosted migration, settings change, participant opening or real email.

Migration `20261017120000_staff_registration_queue.sql` adds staff queue reads,
manual bulk approval/waitlisting, Super Admin priority search and scoped dashboard
counts. Registration/workshop administrators and Super Admins may read and decide
requests; only Super Admins may list/set/remove organizing-team priority. Reuse
current native identity, exact-session regular-staff email assurance and Super
Admin TOTP, both server-side and through `msrc_staff.authorize` in PostgreSQL.
Identity numbers remain masked; the existing audited Super Admin reveal is
unchanged. Staff reads do not depend on the participant registration switch.

Serialize approval on the edition settings row with `FOR UPDATE`, then count
seat holders and process selected eligible requests in `created_at,id` order.
The seat-holding states are `approved`, `approved_awaiting_payment`, `offered`,
and `confirmed`: an extant offer reserves a provisional seat conservatively, so
another request cannot reuse it. This slice creates no offers. Passing a payment
or offer deadline does not automatically release that seat; future explicit
expiry/release transitions must take the same settings lock. Allocation refuses
isolation other than READ COMMITTED, so a transaction cannot retain an older
snapshot across the settings-lock wait. Recheck staff authority after that wait.

Null capacity returns `capacity_not_set`; missing free/paid selection or missing
paid duration returns `payment_configuration_required`. These become HTTP 409
`capacity-not-set` / `payment-configuration-required` states in the staff API.
An explicitly free configuration produces `approved`; paid produces
`approved_awaiting_payment` with a database-time `payment_due_at` using the existing
`payment_window_hours`. This is a private approval state, not payment completion,
admission confirmation, a ticket, or a public payment integration.

Approve only `pending_approval`/`waitlisted`; waitlist only `pending_approval`.
Unknown/other-edition IDs, already-decided states and capacity overflow are skipped;
overflow is not automatically waitlisted. Repeat decisions preserve timestamps and
audit. Each transition writes immutable performer/request/from/to evidence with
`request.approved` or `request.waitlisted`, included in the private audit area with
EN/AR labels. `counts.approved` means all four seat-holding states, and `remaining`
is clamped at zero (null when capacity is unset). Aggregate totals are unfiltered;
the newest-first list is filtered and capped at 50.

No outbox producer is added. ENG-046 currently accepts synthetic recipients and
a synthetic template only; attaching it to real approval decisions would be
misleading. Slice 4 must add reviewed English notification templates and atomic
transactional enqueue, preserving the independent closed delivery switches.
Timed offers remain later work pending approved offer duration and release
behavior. The engineering receipt is the O9 per-task progress note, not PROGRESS.md.

## ORG-055 — Staff console: role tabs, dashboard, registration queue and organizing-team priority, 17 October 2026

Authority: explicit owner instruction, 17 October 2026.

- Every staff role has its own tab for its job. A Super Admin sees every tab. For the
  blind-scoring areas (Review and Faculty judging) a Super Admin without the scoring
  role gets read-only oversight only; scoring and decisions stay with assigned
  reviewers and judges. Navigation is a projection only; every API and RPC rechecks.
- Areas without built tools open a landing page that says what the tool will do and
  what it is waiting for, instead of being hidden.
- The console gains a sidebar layout (a swipeable tab row on phones) and a dashboard
  home with role-scoped aggregate counts.
- Registration queue (registration slice 3, staff side): registration
  administrators and Super Admins can filter, search, approve one or many requests and
  move requests to the waitlist. Seat allocation is transactional against the
  configured capacity (2,000 once entered); approvals are refused while capacity is not
  set. Timed waitlist offers and notification emails remain later slices. Registration
  stays closed to participants.
- Organizing-team priority (ORG-051) gains its Super Admin screen: search, mark with a
  reason, remove with a reason, full audit history.

## ENG-050 — Closed staff registration detail, offers and masked export, 19 October 2026

Authority: the current registration slice 3, part b backend task, based on
`c99a08f` in `codex/registration-slice3b`. REG-01–08, ADM-01/02/04/05,
ROL-07/10/12, PRV-03/05/06, SEC-01/02/06, TIM-01/02 and LOC-01/03 apply.
This extends ENG-043/044/046/049 for closed source implementation only. The
planner owns the console UI and integration; no participant opening, hosted
migration, settings change, real email, commit, branch or push is authorized.

Add one review-only migration,
`20261019120000_staff_registration_offers_export.sql`, after the staff queue
migration. Registration/workshop administrators and Super Admins may read a
masked request with its immutable transition history, newest first, and offer
seats to selected waitlisted requests. Reuse current native sessions, exact-session
regular-staff email assurance and Super Admin TOTP, checked in the handler and
through `msrc_staff.authorize`. The existing audited identity reveal is unchanged.

The organizers have **not approved an offer duration or release behavior**.
`offer_window_hours` is nullable with no default or seeded value. A null window
refuses the offer with `offer_window_not_set` (HTTP 409 `offer-window-not-set`).
An offer uses database time, holds capacity, and processes eligible selected
requests in `created_at,id` order. Use the same edition settings `FOR UPDATE`
lock as approval, require READ COMMITTED, and recheck authority after waiting.
Do not infer a payment configuration, admission confirmation or ticket from an
offer. Existing seat holders remain `approved`, `approved_awaiting_payment`,
`offered` and `confirmed`.

Expiry is an explicit, idempotent, audited `offered` → `expired` transition for
elapsed nonnull offer deadlines, under the same settings lock. Invoke it before
staff queue reads and summary counts so lapsed offers release their seats before
the projection. **Do not automatically offer the released seat to the next
person**: staff decide. This conservative engineering behavior is pending
organizer confirmation before activation; it does not settle the open release
policy. No cron or job is added. An older offer without an expiry retains its
seat rather than receiving an invented deadline. Elapsed payment deadlines are
unchanged. Audit events are `request.offered` and `request.offer_expired`.

Super Admins with valid TOTP may export all edition requests, with names, emails,
statuses, priority, created/decided timestamps and **masked identity only**.
Each export records `registration.exported` and its row count. No decryption or
identifier key access belongs in export. The private GET download is CSV with a
UTF-8 BOM, attachment disposition, no-store caching and spreadsheet-formula
neutralization. Registration administrators and all other staff are denied.

Contracts extend additively with detail, offers, expiry timestamps and offered/
expired counts. `approved` continues to count all seat holders; `offered` is a
subset, not additional occupied capacity. Missing hosted read RPCs yield
`area-not-ready` rather than breaking the staff session. Participant offer
acceptance/confirm-your-seat belongs to **slice 5**; transactional email templates
and atomic outbox enqueue belong to **slice 4**. Neither is implemented here.
Observed checks and integration notes belong in the
[O9 receipt](progress/2026-10-19-codex-registration-slice3b.md).

Planner review amendment (19 October 2026): an offer expiry is recorded with a
NULL `performer_id`, because it is automatic and not a decision by whichever
staff member's read triggered it. The console shows such history rows as
"Automatic". The Super Admin export is fetched by the console first, so a
refused export (403/503 JSON) shows a message and never saves an error file.

## ORG-056 — Free registration, opening times, early-access email list and seat offers, 20 October 2026

Organizer decisions given by the owner (Akram Awan) in the planning session on 20 October 2026:

- General attendance is **free** (`payment_required=false`). No payment step is built for registration.
- **Early access opens Sun 15 Nov 2026 at 20:00 Riyadh time; general registration opens Wed 18 Nov 2026 at 20:00
  Riyadh time.** These are owner-entered settings (the priority window and `general_opening_at`), not code defaults.
- Early-access eligibility is an **email list that a Super Admin types in manually**. It supersedes the earlier proposal
  of single-use access codes. Early access only allows submitting a registration request during the early window.
- **Workshop seats are separate from registration and are likely to be paid.** That is not decided yet, so nothing
  about workshop prices or first pick is built.
- A **seat offer stays open for 24 hours** (`offer_window_hours=24`, owner-entered).
- When an offer expires, **the seat passes automatically to the next waitlisted person**. This supersedes ENG-050's
  "staff decide" default; ENG-051 implements it.
- Registration approvers: the owner will invite them and grant the Registration and workshops administrator role.

Still open: approver names (to be given privately); the opening-night support rota.

## ENG-051 — Closed early-access email list and automatic offer hand-on, 20 October 2026

Authority: the current backend task and organizer decisions ORG-056, recorded by
the planner. REG-01–08, ADM-01/02/04/05, ROL-07/10/12, PRV-03/05/06,
SEC-01/02/06 and TIM-01/02 apply. This reserves ENG-051 for the additive migration
`20261020120000_early_access_list_autopass.sql` and its backend contracts/tests,
from `origin/main` `0dbfab6` in `codex/early-access-autopass`.

Only Super Admins with existing exact-session TOTP assurance may list, add or
remove normalized early-access email entries. Entries can precede participant
accounts. The private, forced-RLS list has no client table grants; immutable
registration audit identifies the entry without copying its email. Only a
current verified Auth email match grants early-window request eligibility,
alongside the existing organizing-team priority. Submission rechecks eligibility
on the server/database. Early access grants no workshop priority or admission.

Amendment to ENG-050: ORG-056 supersedes its provisional **staff decide** expiry
default. Expiring elapsed offers automatically hands each released seat to the
next waitlisted request in `created_at,id` order, under the existing edition
settings lock and seat-holder capacity rules. Automatic offers have a NULL
performer and database-time deadlines. A null offer window prevents automatic
replacement offers; recorded elapsed offers still expire. No expiry means no
automatic offer; manual offers do not automatically fill unrelated vacant seats.
The existing staff-triggered expiry RPC returns
`{expired, offered}` counts; no scheduler is added.

ORG-056's free attendance, early/general opening instants and 24-hour offer
duration are owner-entered settings, not migration seeds or code defaults. No
hosted migration/settings, workflow opening, email, commit, branch or push is
performed. The planner owns the console UI and ORG-056. Checks and UI handoff are
recorded in [the backend receipt](progress/2026-10-20-codex-early-access-autopass.md);
`docs/PROGRESS.md` remains outside this task's edit scope.

## ENG-052 — Closed early-access console integration, 20 October 2026

Authority: the owner's Task 1b follow-up to ENG-051 and ORG-055/056. Checked the
current register before reserving this number: ENG-051 was the highest used.
REG-01–08, ADM-01/02/04/05, ROL-07/10/12, PRV-03/05/06, SEC-01/02/06,
LOC-01/03 and ACC-01 apply. The owner authorizes backend and UI integration,
including EN/AR action-summary copy, and leaves commits to Claude.

Wire the existing early-access route and panel into the staff console using its
Super Admin-only menu projection and independently enforced handler/RPC gates.
Retain the existing `emails` / `entryIds` request fields and `invalid` response;
normalize pasted addresses, preserve rejected entries for correction, and report
the server's actual `added` / `removed` counts. Refresh the current search after
mutations. Missing RPCs show `area-not-ready` while retaining the signed-in shell.
No new migration, hosted settings, seeds, workflow activation or email is needed.

The integration, browser/axe and full local-check receipt is
[Task 1b](progress/2026-10-20-codex-early-access-integration.md).
`docs/PROGRESS.md` stays unchanged under the owner's O9 rule. Database execution
and activation remain separate gates; source integration is not production proof.

## ENG-053 — Closed Super Admin registration settings, 20 October 2026

Authority: the owner's overnight Task 2, ORG-055/056. Checked the current
register before reserving this number: ENG-052 was the highest used. REG-01–08,
ADM-01/04/05, ROL-10/12, SEC-01/02/06, TIM-01/02, CFG-01, LOC-01/03 and
ACC-01 apply. This authorizes local source implementation only; no hosted
migration, settings seed, feature switch, real email, branch, commit or push.

Add a Super Admin-only Registration settings area with independent handler and
database exact-session TOTP checks. Every save validates the merged settings
against the existing table constraints and `settings_complete()` requirements,
serializes with allocation on the edition settings row, and refuses capacity
below current seat holders. Saving cannot set `enabled=true`; opening remains
a separate owner release step. A private immutable audit records each save's
operation ID, performer and changed fields with before/after values; reads show
the latest 20 entries. Missing RPCs keep the console signed in with
`area-not-ready`.

The UI enters and displays all instants in Asia/Riyadh. ORG-056's early-access
window maps to both `priority_start_at`/`priority_end_at` and the legacy
`early_access_start_at`/`early_access_end_at`, because `settings_complete()`
still requires both pairs and there is one approved early window. No dates,
capacity or offer duration are seeded or prefilled. Free attendance is selected
only in an unsaved new form. Minimum age is fixed at 18 on save.

`waitlist_offer_hours`, `confirm_seat_lead_days` and
`confirm_seat_response_hours` remain required by the unchanged completeness
function; the UI identifies confirm-your-seat as a later step. The optional
`offer_window_hours` remains nullable under the existing rules; offers remain
blocked until configured. Paid settings require `payment_window_hours` under
the existing completeness rule, so it is shown conditionally without a default.
This does not build a payment flow or change ORG-056's free-attendance decision.

Evidence and owner review notes belong in the
[Task 2 receipt](progress/2026-10-20-codex-registration-settings.md).
`docs/PROGRESS.md` remains untouched.

## ENG-054 — Closed registration tickets, atomic email events and O10 bridge, 20 October 2026

Authority: the owner's overnight Task 3 and ORG-055/056. ENG-053 was the highest
number when this entry was reserved. REG-01–08, CHK-01 (credential only),
EML-01–05, SCP-03, ROL-02/07/10/12, DAT-03/04, API-01–03, SEC-01/02/06,
PRV-03/05/06, LOC-01/03, ACC-01 and REL-02/06 apply. The explicit Task 3 rule
and ORG-056 supersede v0.5 REG-03/07 and AT-03's paid/confirmed-only sequence:
free `approved` registration receives its ticket immediately; `confirmed` also
qualifies. Paid `approved_awaiting_payment` does not. No payment flow is added.

Review-only migration `20261020140000_registration_tickets_emails.sql` issues a
single private ticket per request (therefore per participant/edition) inside
the approval transaction, including bulk decisions. A request-state trigger
also covers future confirmation and revokes on cancellation/expiry. Existing
tickets remain identical on repeat approval/confirmation; revoked credentials
remain revoked. No existing request is backfilled by this migration. Existing
records needing reconciliation require a separate reviewed operation.

Ticket IDs are independent random UUIDs. The secret is HMAC-SHA-256 of the ticket
ID with the independent server-only `REGISTRATION_TICKET_SECRET`; only its hash
is stored. The key passes transiently through a service-only approval RPC and
is cleared/restored from the transaction setting on success and failure. It is
never persisted in a table, audit or outbox payload. The service boundary binds
server-verified native staff claims, then reuses database exact-session staff
authorization and the edition allocation lock. Stale approval callers fail
closed. Neither an authenticated browser nor a staff projection receives the key.

The server-only own-ticket RPC rechecks participant account/session authority,
edition and policy. It reconstructs a token only if its hash matches the issued
credential, and returns no token for revocation. The server uses the installed
`qrcode` package to produce a data URL for the private EN/AR ticket page. QR
content contains only version, opaque ticket ID and secret: no participant,
identity, email or financial fields. Missing RPCs show `area-not-ready` and keep
valid sessions. The key must remain available for existing credentials; key
rotation/reissue is deferred and must not be an unreviewed environment overwrite.
Check-in verification/scanning is deliberately unimplemented, not a validity claim.

Same-transaction triggers enqueue received, approved, offered, waitlisted and
offer-expired messages, including automatic hand-on. Stable event identities
deduplicate retries; rollback removes the business event, ticket and outbox job.
All five registration templates are **DRAFT for owner wording approval**:
`registration_received`, `registration_approved`, `registration_offered`,
`registration_waitlisted`, `registration_expired`, version 1. Full plain text
and HTML behavior are in [REGISTRATION_EMAILS.md](features/REGISTRATION_EMAILS.md).
English-only copy uses published conference facts and the existing support
contact. Email contains sign-in page links, never a QR credential or attachment.
Offer wording uses ORG-056's 24 hours and the stored `offer_expires_at` deadline;
offer acceptance remains Task 4 and is an email-activation prerequisite.

O10 adds GET to the existing drain route, with the same exact Bearer
`CRON_SECRET`, fixed-size timing-safe comparison and closed delivery switches.
HEAD is inert. Daily caps remain zero. The repository has no confirmed Vercel
plan; current official limits allow Hobby cron only daily, so the source uses
`0 0 * * *` UTC. This is not the live delivery target for seat offers. Before
activation, confirm Pro/Enterprise and review `*/5 * * * *` with an approved
delivery budget. See the [verified plan constraints](https://vercel.com/docs/cron-jobs/usage-and-pricing).

No hosted migration, settings seed, flag activation, real email, branch, commit
or push is authorized or performed. The O9
[Task 3 receipt](progress/2026-10-20-codex-registration-slice4.md) records observed
checks and CI-only database gates. `docs/PROGRESS.md` is unchanged.

## ENG-055 — Closed participant My registration and seat actions, 20 October 2026

Authority: the owner's overnight Task 4, ORG-055/056. ENG-054 was the highest
number when reserved. REG-01–08, DAT-03/04, EML-01–05, SEC-01/02/06,
PRV-03/05/06, TIM-01/02, LOC-01/03 and ACC-01 apply. This is local source
implementation only; all hosted migrations, settings, delivery and activation
remain outside this task. The owner leaves commits to Claude.

The participant registration screen uses a server-rendered, own-account status
projection and server-only seat actions. Signed session/origin-bound action
tokens, existing participant rate limits and actor-scoped operation IDs protect
mutations. Ownership, session, independent account/registration gates and the
database clock are rechecked under the edition settings lock. Free offer
acceptance issues the existing ticket and approval email atomically. Decline
and self-cancellation revoke any ticket and hand only the released seat to the
next waitlisted request in the same order as expiry. All actions are audited.

REG-05 requires capacity status; it does not authorize an exact public
registration count (WKS-01's separate workshop counts do not extend to general
attendance). Expose only a threshold-derived `fewPlacesLeft` boolean, and no
waitlist position or other participant's data. Opening instants and offer
deadlines come from settings and are displayed in Asia/Riyadh; none are seeded.
The countdown is informational and cannot approve or expire a registration.

Cancellation adds the English-only `registration_cancelled` version 1 DRAFT
template for owner wording approval. Missing RPCs show `area-not-ready` while
preserving valid sessions. Public closed-state presentation is preserved when
the registration runtime gate is off. Observed checks, database CI gates and
owner review points belong in the [Task 4 receipt](progress/2026-10-20-codex-my-registration.md).
`docs/PROGRESS.md` stays unchanged under O9.

## ENG-056 — Staging, load preparation and opening-night monitoring, 20 October 2026

Authority: the owner's overnight Tasks 5 and 6; ORG-055/056. ENG-055 was
the highest used when reserved. INF-04–06, NFR-01–03, REG-01–08,
EML-01–05, SEC-01/02/06, TIM-01/02 and REL-02/06 apply. Scripts,
runbooks and narrowly scoped health instrumentation only; no hosted resources,
migrations, seeds, settings, flags, email, branches, commits or pushes.

Prepare an explicitly allowlisted synthetic staging seed and a guarded load
runner. The 2,000-seat / 500 submissions in ten minutes scenario is a planning
assumption requiring owner confirmation, not a seeded production capacity.
ORG-056 free attendance and 24-hour offers are preserved; staging instants
remain explicit owner inputs. Delivery and workflow settings remain closed.

Public health reports only bounded database reachability. A separate secret
protects outbox aggregate monitoring; monitoring neither drains nor advances
registration state. Missing health RPCs fail safely until reviewed migrations
are applied. No frontend contract or authorization gate is relaxed.

Reconciliation: current hosted staff/participant runtime resolvers reject
Preview and custom staging origins; their console/test mail paths are local
only. Therefore creating a staging project and seeding it does not make hosted
authenticated rehearsal available. A separately reviewed staging runtime/mail
sink slice is a prerequisite. Participant POST rate limits also constrain a
single load-generator egress. The runbooks expose these gates rather than
spoofing Production, forwarding headers or weakening authentication.

No literal O11 entry was found in the checked-out docs. Existing staging
authority is in OWNERSHIP_AND_SETUP, ARCHITECTURE and backlog/23-deployment;
the owner must reconcile the external overnight-plan O11 note. The fresh
synthetic-only staging migration replay in STAGING_SETUP is an explicit
Task 5 exception to older blanket hosted-replay prohibitions, never a
Production migration procedure. See [the O9 receipt](progress/2026-10-20-codex-staging-opening-night.md).

## ORG-057 — Registration email wording approved; second Super Admin added, 22 October 2026

Owner (Akram Awan) decisions in the planning session on 22 October 2026:

- The registration email drafts in `docs/features/REGISTRATION_EMAILS.md` (request received, you have a seat,
  seat offered, waitlisted, offer expired, cancellation) are **approved as worded**. Delivery remains off until the
  separate email activation steps (paid Resend plan, caps, switches) are completed.
- The owner has added the second Super Admin (Abdulrahman Ismail). Each Super Admin enrolls their own
  authenticator; recovery is tested between the two.
- The registration `terms_version` is `v1.0`, the currently published Terms and Privacy Policy version.
- Registration **closes Tue 26 Jan 2027 at 23:59 Riyadh time** (`closing_at`, owner-entered, not seeded); the
  conference is 27–28 January 2027.

## ENG-057 — Staff email previews, complete request history and initial runtime health, 22 October 2026

Authority: the owner's Night-2 task ACD and ORG-055/056/057. ENG-056 was the
highest number used when this entry was reserved. EML-01/03/04, REG-04,
ADM-02/04/05, ROL-10/12, SEC-01/02/06, LOC-01/03, ACC-01 and INF-04–06 apply.
This is local source implementation only; Claude owns the commit. No hosted
migration, settings seed, participant opening, feature activation or real email.

Super Admins may preview every registration template from the outbox registry
using the same server rendering functions and fixed synthetic data. The staff
chrome is bilingual; transactional content stays English. ORG-057 approves the
existing wording, while delivery remains off. Previewing needs no registration
or outbox database reads and retains the current staff authentication gates.

Review-only migration `20261022120000_staff_registration_complete_history.sql`
extends the staff request-detail history with participant and automatic
registration audit events, alongside staff decisions. A private ticket trigger
records issuance/revocation in the same transaction; existing ticket timestamps
provide the exact facts for an audit-only backfill. No ticket is issued by the
backfill. Each event identifies its actor category without exposing ticket
credentials or identity documents. Existing role/session checks remain in
force. Missing or pre-history-version RPCs yield `area-not-ready`.

Absent health database configuration returns HTTP 200 with runtime status `ok`
and database `not-configured`. Configured health checks with a missing RPC
return HTTP 503 and database `not-ready`; unreachable databases remain 503.
Runtime health alone does not establish database or workflow readiness.

Observed checks, contract details and remaining CI-only database gates belong
in [the Night-2 ACD receipt](progress/2026-10-22-codex-acd.md).
`docs/PROGRESS.md` remains unchanged under the owner's O9 instruction.

## ENG-058 — Closed online conference check-in and daily attendance, 22 October 2026

Authority: the owner's Night-2 task B, current ORG-055/056/057 and ENG-054's
ticket scheme. ENG-057 was the highest number when reserved. BL-CHK-02/03,
BL-ATT-01/03, CHK-01–05, CRT-01, ROL-08/10/12, SEC-01/02/06, DAT-03/04,
LOC-01/03 and ACC-01 apply. The v0.5 source contains CHK-01–05 and no ATT-
prefixed requirements; BL-ATT maps to those CHK requirements and CRT-01.
This is local, uncommitted source implementation on top of task ACD. Claude
owns committing. No hosted migrations, settings seeds, activation or email.

Review-only migration `20261022130000_checkin_attendance.sql` adds private
daily attendance, immutable outcome/correction audit and per-native-session
mutation limits. One row per ticket/day serializes competing scanners and
reports the original current check-in time and performer on repetition.
Super Admin undo requires a reason; audit snapshots preserve earlier facts
when the same daily row is later checked in again. Ticket scans compare the
presented secret hash with ENG-054's stored hash, never expose the master key,
and recheck current admission. Manual reference lookup is staff-authorized,
rate-limited and rejects ambiguous references. Summary reads return counts.

Only current edition-granted `checkInStaff` and Super Admin sessions can scan;
Super Admins alone can undo. Regular staff retain exact-session email checks,
and Super Admins retain exact-session TOTP. Entry-point labels are optional
provenance, not authorization assignments. Decision 19 (entry points, named
staff and tested outage/offline backup/reconciliation) remains OPEN. Online
scanning is this slice's boundary; assigned-entry restrictions and the chosen
backup procedure must be reconciled and rehearsed before live use. No offline
queue or synchronization is built or promised.

The owner must enter `conference_days` on Registration settings. The field
is nullable, unique and sorted, with a 31-day engineering input bound; it is
not a seeded schedule or a change to registration completeness. The published
conference dates remain 27–28 January 2027. Staff choose a configured day,
defaulting only to today's configured date in Asia/Riyadh. Own-registration
attendance shows each day separately. Both conference days AND the general
survey remain required for an ordinary full-conference certificate. No scan
grants a certificate, workshop completion or credit for a different day.

Browser QR detection uses `BarcodeDetector` when supported. The lazy fallback
is exact-pinned `@zxing/browser@0.2.1` (npm published 6 July 2026) with exact
peer `@zxing/library@0.23.0` (29 April 2026), both older than two weeks as of
this task. Registry version/time/repository metadata and the project's
[browser documentation](https://github.com/zxing-js/browser) were checked.
The maintained browser adapter provides typed QR-only canvas decoding and
ships in a separate on-demand chunk; the lockfile records integrity. Manual
reference entry remains available, camera access requires HTTPS, and stopping,
hiding or leaving the scanner releases its media tracks. Screen wake lock and
success vibration are opt-in; vibration is suppressed for reduced motion.
EN/AR result cards communicate with icon, text and colour.

The scanner document alone permits same-origin camera and screen wake lock.
Entering and leaving it uses document navigation to apply the correct
Permissions-Policy; other documents keep camera access denied. Contended
attendee-authority rows return retryable `unavailable`, session authorization
is rechecked after waits, and passive count polling does not extend idle time.

All new optional RPCs fail to `area-not-ready` when their migration is absent,
preserving valid sessions. Commands, observed counts, remaining device/CI
gates and the review handoff are in the
[Night-2 B receipt](progress/2026-10-22-codex-b.md). `docs/PROGRESS.md` is
unchanged under O9.

## ENG-059 — Participant journey pre-launch review and polish, 22 October 2026

Authority: the owner's Night-2 task E, building on ACD and B, and current
ORG-055/056/057. ENG-058 was the highest number checked before reservation.
AUTH-01–04, REG-01/02/05/07, ACC-01, LOC-01/03 and TIM-01 apply. Local source
and synthetic browser verification only; no hosted migration, settings seed,
workflow activation, real email, branch, commit or push. Claude owns committing.

Keep approved ORG-053 public CTA labels and destinations. Clarify the request
step, remove hardcoded registration-closed claims from shared
navigation/home cards/FAQ, and let the existing registration route show actual
availability. Approved policy and ORG-057 email wording remain unchanged.

Preserve the 5 October organizer decision keeping back-office approval/discount
details out of public invitation copy. The public step says "Request a seat";
the existing signed-in registration screen explains manual approval. No new
public approval-process wording is authorized by this review.

The current task's 44px touch-target requirement supersedes ORG-052's earlier
34/36px phone-menu rows for this review. Preserve the compact layout and native
vertical scrolling when enlarged text or a short screen needs it. No exact
registration counts or hardcoded opening dates are introduced.

Findings, before/after evidence, and owner questions are recorded in
[the journey review](reviews/participant-journey-2026-10-22.md). Commands and
observed results belong in [the Task E receipt](progress/2026-10-22-codex-e.md).
`docs/PROGRESS.md` remains unchanged under O9.

## ENG-060 — Closed opening activation package and launch readiness, 22 October 2026

Authority: the owner's activation-package task for the ORG-056 opening and
ORG-055/056/057. ENG-059 was the highest number checked before reservation.
AUTH-01–06/08, REG-01–08, ROL-10/12, EML-01–05, INF-04–06, SEC-01/02/06,
PRV-01/05/08, TIM-01/02, LOC-01/03, ACC-01 and REL-02/06 apply.
This is local source preparation only: no hosted queries or writes, migration
application, settings seed, flag activation, real email, branch, commit or push.
Claude reviews and commits. O9 evidence belongs in
[the activation receipt](progress/2026-10-22-codex-activation.md), never PROGRESS.md.

The owner reports Supabase Pro, Vercel Pro and paid Resend purchased on 22 October,
and 25 hosted migration versions through `20261022130000`, with all participant,
registration, retention and delivery gates still closed. These are current owner
facts, not a live audit by this task. The readiness migration becomes the single
pending migration; historic ledger counts in older runbooks are not replay targets.

Provide a Super Admin-only, read-only EN/AR readiness view, with independent
server and database authorization and no secret values. Missing optional RPCs
show `area-not-ready` without clearing valid sessions. Environment diagnostics
show presence/format and enabled booleans; production credential usability and
real inbox delivery still require owner verification. No stored drain heartbeat
exists, so Vercel invocation logs remain the evidence for the latest drain run.

The current participant reader requires privacy version `v1.0`; the older
participant activation runbook's `1.0` was stale and is corrected. The approved
Terms version remains `v1.0`. The Vercel Pro source cron becomes `*/5 * * * *`
in UTC, with its existing exact Bearer authorization and closed gates intact.
Resend caps in the activation guide are recommendations for owner approval,
subject to actual plan quota, remaining monthly budget and other senders.

The owner-only local key generator uses Node cryptography, never networks,
and writes only terminal output unless an explicit new path outside the repository
is supplied. Existing staff/contact secrets are retained; optional initial-install
generation is not authorization to rotate established keys. Registration opening
remains the final explicitly authorized database switch after complete settings
and the opening-night go/no-go checks.

## ENG-061 — Public registration opening notice, 23 October 2026

Authority: the owner's Night-3 Task 1 and ORG-056/057. ENG-060 was the highest
number checked before reservation. Requirements REG-02, TIM-01/02, LOC-01/03,
ACC-01 and DSN-01/02 apply.

Publish the approved early-access, general-opening and closing instants from one
shared display-only content module on Participate and Attend, with a compact
general-opening line beside the homepage actions. Show Riyadh time, semantic
`time` elements, Gregorian dates and Arabic-Indic numerals in Arabic. Early access
is for people on the organizers' early-access list; attendance is free and seats
require organizer approval. The owner's explicit request to publish this last
sentence narrowly supersedes ORG-030 and ENG-059's older instruction to keep
approval wording private. Other operational and discount wording remains private.

The published dates are announcements, never access defaults or settings seeds.
Database registration settings remain authoritative. No registration logic,
workflow flag, hosted setting, migration, policy or approved email text changes.
Keep work uncommitted for Claude; O9 evidence belongs in
[the Task 1 receipt](progress/2026-10-23-codex-night3-registration-opening.md),
never `docs/PROGRESS.md`.

## ENG-062 — Closed staff media library, 23 October 2026

Authority: the owner's Night-3 Task 2, current ORG-055/056/057, and requirements
MED-01–04, CMS-01/02/04, ROL-09/10/12, LOC-01/03, ACC-01 and SEC-01/02/06.
ENG-061 was the highest number checked before reservation. This work adds local
source and synthetic verification only. No hosted migration, settings seed,
participant opening, email, flag change, branch, commit or push is authorized.
The content editor remains Task 3. O9 evidence belongs in
[the media receipt](progress/2026-10-23-codex-night3-media.md), never PROGRESS.md.

Only current `contentMediaEditor` and `superAdmin` staff may manage media, with
existing exact-session email/TOTP assurance independently checked by server and
database. The private metadata schema has forced RLS and no client table grants.
Restrictive Storage policies block direct client writes to both media buckets
and private reads even if another permissive policy is introduced. Explicit
Publish confirms bilingual alt text and recorded rights/consent evidence; this
does not invent approved consent wording or replace MED-02's operational process.

Supabase's [signed upload API](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
fixes native upload capabilities at two hours; it has no expiry argument. Use
random immutable private raw paths, no overwrite, and a 15-minute application
completion window. Do not describe that window as revoking the provider token.
After staff authorization, actual bytes and bounded decoded dimensions are
validated; JPEG/PNG/WebP/AVIF inputs up to 10 MiB are re-encoded to stripped WebP.
Raw bytes are removed after processing/rejection; interrupted raw uploads remain
private and need the documented review/cleanup procedure.

`sharp@0.35.5` was already installed transitively through Next. Promote that exact
version to a direct dependency for explicit server imports; npm records publication
on 27 September 2026, more than two weeks before this task. The
[sharp output documentation](https://sharp.pixelplumbing.com/api-output/) documents
default metadata removal. Next supports sharp in its Node runtime. Generate a
bounded 2560px master and 640/1280/1920px WebP variants during processing, with
no upscaling, instead of adding another image cache or provider transformation
configuration. [Supabase transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
are available on Pro and above; this implementation does not require enabling them.
Public rendering uses responsive images and the stored focal point as
`object-position`. Existing approved public media is unchanged.

Publish writes sanitized variants to a unique public path after the explicit
approval reservation; Unpublish/Archive remove all four public objects. External
Storage and PostgreSQL cannot share a transaction: durable operation reservations
exclude competing edits/transitions and never expire into another executor.
Ambiguous storage/completion failures retain the lock for owner-reviewed
reconciliation. Do not blindly retry external writes or assert immediate deletion
of browser/CDN/third-party copies. Public objects use `cacheControl: 0`; unique
publication paths avoid reusing withdrawn URLs. Native Storage behavior, deletion
propagation and the recovery procedure need disposable/hosted review before use.

## ENG-063 — Closed bilingual content editor and safe public fallback, 23 October 2026

Authority: the owner's Night-3 Task 3, ORG-055/056/057, and requirements
CMS-01–04, PRG-01, SPN-01, MED-02, ROL-09/10/12, LOC-01/03, ACC-01 and
SEC-01/02/06. ENG-062 was the highest number checked before reservation.
This authorizes local uncommitted implementation only, building on Tasks 1–2.
No hosted migration, settings seed, participant opening, flag change, email,
branch, commit or push. O9 evidence belongs in
[the content receipt](progress/2026-10-23-codex-night3-content.md), never PROGRESS.md.

Only current `contentMediaEditor` and `superAdmin` sessions may maintain speakers,
programme sessions, sponsors/partners and committee/team members. Preserve the
existing exact-session email/TOTP checks in both server and database. Sponsorship/PR
does not gain this editor from the older baseline role description: the current
task explicitly names the two authorized roles. Ordinary content publication is
an explicit confirmation by the authorized publisher, not a second-person approval.
Sponsor publication also requires recorded permission to display.

Draft changes, reordering and restoring a version never change public snapshots.
Publish creates a new immutable snapshot; Unpublish withdraws its current pointer.
All mutations use expected versions and immutable audit/revision records. Session
speaker links are same-edition many-to-many references; a speaker used by a live
session cannot be unpublished until those sessions are revised or withdrawn.
Programme day and HH:mm inputs use Asia/Riyadh; no session date, time, room, tier
assignment or person is seeded. This slice does not change approved conference
dates, legal wording, approved transactional emails or workflow opening settings.

Each collection retains its current static content until at least one database
item is published, then uses that collection's published records only. Empty,
missing-function, malformed or unreachable database reads safely use the original
static source. Withdrawing the last published item returns to that static source;
organizers must review this explicit fallback behavior before first publication,
especially for the existing ORG-050 team roster. No automatic import is performed.

Public reads are server-only, service-role RPC projections of published fields.
Use bounded cached reads and immediate tag/path invalidation after committed
Publish/Unpublish transitions. The Next 16 route-handler form is
`revalidateTag(tag, { expire: 0 })`; cache-component opt-in is not introduced.
See the current [revalidateTag documentation](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
and [unstable_cache documentation](https://nextjs.org/docs/app/api-reference/functions/unstable_cache).

## ENG-064 — Closed confirm-your-seat round, 23 October 2026

Authority: the owner's Night-3 Task 4, ORG-055/056/057 and ENG-054 ticket
continuity. ENG-063 was the highest number checked before reservation.
Requirements REG-04/06/07, AT-05/06, ADM-02/04, EML-01–05, SEC-01/02/06,
TIM-01/02, LOC-01/03 and ACC-01 apply. The v0.5 specification's `confirm`
matches concern admission/payment and other workflows; it does not define a
confirm-your-seat nonresponse policy. **Owner decision for this implementation:**
at send time the Super Admin must explicitly choose release unconfirmed seats
or keep unconfirmed seats; neither choice has a default. This implements the
owner's stated fallback without selecting the operational policy for them.

This is local source work on top of Night-3 Tasks 1–3, with pending migrations,
no settings seeds, hosted changes, flag activation, real email, branch, commit
or push. The six ORG-057-approved emails and public legal text remain unchanged.
New confirmation and released-seat messages are DRAFT for owner approval.
The O9 receipt is `docs/progress/2026-10-23-codex-night3-confirm-seat.md`;
`docs/PROGRESS.md` remains untouched.

The opening threshold uses midnight Asia/Riyadh on the first owner-configured
conference day minus the configured lead days. Lead days zero is valid; no
unrequested first-day cutoff is imposed. An explicitly started round also
covers later approved requests, each receiving its own full response duration
under the latest round's immutable policy. The review dialog discloses that
ongoing scope beside the current recipient count. Existing windows never reset.

Use the existing explicit read/action expiry pattern and the authenticated
outbox drain for background maintenance, not a new scheduler. Database time
under the shared settings lock controls transitions, including own ticket
reads and online check-in. The daily source cron remains unchanged and all
existing runtime/database/delivery switches remain off. Timely delivery and
background cadence remain owner activation gates; this change is not a
production-readiness claim.

## ENG-065 — Closed abstract submission and scientific review workspace, 23 October 2026

Authority: the owner's Night-3 Task 5; ENG-064 was the highest number checked
before reservation. ABS-01–08/12/13/15, REV-01–09, BL-ABS-01–03/06,
BL-REV-01–07, LOC-01–03, ACC-01, ROL-03/05/10/12 and SEC-01/02/06 apply.
This is uncommitted local implementation on top of Tasks 1–4. No hosted
migrations, settings seeds, feature activation, participant opening or real email.
The O9 receipt is `docs/progress/2026-10-23-codex-night3-abstracts.md`;
`docs/PROGRESS.md` is outside this task's edit scope.

The task expressly supersedes BL-REV-03's older automatic-matching exclusion:
provide balanced automatic assignment as well as manual assignment, with declared
affiliation conflicts, current reviewer grants and approved sanitized packets
checked in both paths. It does not authorize automatic scientific decisions.

Scientific settings have no invented operational defaults: submission/review
windows, specialties, study types, rubric scales/weights, required review count,
blinding and corresponding-author eligibility require staff configuration.
Scientific Administrators and Super Admins may configure settings. The current
task's read-only Super Admin oversight is implemented conservatively: an SA-only
actor cannot assign, make scientific decisions or score; those actions require
the relevant scientific-administrator or assigned-reviewer role. Setting access
is the explicit exception requested in this task. Reviewer screens and packets
remain English/LTR, including within an Arabic staff route.

No upload endpoint or evidence download is added. ABS-09–11 administrative
evidence and the virus-scanning/storage decision remain release gates; settings
completeness alone cannot establish evidence readiness. Confidential originals
remain restricted to Super Admins in future implementation. Initial submission
never requests a supervisor. Two finalized applications per declared PI per
edition count across submitters; drafts do not consume that limit.

New abstract decision email wording is DRAFT, separate from ORG-057's unchanged
approved registration templates. Preparing a decision does not change participant
status. Explicit batch publication records the dashboard outcome and durable,
held English email jobs atomically; template approval and independent delivery
activation remain necessary before sending.

## ORG-058 — Public registration copy and abstract calendar dates, 23 October 2026

Authority: explicit organizer instruction, 23 October 2026. Supersedes the
public announcement scope of ENG-061, without changing ORG-055/056 operations.

- Public pages mention public registration only: remove early-access dates,
  eligibility and the homepage opening summary. The opening notice appears only
  on Participate, showing Wednesday, 18 November 2026, 8 pm Riyadh time and the
  existing closing date. Attend uses the ordinary closed-journey section.
- Keep Free attendance; omit organizer seat-approval statements from public
  informational copy. Preserve accurate signed-in registration request states
  and the staff/database early-access mechanism.
- Remove the Contact form's Resend/inbox/no-copy sentence in EN/AR. Approved
  Privacy Policy, Terms and ORG-057 email wording remain unchanged.
- Abstract Important dates (calendar dates only, no times): 23 November 2026
  submission opens; 13 December closes; 18 December initial screening completed;
  19 December eligible abstracts sent to reviewers; 2 January 2027 review
  completed; 7 January final acceptance and oral/poster allocation; 10 January
  participant instructions sent. Publish EN/AR with semantic dates and RTL.
- These abstract dates are public display only. Staff still enter exact opening
  and closing instants in Science settings. No database defaults, seeds or hosted
  changes are authorized; all workflows and delivery switches remain closed.

## ENG-066 — Focused public copy and abstract timeline, 23 October 2026

ORG-058; ABS-01, REG-02, TIM-01/02, SUP-01, LOC-01/03 and ACC-01. ENG-065
was the highest entry checked before reservation. Reuse the deterministic date
formatter and existing journey schedule styles; do not infer operational instants
from calendar dates. No migrations, RPCs or backend contracts are required.
Evidence: [public copy receipt](progress/2026-10-23-claude-public-copy-dates.md).
Do not edit PROGRESS.md.

## ORG-059 — Existing site media and content import, 23 October 2026

Authority: explicit organizer instructions in the media-import task, 23 October 2026.

- The media library runs the public Media page. Published archive library items
  replace the built-in archive; no published archive records, missing migration,
  unavailable configuration or database failure use `src/content/edition-media.ts`.
- Import the current approved team roster and any existing real partners as
  PUBLISHED content, preserving the public presentation. Speakers and programme
  are empty. Current sponsor slots are placeholders, not partner records.
- Archive photographs were supplied by the organizers, who confirmed the
  photographers' consent on 13 and 23 October 2026. Record that as imported
  archive rights evidence. Existing ORG-050 covers supplied team materials.
- Films retain the allowlisted existing static MP4 files; their poster images
  and archive metadata are managed in the media library.
- This task prepares the import action locally. It does not execute a hosted
  import, apply migrations, activate flags, open participants or send email.

## ENG-067 — Staff import of existing site archive and roster, 23 October 2026

ORG-059; MED-01–04, CMS-01–04, ARC-01, ROL-09/10/12, LOC-01/03,
ACC-01 and SEC-01/02/06. ENG-066 was the highest engineering entry checked
before reservation. Use the existing stripped canonical WebP/four-variant
pipeline, SHA-256 deduplication, current native staff assurance and private audit.
Only current Super Admins may import. The database independently rechecks that
authority for reservations, completion and the atomic published-content batch.

Durable import source keys preserve idempotency, including after later editor
changes or withdrawal. Newly imported archive assets remain excluded from public
reads until the complete media manifest and roster commit atomically. Ambiguous
Storage failures leave pending reservations for
owner-reviewed reconciliation, rather than allowing another in-flight executor.
No hosted state changes are authorized. The task-specific instruction to commit
locally on the existing `claude/media-import` branch supersedes the common
overnight no-commit instruction for this task; do not push or create branches.
The task-specific O9 receipt is
`docs/progress/2026-10-23-claude-media-import.md`; never edit PROGRESS.md.
