# M1 engineering foundation

Scope: local, synthetic engineering preview. Source requirements: INF-01/02/04/05,
SEC-02/06, ROL-01, LOC-01/02/03, CMS-04, ACC-01, ERR-01, TIM-01, CFG-01/02/07/10/12,
REL-01 through REL-06. M1 does not satisfy a public or operational release gate.

## Boundaries

- `/` selects English. `/en` and `/ar` provide safe unpublished information; document
  language and native direction are set on the server. The subsequent M2 design system
  and bilingual About preview remain preserved; this M1 follow-up adds no public page.
- Static content renders without environment variables or a database. Working colors
  come from the handoff; M2's self-hosted fonts avoid build-time network access. Logo, video,
  final typography, copy and translations remain CFG-12 dependencies.
- Typed `conferenceConfig` keeps event dates, venue, prices, capacities and production
  regions null. Estimates and draft proposals are not defaults.
- `src/lib/workflows.server.ts` is protected by `server-only`. Every operational flag
  is false and every guard invocation throws before any operation. Request parameters,
  role headers, cookies, local storage and environment toggles cannot enable M1.
- `/api/workflows/[workflow]` is a denial boundary only. Recognized workflow names
  return 503/WORKFLOW_CLOSED; unknown names return 404. It does not parse or save request
  bodies. There is no registration/payment/submission handler behind it. Real handlers
  must later enforce their release gate, authenticated permission and database policy.
- `/api/health` reports static process availability only; it does not test integrations.
- Responses are marked noindex; robots directives are not authorization. Local servers
  bind to loopback. A future remote preview still requires provider access protection.
- No operational tables, participant records, email sender, payment provider, analytics,
  file uploads, CMS admin or advisory assessment has been implemented.
- Local Supabase clients use public credentials with separate browser/server boundaries;
  their explicit local-only configuration rejects remote projects and privileged keys.
  See [local-data.md](local-data.md) for fixtures, policies and remaining Docker checks.
- The playbook's remaining folder boundaries are README-only reservations, documented in
  [ARCHITECTURE](../ARCHITECTURE.md). They create no operational route, table or workflow.
- `pnpm db:env` safely derives only public local client variables without overwriting a
  user's environment file. The local Auth container is an infrastructure dependency for
  the pinned CLI's publishable key; sign-up and every application flag remain disabled.

## Verification and extension

Run `pnpm check` then `pnpm test:e2e`. CI defines the same independent checks using the
committed lockfile. Browser coverage includes English/Arabic, mobile, keyboard,
reduced-motion, missing routes and direct/repeated denied requests. These checks prove
only the M1 boundaries; they do not certify later authentication, seat allocation,
idempotent transactions, delivery, accessibility compliance or production security.

Loading and sanitized error conventions exist without intentional public crash routes.
Runtime exception recovery remains NOT TESTED until there is a real async feature to
exercise. No synthetic error endpoint is shipped solely to test framework behavior.

The explicit `pnpm db:integration` suite exercises both real client factories against
seeded local data. It fails on missing configuration or service availability instead of
claiming an integration pass. The suite does not create an account or expose a debug page.

Current verification and complete file inventory are in [the M1 review](../reviews/m1-foundation.md).
Next smallest foundation PR: provide Docker/WSL, run the prepared database checks and
record the authorized repository's actual hosted CI result. M2/About already exist and
are preserved; later operational feature work is excluded from this task.
