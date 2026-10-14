# Team page review captures — 14 October 2026

Local production build, EN/AR, original supplied portrait derivatives and current
staff roster after PR #76's restrained refinement. The shared site header/footer
remain in context. The header photo
depicts MSRC 2026. These captures are browser evidence, not production deployment
or physical-device/assistive-technology acceptance.

| Capture | Scope |
| --- | --- |
| [Desktop gallery](team-page/desktop-en.webp) | 1280px English, split Scientific/Organization and four lead portraits across |
| [Phone gallery](team-page/mobile-ar.webp) | 412px Arabic/RTL, stacked committees and two portrait columns |
| [English member popup](team-page/members-en.webp) | Native names-only Media & Design popup with English A–Z names |
| [Arabic member popup](team-page/members-ar.webp) | Supplied exact Arabic member spellings, RTL controls |

Source reconciliation and all editorial gaps:
[Team & Organization note](../features/team-organization.md).

The final local browser matrix passes **181 cases**, with no retries, across Team,
Axiom experiences, public shell and closed participant/staff/workflow regressions.
The app check passes lint, TypeScript, 2,406 unit tests and an 81-page build.
Eight final capture states at 1280/791/412/320px have no page overflow, browser
errors or external requests. Pointer entrance measures 220ms; keyboard and reduced
motion measure 0ms. The snapshots show the final visual styling; the subsequent
Safari focus correction changes interaction only.

[Interaction receipt](team-page/interaction-receipt.json) retains the independent
Chromium/WebKit observations, including the first print/Safari focus failures and
their successful final confirmations. Eight EN/AR short-screen cases at 200% text
keep the heading/Close visible while an 83-name temporary list scrolls. Touch and
pointer dismissal restore focus, page position and scrolling. Query state,
dynamic reduced motion and opaque print text pass in both engines.

The earlier 144-case result belongs to the initial `93e95fc` implementation.
`docs/PROGRESS.md` distinguishes that historical receipt from this refinement.
