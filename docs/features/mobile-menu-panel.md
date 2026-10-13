# Compact mobile menu — ENG-040

The organizer's 13 October 2026 phone screenshot shows the registration action
below the complete navigation, with the menu filling almost the whole viewport.
The requested refinement moves registration to the top, fits a smaller panel to
the right, and adds subtle dropdown, text and button motion. Requirements:
DSN-01/02, ACC-01, LOC-01/03; existing REL-01 and registration gates remain separate.

## Audit and implementation

1. Registration followed all seven main destinations and five participation
   destinations. Move the existing gold action and translated closed status above
   navigation, making it the first native Tab destination after the toggle.
2. The panel used almost the full viewport width, with 56px parent rows. Limit it
   to 21rem and the available width, align its physical right edge with the header,
   use 44px targets and paired participation links. Arabic keeps RTL text and order.
   Normal 390/412px portrait phones show every destination without panel scrolling;
   short or enlarged screens use the existing native inner scroll.
3. Conditional unmount prevented an exit animation, while the opening keyframe
   could restart during fast input. Use 200ms transform/opacity transitions with
   `@starting-style`, a 160ms exit and a short capped text-opacity stagger. The
   menu toggle has a two-line-to-close transition and 120ms press feedback; the
   gold action retains the existing shared press treatment. Use incumbent motion
   tokens and no additional dependency.
4. Keep keyboard/reduced-motion opening immediate. Logical closure immediately
   sets `inert` and `aria-hidden` during pointer exit. Transition completion removes
   the panel, with a 220ms cleanup fallback; reopening cancels previous cleanup.
   Escape restores toggle focus, outside focus and navigation close immediately,
   and pointer dismissal preserves native page interaction.

`@starting-style` is progressive enhancement: older browsers show the open panel
immediately. Reference:
[MDN starting styles](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style)
and [inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert).

## Verification and remaining evidence

Implementation is isolated from the older dirty handoff checkout in the managed
`mobile-menu` worktree, based on `origin/main` at `3550d27`. Its tracked application
source matches the current screenshot; the original local documents and skill
configuration were preserved.

- PASS: pinned Node 24.21.0 / pnpm 11.19.0 frozen-lockfile installation; lint,
  typecheck and an 81-page production build.
- PASS first focused Chromium run: ten new EN/AR cases for registration placement,
  closed destination, 44px targets, interruption/exit accessibility, native Tab,
  Escape, reduced motion, short landscape and enlarged text.
- First broader Chromium run: 94 passed, 20 intentional skips, one failed at
  280px / 200% text. The registration grid's intrinsic status width forced its
  track wider than its container. Constrain that track with `minmax(0,1fr)`, allow
  status wrapping, and cap surrounding gutters/button padding when type enlarges.
  Original failure log and trace retained in `.tools/mobile-menu-first-*`.
- PASS first correct visual/axe inspection: EN/AR desktop 1440x900 and phone
  390x844; zero header axe violations or browser page errors. Panel is 336px wide,
  aligned at x42–378, and all destinations fit within its 569px height.
  A preceding capture hit an unrelated existing server at port 3212; that receipt
  is preserved but excluded. Task-owned production server uses port 4327.
- PASS final corrected Chromium suite: 105 passed / 30 intentional project
  skips / zero failures or retries; `.tools-mobile-final-regressions.log`.
  Includes the new menu cases plus mobile-navigation, axiom-navigation,
  design-motion-refinement, public-shell and design-system suites across
  desktop, tablet and phone projects.
- PASS WebKit phone suite: 16 passed / two intentional native-Tab-policy skips /
  zero failures or retries; `.tools-mobile-webkit.log`. Includes all ten new
  EN/AR menu cases and the existing phone navigation cases. The first harness
  attempt started from its config directory rather than the repository root;
  explicit server cwd corrected it. Startup diagnostic retained in
  `.tools/mobile-menu-webkit-startup-failure.log`.
- PASS final visual confirmation after the enlarged-text fix: EN/AR desktop
  and 390px phone, plus 280px / 200% text; zero header axe violations, no page
  errors and no measured overflowing child in the 280px diagnosis. Receipts and
  screenshots: `.tools/mobile-menu-current-evidence/`. Normal phone geometry
  remains 336px wide and 569px tall. Final lint and `git diff --check` pass.
- NOT TESTED: physical iPhone/Safari touch feel and browser-chrome/safe-area
  behavior, physical Android, and real assistive-technology reading.
- Production merge/deployment and hosted CI are separate from these local receipts.

Commands (from the isolated worktree, with the original portable Node 24.21.0
directory prepended to this terminal's PATH, then `scripts/use-local-node.ps1`):

```powershell
npx --yes pnpm@11.19.0 install --frozen-lockfile
npx --yes pnpm@11.19.0 lint
npx --yes pnpm@11.19.0 typecheck
npx --yes pnpm@11.19.0 build
npx --yes pnpm@11.19.0 exec playwright test tests/e2e/mobile-menu-panel.spec.ts tests/e2e/mobile-navigation.spec.ts tests/e2e/axiom-navigation.spec.ts tests/e2e/design-motion-refinement.spec.ts tests/e2e/public-shell.spec.ts tests/e2e/design-system.spec.ts --project=chromium-mobile --project=chromium-desktop --project=chromium-tablet
npx --yes pnpm@11.19.0 exec playwright test --config .tools/playwright.mobile-menu.webkit.config.ts tests/e2e/mobile-menu-panel.spec.ts tests/e2e/mobile-navigation.spec.ts
node .tools/mobile-menu-visual.mjs http://127.0.0.1:4327
node .tools/mobile-menu-reflow.mjs
git diff --check
```

The ignored WebKit harness extends the repository config with iPhone 13 device
settings, a 390x844 viewport, explicit worktree server cwd and the WebKit engine.
No browser preference was changed. The visual script runs against a separately
started task-owned `next start` on port 4327. No new package/version/lockfile
change was needed. Global pnpm 11.25.0 was rejected before installation; all
actual successful package commands used the project's pinned 11.19.0.

No public claim, registration availability, hosted setting, database, media
approval or communication behavior changes. Next: review the branch and its
preview, then perform the normal release and a physical-phone check.
