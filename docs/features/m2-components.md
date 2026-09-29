# M2 — Complete bilingual component system

30 September 2026. Decision ENG-007. Source requirements: DSN-01/02,
LOC-01/02/03, ACC-01, MED-01/02/03/04, CFG-12, CMS-04, INF-04.

## Scope and contract

Actor: an engineer or authorized staging reviewer. Purpose: inspect reusable visual
and interaction foundations before any operational module consumes them. Small complete
slice: the requested component inventory, translated state examples, protected-release
boundary, and tests. Existing homepage/About content and all 15 operational gates persist.

Exclusions: new public pages/content, auth, CMS editing, registration, submissions, payments,
review, workshops, competitions, scanning, certificates, production deployment, hosted
schema changes and media publication. No migrations, dependency/lockfile changes or new
environment variables are needed. No real data or credentials are used by the showcase.

Dependencies: existing Next.js/React/font setup; local browser runtime for verification;
external deployment protection before any remote staging preview is shared. Brand values
are now selected for M2 implementation by the current request. Final marks, translations,
event copy, media selection/rights and operational business values remain separate gates.

State transitions: dialog closed → open → closed with focus return; toast absent → announced
→ manually dismissed with focus return; native checkbox/radio/select choices; file empty →
selected → cleared; synthetic table page 1 ↔ 2 with first/last controls disabled. Field
disabled/loading/required/error/success/read-only examples are presentation states only.
No finalization, submission, booking or approval transition exists.

Data: transient native control values and selected filenames in memory. File bytes are
never read or uploaded. Existing validation example retains only its whitelisted synthetic
choice in sessionStorage for language switching. No server mutation, storage persistence,
audit record, email, job or database RLS change is appropriate for this isolated UI slice.
Future operational callers must supply their own server validation and authorization;
these components are not security controls.

## Inventory and changed files

| Area | Files |
|---|---|
| Tokens / imports / shared styling | `src/styles/tokens.css`, `src/styles/components.css`, `src/styles/design-system.css`, `src/app/globals.css` |
| Layout/navigation | `src/components/site-header.tsx` (Header), `src/components/mobile-nav.tsx`, `src/components/footer.tsx`, `src/components/site-shell.tsx`, `src/components/ui/section.tsx` |
| Links / motion | `src/components/ui/button.tsx`, `src/components/ui/link.tsx`, `src/components/ui/reveal.tsx` |
| Composition / data | `src/components/ui/content-split.tsx`, `src/components/data-display/stat-block.tsx`, `program-row.tsx`, `table.tsx`, `pagination.tsx`, `src/styles/data-display.css` |
| Forms | `src/components/forms/form-field.tsx`, `select.tsx`, `checkbox.tsx`, `radio.tsx`, `file-upload.tsx`, `src/styles/forms.css` |
| Feedback | `src/components/feedback/alert.tsx`, `empty-state.tsx`, `loading-skeleton.tsx`, `dialog.tsx`, `toast.tsx`, `src/styles/feedback.css` |
| Showcase / alias | `src/components/design-system-demo.tsx`, `src/components/design-system-components.tsx`, `src/app/design-system/route.ts` |
| Verification | `tests/unit/form-controls.test.ts`, `tests/unit/design-accessibility.test.ts`, `tests/e2e/m2-components.spec.ts`, `tests/e2e/design-system.spec.ts` |
| Records | `README.md`, `docs/DESIGN_GUIDE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/MEDIA_REGISTER.md`, this note, `docs/features/design-system.md` |

Existing Container, SectionHeading, StatusBadge, LanguageSwitch and `src/lib/fonts.ts`
are reused. Fonts remain local DM Sans / Inter / Noto Sans Arabic. Tokens cover the five
brand colours, semantic feedback colours, type scale/weights/line heights, spacing, radii,
shadows, focus width/offset, touch target and motion values. Native scroll is preserved.
Only same-page anchor clicks request smooth motion; reduced motion uses an instant jump.
One-time reveals move opaque content by 12px over 400ms. Loading skeletons stay still.
No dark mode, new generic theme or external UI dependency is introduced.

English is default; the complete showcase is also rendered with Arabic document direction
and Noto Sans Arabic. Scientific control values explicitly retain English/LTR. All labels,
errors, dialog/toast controls, tables and pagination names come from the interface locale.
Browser-owned file picker wording follows the user's browser/OS language.

## How to inspect

Run `. ./scripts/use-local-node.ps1` on this prepared Windows checkout, then `pnpm dev`.
Open `/design-system`, `/en/design-system` or `/ar/design-system`. The unlocalized alias
redirects to English only when the same server gate permits the localized preview.
Local production/staging builds require `DESIGN_PREVIEW_ENABLED=true`; Vercel production
always denies access. A flag/no-index is not authentication: remote staging needs deployment
protection configured before sharing. This task does not create a remote deployment.

Inspect keyboard Tab/Shift+Tab, Space and radio arrows; open/close the dialog with keyboard
and pointer; dismiss a toast; select/clear a synthetic text file; change table pages; inspect
320px, tablet and desktop widths; repeat in Arabic and with reduced motion. Do not use
real personal/research files in the component demo.

Acceptance: requested primitives appear with meaningful default, disabled, loading,
validation, hover/press and focus examples as applicable; 44px targets, AA text/control
contrast, semantic table labels, modal focus containment/return, no network writes and
no production showcase bypass. Exact executed checks and failures are in PROGRESS.

## Remaining review / rollback

Screen-reader announcement quality, real Safari/Firefox/mobile devices and final Arabic
editorial approval need human UAT; automated Chromium/axe checks are not certification.
For media, the user's Drive folder remains the source for a reviewed hero loop, introduction
photographs, labelled MSRC2026 gallery and mobile poster. Select source IDs and approve
rights, captions/crops and compressed derivatives before publishing. The homepage retains
its original static artwork and the showcase retains only synthetic motion.

Rollback: revert the M2 component commit(s); there is no database rollback or credential
rotation. Disable `DESIGN_PREVIEW_ENABLED` to close a staging showcase immediately.
Next smallest PR: review a bounded set of MSRC2026 candidate assets and record source IDs,
placement/caption/consent evidence and proposed encodings; retain publication gates.

Official implementation references checked: [Next.js Link](https://nextjs.org/docs/app/api-reference/components/link),
[native dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog),
[WAI modal-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
