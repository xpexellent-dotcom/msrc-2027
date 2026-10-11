# Public visual approval demo

11 October 2026. Combines the preceding design-engineering refinements with the
requester's expanded full public visual overhaul. Review locally at
[English demo](http://127.0.0.1:3211/en) or
[Arabic demo](http://127.0.0.1:3211/ar) while the local preview is running.
This is an approval demo; it has not been deployed or approved for release.

## Audit and implementation

The [original audit](../reviews/design-engineering-audit-2026-10-11.md) and
[expanded prioritized plan](../reviews/visual-overhaul-brief.md) preceded source
changes. Impeccable guided the visual system; Emil Kowalski's design-engineering
principles guided purposeful motion, interruption and input parity.

| Before | After | Why |
| --- | --- | --- |
| Floating rounded header | Full-width ivory masthead and a fine rule | A clearer congress identity and predictable content alignment |
| Repeated cards and small research illustrations | Editorial participation index, bold type and broad purple/gold sections | Gives the page a stronger rhythm and makes routes easier to compare |
| DM Sans public headlines | Manrope public display, Inter text, Noto Sans Arabic | A consistent poster-like voice using already installed fonts |
| Small event details beside a lilac countdown card | One gold information rail with readable facts and live countdown | Dates and venue become a clear practical landmark |
| Large speaker placeholder art | Typographic announcement with honest publication state | Avoids filling the page with an invented roster or decorative placeholders |
| Separate interior visual treatments | Cohesive programme, media, participation, journey, About, venue, Contact and policy surfaces | Visitors retain their bearings across destinations |
| Large scene movement and a long entrance cascade | Shorter hero entrance, 16px chapter lift, 24px departure and 3% film scale | Keeps the cleared film as the main motion and reduces competing movement |
| Existing refinement fixes | Preserved focus, keyboard, URL/filter, RTL, text wrapping and film safeguards | The broader design includes the previous accessibility and interaction work |

The extracted public [design system](../../DESIGN.md) and its
`.impeccable/design.json` companion record the actual implementation. The companion
uses schema version 2 and nine representative component previews. Both describe a
local demo pending approval; generated palette ramps are preview aids, not newly
approved brand colors. Public type/radius overrides remain scoped away from staff.

The direction uses the requested references as principles, not copied assets:
[Stripe](https://stripe.com/) for content clarity,
[Slush](https://slush.org/) for an immersive event opening,
[Config](https://config.figma.com/) for a consistent event identity, and
[ESC Congress](https://www.escardio.org/events/congresses/esc-congress/scientific-programme/)
for explicit scientific-programme organization. The implemented system remains MSRC.

## Boundaries

No dependencies, approved policy wording, catalogue records, backend rules,
database, hosted configuration, DNS, real communications or workflow gates changed.
All public workflow states remain truthful. The only real event media remains the
approved MSRC2026 homepage film and responsive posters; cinema reuses that video.
Poster metadata now carries its existing origin. A byte comparison excluding JPEG
COM segments proves no other image bytes changed; videos are untouched.

The working tree is `codex/msrc-design-engineering`, based on main `340e36d`.
The original handoff checkout and its user changes remain separate and intact.

## Verification

- PASS: portable Node24.21.0, pnpm11.19.0 combined `check`: lint, TypeScript,
  2,383 unit tests / 59 files, and the 79-page production build.
- PASS: final-source combined check after all review and reflow corrections:
  zero-warning lint, TypeScript, 2,383 unit tests / 59 files, 79-page production build
  (`design-overhaul-review-demo-check.log`). `git diff --check` also passed.
- PASS: Impeccable detector on changed public targets: zero findings. Provenance
  scan: two raster assets, zero missing. Existing unrelated semantic-border warnings
  from the prior audit are outside the changed public targets.
- PASS: updated static desktop/phone EN/AR screenshots have no captured console
  errors or document overflow. Reduced-motion captures intentionally show the poster.
- First browser run: 490 passed, 15 failed, 29 intentional skips, zero retries.
  Root causes: narrow text constraints, gold countdown-label contrast, a partial
  build containing old Contact colors, and outgoing visual assertions. Corrections
  retain the functional assertions; native Arabic selection now targets real glyphs.
  Failed receipts remain under `.tools/design-overhaul-first/` and in the first log.
- Second browser run: 504 passed, one failed, 29 intentional skips. The remaining
  280px/200%-text homepage overflow was corrected with emergency word wrapping and
  container-relative decorative type. Receipts: `.tools/design-overhaul-second/`.
- Third browser run: 504 passed, one failed, 29 intentional skips. Its trace records
  `net::ERR_NO_BUFFER_SPACE` for an essential JavaScript chunk, status -1 and no
  response body. Programme controls correctly remained disabled before hydration;
  the failure occurred before the tested navigation. No application/assertion change
  was made for this browser resource error. The trace does not identify the exact
  exhausted system resource. Receipts: `.tools/design-overhaul-third/`.
- PASS: final full browser run, **505 passed / 29 intentional skips**, zero failures,
  7.5m: `npx --yes pnpm@11.19.0 test:e2e --workers=1`. One worker, zero retries and
  unchanged assertions. The separate demo server was stopped during this run to
  reduce local resource contention, then restarted for requester review.
- PASS: independent finish reviewer rechecked all seven final captures and cleared
  its three scored corrections with no visible regressions. The `ship` verdict is
  scoped to those fixes, not user approval or release approval. See the
  [finish review](../reviews/visual-overhaul-finish-review.md).

Logs: `design-overhaul-check.log`, `design-overhaul-final-build.log`,
`design-overhaul-review-demo-check.log`, `design-overhaul-e2e-first.log`,
`design-overhaul-e2e-second.log`, `design-overhaul-e2e-third.log`,
`design-overhaul-e2e-final.log`.
Screenshots and capture metadata: `.impeccable/review/`.

Physical-device Safari/Firefox, human screen-reader review, measured performance,
native-reader approval and production deployment are NOT TESTED in this task.
Next: requester reviews the working English/Arabic demo and approves or directs
visual changes before a separate release step.
