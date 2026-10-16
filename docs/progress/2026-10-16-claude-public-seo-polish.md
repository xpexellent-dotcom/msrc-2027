# 16 October 2026 — Public SEO and title polish (plan §8)

- Policy tab titles no longer repeat the brand: "Privacy Policy | MSRC 2027" instead of "MSRC 2027 Privacy Policy | MSRC 2027" (EN and AR). Only the brand is removed from the approved heading for the tab; the published heading and policy text are unchanged.
- Dated policy versions (`/privacy/v1.0`, `/terms/v1.0`) repeat the current text, so they now point their canonical and hreflang links at the unversioned page and are never indexed. They still load normally.
- Arabic staff pages now have an Arabic tab title ("MSRC 2027 | بوابة الفريق").
- Dates & venue search description shortened from 189 to under 160 characters by dropping the "times will be announced" sentence (EN and AR); the page text is unchanged.
- Investigated, not fixed: unmatched URLs return Next's client-rendered error shell (`<html id="__next_error__">`, no lang/dir; content appears after JavaScript). Reproduced locally on 16.3.8. Making the `[...path]` catch-all static sends unmatched paths to Next's bare default 404 instead, so it was reverted. Needs a dedicated follow-up.
- PASS (Node 24.21.0): ESLint 0 warnings, typecheck, 2,403 unit tests, build 81/81, Chromium desktop policies + dates-venue e2e 12 passed. One policy-link test failed with `chrome-error://chromewebdata/` while another local run held port 3210; re-run pending.
- NOT TESTED locally: staff e2e suites (title assertions updated to follow page language); CI covers them.
