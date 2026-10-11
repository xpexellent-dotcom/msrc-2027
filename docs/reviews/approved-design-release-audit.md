# Approved design release — scope audit

11 October 2026. Read-only source review for the organizer's explicit instruction:
“I approve of the Demo, bring it into the live version.”

## Result

No release-blocking scope or public-claim issue found in the reviewed design
delta. This result is a source audit, not evidence of deployment, exact-head CI,
live workflow state or human accessibility approval.

Reviewed the dirty `codex/msrc-design-engineering` worktree against its base
`340e36df20f601c3fa05c4aa82d8f256df7471bc`. The release must integrate this delta
with current main, retaining any newer security and operational work; this older
checkout is not a replacement for current production source.

## Scope and boundaries

- Tracked runtime changes are public layout, styling, content, motion, navigation,
  public route indexing and the retirement of About. The untracked source adds
  public components, page/content modules and styles for the approved design.
- No design diff changes conference configuration, API handlers, authentication,
  participant/account/contact server features, payment behavior, database or
  storage authorization, migrations, package versions, lockfile, hosting config
  or CI workflows. No new browser fetch, third-party embed or server mutation was
  introduced by the reviewed new presentation components.
- Approved Privacy and Terms source wording is untouched. The policy component
  removes an editorial eyebrow; policy tests retain approved-source comparison
  and only adapt language-switch access to the new navigation.
- Registration/submission/hackathon/3MT actions target the visible closed notice.
  Workshop actions target the catalogue; booking remains closed. Ticket and
  brochure buttons are disabled with explanations. New public copy retains
  confirmation-by-email, separate attendance, the 300-word limit, two finalized
  PI applications, and the existing certificate and workshop conditions.
- The organizer's requested **7 CME** illustration is visibly marked
  “Illustrative” and accessibly states that hours are unconfirmed. The nearby
  body copy still says accreditation and hours will be announced after
  confirmation. It does not enter event structured data or configuration.
- Anonymous speaker/team portraits and pending names do not invent a roster.
  Sponsor tiers contain neutral Brand placeholders, not named sponsors.
  Historical statistics retain their 2023–2026 and MSRC 2026 scopes; ENG-026
  explicitly records the organizer's revised visitor/abstract labels.

## Routing and privacy observations

- About removal is an explicit organizer request. Its page and content module
  are deleted, and public sitemap, navigation and analytics no longer include it.
- Public labels use Program. The existing permanent `/programme` to `/program`
  redirect is retained in `next.config.ts`.
- `/team` and `/sponsors` are included in the localized public sitemap. No
  private/internal route was added to public indexing.
- Query and fragment stripping plus automated-browser exclusion in observability
  are unchanged. New Team and Sponsors pages are not added to the analytics
  allowlist, so they send no page events; this is a nonblocking omission rather
  than a privacy regression. No broadening is necessary for this design release.

## Evidence and limits

Read PROJECT_BRIEF, DECISIONS and PROGRESS, then inspected `git status`, tracked
runtime/test diffs, untracked public components/content, metadata, observability,
closed journey actions and the existing redirect configuration. Existing test
changes follow the removed page and revised DOM; reviewed legal-source and
closed-workflow assertions remain intact.

No build, test command, hosted call, git mutation or application-code edit was
performed in this audit lane. Production-mode route checks and media selection
are separate parallel release reviews. The parent release task owns final
integration, checks, publication and live verification.

The parallel route reviewer subsequently reported passing EN/AR homepage SSR
checks in Production mode with preview flags absent, private design-system and
hero-preview 404 responses even with their flags supplied, and retained Contact
server-side delivery gating. Those are that lane's reported receipts, not tests
executed by this audit lane.
