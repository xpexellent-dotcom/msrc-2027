# Editorial motion approval demo — ENG-023

This is the latest local MSRC 2027 design revision. The audit and prioritized plan
in `docs/reviews/editorial-motion-revision-brief.md` preceded implementation.
ENG-023 supersedes conflicting ENG-022 visual and navigation decisions.

## What changed

- A thin capsule header contracts and briefly blurs during downward reading;
  upward scrolling, top-edge approach and keyboard focus restore navigation.
  Exact order: Participate, Program, Speakers, Sponsors, Our Team, Venue, Contact.
  Participate exposes five destinations. Program is a direct link. Primary action:
  Reserve your seat. About is removed from routes, navigation and indexing.
- The opening film stays in place while an opaque rounded paper section rises
  over it through native sticky positioning. A tall phone opener first scrolls
  far enough to reveal its final controls, then holds at its measured bottom edge.
  Reduced motion removes the hold; no JavaScript or unavailable ResizeObserver
  retains a static, readable baseline.
- Generated fine raster grain and a single pausable scientific artwork accompany
  a spacious six-part benefits section. CME details remain pending confirmation;
  certificate eligibility remains both days plus the general survey.
- The Build an idea image is replaced with genuine conference imagery. Speaker
  and team cards use anonymous portrait designs and pending names. Repeated
  photographic/demo disclaimers and both homepage sponsor sections are removed.
  Sponsors retains its page and a prominent Become a sponsor action to Contact.
- Historical counters show 4,007+ total attendances across four editions, 2,257
  visitors in 2026 and 83 research projects in 2026. Counts run once, with stable
  accessible values and a static reduced-motion fallback. The archive combines
  genuine images from the supplied PDF and authorized Drive selection.
- A new venue chapter uses an actual official KAU image of King Faisal Conference
  Center. The Jeddah closing uses the first 23 seconds of the user-supplied video,
  accelerated 2.8× into a silent 8.2-second loop with gentle blur. Loading occurs
  on approach and respects reduced motion/data-saving preferences.

## Source and scope

Asset sources, hashes and exact generation prompts are recorded in
`docs/media/editorial-revision-assets.md`. The PDF establishes summed attendance,
not a count of unique people. It does not establish an approved CME hour count.
Current product decisions override conflicting older draft text.

The original checkout remains untouched by this isolated demo. No hosted change,
push, merge, workflow opening, database/settings change or communication occurred.
The supplied city video is for this local review; public reuse clearance remains
separate. EN/AR, keyboard controls, native scrolling and closed destinations remain.

## Validation

Final rendered and functional results are recorded in `docs/PROGRESS.md` and the
finish review. Historical failed receipts are retained, and focused confirmations
must not be represented as a complete rerun of the full public suite.

Physical-device browser testing, native-reader Arabic approval, human assistive
technology UAT and measured performance remain NOT TESTED.

Requirements: DSN-01/02, CFG-12, ACC-01, LOC-01/03, MED-01/02/03/04, PRV-03.
