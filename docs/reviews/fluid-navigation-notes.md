# Fluid navigation refinement — ENG-025

Scope: the existing local bilingual design demo. No dependencies, workflow,
hosting or operational changes. The requester explicitly chooses translucent
blurred navigation; this direction takes precedence over generic style defaults.

## Audit before implementation

| Before | After | Why |
| --- | --- | --- |
| The document pointer listener clears approach state below the capsule; the open dropdown does not prevent compaction. | Treat the whole rendered header, including its dropdown, as the active interaction region and keep an open dropdown expanded. | A pointer moving to the last participation option must not collapse its own destination. |
| Leaving a trigger immediately closes its dropdown. | Retain the existing invisible gap bridge and add a short, cancelable pointer-leave grace period; keyboard focus stays immediate. | Accommodate slightly diagonal pointer travel without trapping an abandoned menu. |
| Split glass, links and islands use uneven short timings with a strong initial jump. | One reversible 280ms travel curve, restrained 220ms blur/fade and a 180ms anchored dropdown. | Cohesive movement while preserving quick response and native scrolling. |
| Capsule opacity is effectively solid at .92–.96. | Purple glass at .80–.86 with a 24px background blur, bright edge and restrained grain. | Reveal the underlying page while retaining an opaque-enough text contrast floor. |
| Our Team precedes Venue. | Our Team follows Venue in both desktop and phone navigation, EN and AR. | Match the latest requested order. |

## Verification plan

- Regress compact → top approach → Participate trigger → every dropdown option,
  including slow travel across the visual gap and actual final-option activation.
- Verify true pointer exit, outside click, keyboard navigation and Escape.
- Preserve native focus restoration, reduced motion, touch layout and EN/AR order.
- Run targeted lint; integrated build/browser verification is owned by the parent.

## Implementation and observed checks

- The compact condition now excludes an open dropdown. The global approach
  handler recognizes header descendants, including the absolutely positioned
  dropdown below the capsule. A 140ms cancelable leave delay tolerates diagonal
  travel; true exit closes it unless keyboard-visible focus remains inside.
- Escape, outside pointer/focus, viewport changes, route activation and unmount
  cancel pending close work. Keyboard restoration remains immediate. No new
  playback controls or continuously running animations are introduced.
- Unified reversible 280ms capsule/island movement uses the established drawer
  curve `cubic-bezier(.32,.72,0,1)`; the trigger-anchored dropdown uses 180ms.
- The light champagne navigation accent is adjusted to `#f4e7c8`. A conservative
  numerical contrast check composites every glass stop over pure white and then
  an entirely white grain layer at .08 opacity: minimum ivory contrast **5.15:1**,
  minimum champagne contrast **4.53:1**. This is a material bound, not a claim
  that an automated rendered contrast audit ran.
- **PASS:** targeted ESLint on `src/components/site-header.tsx` and
  `tests/e2e/axiom-navigation.spec.ts`, zero warnings, exit 0.
- **PASS:** scoped `git diff --check`, exit 0.
- **NOT TESTED by this lane:** the new pointer-path regression and integrated
  visual/browser checks. Parent should run `pnpm exec playwright test
  tests/e2e/axiom-navigation.spec.ts --workers=1` after the integrated build.

## Integrated correction and confirmation

The independent visual review found a midpoint seam caused by separately blurred
clipped halves. A common background blur plane now underlies both tint/edge
halves, preserving their outward separation. Four focused EN/AR desktop/mobile
captures confirm a continuous open capsule. The parent's final 55-pass scoped
browser run includes the pointer-path regression and keyboard behavior; see
`docs/PROGRESS.md` and `.tools/fluid-confirmation.log` for the integrated receipt.
