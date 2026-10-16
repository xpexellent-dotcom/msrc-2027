# Private CSP and localized unmatched-route 404 (ENG-045)

Local implementation on `codex/strict-csp-404`. Initial HEAD was `7da658b`, with a
clean working tree: three existing public QA/image commits after the supplied
`2406a17` base. Those commits are preserved. No commit, branch, push, PR, hosted
setting, environment file, migration or workflow activation was performed.
Requirements: SEC-01/06, ACC-01, LOC-01/03, ERR-01, NFR-02, REL-06; ORG-008/013.

## Audit and selected scope

- Installed Next is 16.3.8; Node 24.21.0 and pnpm 11.19.0 come from
  `C:\m\tools\bin`. There was no proxy/middleware.
- Staff and participant pages are already dynamic. Registration was SSG; a new
  registration-only layout opts it into dynamic rendering without changing the
  registration page shared with PR #88.
- Fonts use `next/font/local` and package WOFF2s. Images/video are self-hosted.
  Participant/staff browser requests use same-origin API routes. Supabase, Resend
  and AI adapters run on the server; no browser allowlist entries are needed for
  those services. The unused optional Supabase browser client is not called by
  any page/component.
- Production Vercel Analytics and Speed Insights use `/_vercel/insights/script.js`
  and `/_vercel/speed-insights/script.js`, dynamically loaded by trusted modules;
  their default beacons are same-origin. There are no custom endpoints/DSNs.
  Staff renders neither service. Existing ORG-008 automated-browser and private
  page event filters remain intact. No foreign origin is allowlisted.
- Prioritize enforced private CSP, preserve public SSG/header behavior, then
  replace the unmatched-route error path and verify EN/AR/no-JS accessibility.
  Public source/copy/design/scrolling are otherwise preserved.

## CSP and routing

`src/proxy.ts` covers page/RSC requests, excluding APIs and `_next` assets. It
overwrites incoming locale/CSP/nonce headers, generates a UUID-derived base64 nonce
per private request, and propagates the CSP in both request and response headers.
Next reads the request CSP and automatically nonces parser-inserted framework,
bootstrap and RSC scripts. Runtime chunks inherit trust through strict-dynamic.
Private responses are `private, no-store`; no nonce-bearing page is prerendered.
Encoded dynamic locale values are decoded before classification: probes proved
`/%65n/sign-in` and `/%61r/registration` otherwise reach real pages without matching
a literal `/en|ar/` proxy condition. Regression tests cover these aliases.

Protected EN/AR routes and descendants:

- `/staff`, `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`,
  `/reset-password`, `/my-msrc`, `/registration`, `/staff-security-preview`.
- Future descendant paths under those entries inherit the policy. APIs retain
  their existing authorization/gates; CSP is not an authorization mechanism.

Enforced production header (`N` is unique for each request):

```text
default-src 'self'; script-src 'nonce-N' 'strict-dynamic'; script-src-attr 'none'; style-src 'self' 'nonce-N'; style-src-attr 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; worker-src 'none'; upgrade-insecure-requests
```

Allowlist justification:

| Directive/source | Actual use |
| --- | --- |
| nonce + strict-dynamic | Next bootstrap/RSC and trusted dynamically loaded chunks/observability scripts; no script origin wildcard or unsafe-inline/eval |
| style self + nonce | Extracted CSS and authorized framework style elements |
| style-src-attr unsafe-inline | Existing React/next/image sizing, positioning, font scaling and layout attributes; does not permit style elements or scripts |
| connect self | Same-origin participant/staff APIs and Vercel beacons |
| img self + data | Site imagery/Next optimization and inline authenticator QR images |
| media self | Existing self-hosted media; no embeds or external host |
| font self | Self-hosted WOFF2s; no Google Fonts request |
| default self | Same-origin fallback, including the manifest |
| object/frame/worker none | No required object, iframe or worker |
| base/form self; ancestors none | Existing structural restrictions |
| upgrade-insecure-requests | HTTPS subresource upgrade in production |

Development alone adds script unsafe-eval, uses style self + unsafe-inline and
omits HTTPS upgrading for local HMR. Production tests assert no unsafe script
exception. Style attributes retain the narrow exception in both environments.
The policy is enforced, not report-only.

The shared `Link` disables protected-target prefetch and uses a full document
navigation when crossing between public/private paths. A client transition alone
would keep the old document's policy. Modifier/new-tab/download and same-policy
navigation keep their existing browser/Next behavior; locale changes within the
participant preview preserve the existing in-memory draft behavior.

Public pages retain the exact header:

```text
base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'
```

This preserves the requested public header baseline and cached static HTML.
A public strict script policy would require a separate static/hash design or
dynamic rendering; neither is introduced here. No headers()/nonce read was added
to the public locale layout.

## 404 root cause and fix

Baseline production GET `/ar/zz-missing`: 404, `<html id="__next_error__">`, no h1,
empty visible body without JavaScript. The installed Next app-render error path
(`getErrorRSCPayload`) seeds this bare error document after `notFound()` escapes
server rendering. The locale client not-found boundary reconstructs content only
after hydration. A small ignored reproduction with a **server-only** not-found
component, the same async locale root and throwing catch-all still returns the
bare error document and no server heading. Removing `useParams()` alone is not a
fix. The previously rejected catch-all staticParams/dynamicParams approach was
not reintroduced.

The documented `experimental.globalNotFound` convention is designed for dynamic
root layouts. Removing the throwing catch-all lets unmatched routes reach this
routing-level fallback. `app/global-not-found.tsx` renders a complete server
document with locale read from the proxy-controlled URL header, existing fonts,
SiteShell and extracted unchanged NotFoundContent. It generates a localized title
from the existing heading, plus noindex/nofollow; HTTP status stays 404. Unknown
locales fall back to English. Both first-level and deeper unmatched URLs, including
encoded Arabic locale, are covered. Public pages stay SSG; only the global 404
reads headers. Existing in-route resource/staff `notFound()` boundaries still use
their current client fallback; this change handles routing-level unmatched URLs.

The convention is experimental in installed Next 16.3.8. Keep these regressions
when upgrading Next. This is a local implementation, not hosted verification.
The public suite logs Next's `Internal: NoFallbackError` on rejected static policy
versions while returning the expected 404. The isolated production reproduction
also logs it with globalNotFound disabled; it is not introduced by this flag.

## Verification method and constraints

Tests cover response headers, fresh nonces, forged-header rejection, all initial
script nonces, zero unexpected browser CSP violations throughout existing closed
and synthetic flows, and actual blocking of parser-injected scripts, event
handlers and foreign-origin fetches. A separate local production-environment
probe stubs only the same-origin Vercel script responses: six EN/AR participant,
registration and closed-staff documents load with zero CSP/page errors; staff has
no observability scripts. No real telemetry is sent.

404 tests verify raw response HTML, status, lang/dir, heading/body, home-link
navigation and noindex with JavaScript enabled/disabled. Axe runs against the live
JS-enabled DOM; Chromium suppresses axe timers with JS disabled, so no-JS axe runs
against a diagnostic copy of that rendered DOM with scripts removed and noscript
children preserved. The actual no-JS page stays disabled for all assertions,
requests and home-link navigation. Desktop/mobile viewport settings are retained.

The standard staff runner cannot start its fixture on occupied port 3220 (an older
Next process, not owned by this task). That process is untouched. An ignored local
runner imports the unchanged staff configuration, omits its blocked HTTP fixture
and preloads the equivalent synthetic readiness response into the owned Next
process. Calls to the occupied origin are intercepted, and unexpected paths throw.
All browser UI/API fixtures and assertions remain the original suite. This is UI
evidence, not database/provider evidence. Re-run the standard config after the
owner frees 3220.

Two existing enlarged-text tests used unnonced addStyleTag; use the permitted
font-size style attribute instead. The staff axe helper waits for a nonempty MSRC
document title before auditing streamed metadata; no rule/assertion was removed.
On this Windows runner, completed Playwright runs wait for the owned web-server
process at teardown. Only the recorded process started by each run is stopped;
Playwright then writes its final counts and exits normally.

Observed commands, counts, failures and final status are recorded in the O9
progress note. Docker/Supabase checks are BLOCKED locally and unnecessary for this
header/rendering change. Hosted CI, real provider scripts/beacons, deployment,
hardware and human assistive-technology UAT are NOT TESTED.

Official references (checked against the installed 16.3.8 docs/source as well):
[Next CSP](https://nextjs.org/docs/app/guides/content-security-policy),
[Proxy](https://nextjs.org/docs/app/getting-started/proxy),
[not-found/global-not-found](https://nextjs.org/docs/app/api-reference/file-conventions/not-found).
