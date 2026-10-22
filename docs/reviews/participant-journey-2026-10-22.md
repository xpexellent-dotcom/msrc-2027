# Participant journey pre-launch review — 22 October 2026

Task E / ENG-059, on top of the ACD and B baseline `f831199`. This is local,
synthetic evidence, not launch authorization. Account, registration and email
release gates remain closed. No hosted operation, real email, commit or branch
was performed. Policies and ORG-057 email templates are unchanged.

## What was checked

Read AGENTS, PROJECT_BRIEF, the current decisions (including ORG-055/056/057),
PROGRESS and the relevant source requirements: AUTH-01–04, REG-01/02/05/07,
ACC-01, LOC-01/03 and TIM-01. Preserved the prior public-copy boundary and
ORG-053 CTA labels/routes. The current task's 44px requirement supersedes
ORG-052's smaller phone-menu rows; that reconciliation is recorded in ENG-059.

Reviewed English and Arabic/RTL in Chromium on 390px and 360px phone emulations
and desktop (1280px account/registration; 1440px public). Existing participant
tablet coverage remains. Checked normal and 200% root text size, page and card
bounds, touch targets, keyboard order/visible focus, contrast through axe,
error recovery, asynchronous pending states and repeated submission attempts.

- Home → Participate → Attend, mobile disclosure and footer links, closed
  availability and the existing sign-up destination.
- Account creation, required 18+ declaration, password requirements, validation,
  sending, accepted code request, email verification, rejected/expired codes,
  direct and reloaded verification, sign-in error/pending/success, My MSRC and
  sign-out. Recovery and password reset were included as escape routes.
- Registration identity types and formats, invalid request, sending/submitted,
  scheduled/early eligible/early ineligible/open/closed windows and limited places.
- Pending approval, waitlist, offer/countdown/deadline, approval/confirmation,
  accept/decline/cancel confirmation, pending actions, cancelled/expired outcomes,
  refresh failure/retry, missing migration, and separate daily check-in status.
- Standalone ticket issued/revoked/absent/missing-RPC, refreshing credentials and
  signed-out states; QR/reference privacy and return navigation.
- A continuous first-visitor test crosses public navigation → account creation →
  verification → explicit sign-in → registration form in each locale and size.

The existing participant config mocks `/api/participant-accounts`; the existing
registration config uses a loopback provider on 3218 with the actual Next SSR,
handlers, protected synthetic session cookie and QR generator on 3216. The bridge
test mocks account delivery and supplies that synthetic session at sign-in.
This verifies presentation and integration wiring, not native Auth/database
transactions or real inbox delivery. No test-mode setting was persisted.

## Findings and fixes

Screenshot paths below are relative to `.tools/journey-review/`, which was already
gitignored. Each `{before,after}` pair identifies both files. Representative
Arabic 360px captures are listed; sibling EN, 390px and desktop captures verify
the same states. Account baseline uses `participant-360`; the permanent final
config uses `participant-mobile-360`.
Before captures were taken when each finding was confirmed; the later outage,
throttle and enlarged-menu captures include earlier fixes from this review.

| Finding | Fix and regression evidence | Before / after screenshot paths |
| --- | --- | --- |
| Shared menu, homepage Attend card and registration FAQ always claimed registration was closed, including when the local runtime was open. | Neutral “Conference registration” menu label; removed only the static Attend badge. FAQ directs visitors to each participation page's current availability and confirmed requirements. Existing registration page remains the source of availability. Public matrix checks the expanded FAQ, neutral navigation and retained destinations. | `public/before/ar-360-menu-viewport.png` → `public/after/ar-360-menu-100.png`; `public/{before,after}/en-390-home-100.png`; `public/{before,after}/ar-360-faq-200.png` |
| Phone-menu rows were 34/36px and its action 40px. Short footer labels were only about 31–40px wide. | 44px minimum targets with native short-screen scrolling; preserved layout and approved CTA. Geometry, keyboard, Escape and axe checks cover both languages and enlarged text. | `public/before/ar-360-menu-viewport.png` → `public/after/ar-360-menu-100.png`; `public/{before,after}/en-390-participate-100.png` |
| At 200% text, fixed phone footer and menu-child columns split words internally. | Both grids use text-relative minimums: two at normal phone text and one at 200%. Tests verify phone reflow, bounds, native menu scrolling and axe in EN/AR; wide layouts retain their existing columns. | `public/{before,after}/ar-360-footer-200.png`, `public/{before,after}/en-390-footer-200.png` and `public/{before,after}/{en,ar}-360-menu-200.png` |
| The public step and request form said “Reserve your seat” before admission. | Public step and actual form now say “Request a seat” / «اطلب مقعدًا». Exact ORG-053 header/hero/Attend CTA wording stays. Public final step still promises the confirmation email/ticket without publishing internal approval details. | `public/{before,after}/en-390-registration-100.png`; `registration/{before,after}/registration-mobile-360-ar/open-few-places.png` |
| Successful sign-in retained the credential form and made onward navigation secondary. | Completed sign-in removes the form, retains the success message and provides a primary My registration link when its runtime is available, otherwise My MSRC. Verification still requires explicit sign-in. Bridge and account tests verify both branches. | `account/before/ar-participant-360-11-signed-in.png` → `account/after/ar-participant-mobile-360-11-signed-in.png`; `bridge/registration-mobile-360-ar/04-signed-in-next-action.png` |
| A successful account request followed by a failed verification-page account check left the old success message above a disabled form. | Current unavailability now takes precedence over historical success, explaining Retry while preserving the entered details and request. Eight EN/AR desktop/tablet/phone cases reproduced the defect before the fix. | `account/{before,after}/ar-participant-mobile-360-27-verification-status-unavailable.png` |
| Direct/reloaded code screens had a disabled submit without explaining how to resume. A request from the other code purpose could also appear usable. | Explain Send a new code and its required inputs; only a matching in-memory request purpose enables code submission. This is presentation gating; server checks remain unchanged. | `account/before/ar-participant-360-14-verification-direct.png` → `account/after/ar-participant-mobile-360-14-verification-direct.png` |
| Verification instructions omitted the password; rejected six-digit codes repeated a format error; sign-in throttling discussed requesting codes; an oversized password error did not explicitly say to shorten it. | Minimal EN/AR instructions distinguish required inputs, rejected codes, byte-limit recovery and generic retry waiting. Tests cover the rendered recovery action, focus, pending state and axe. | `account/before/ar-participant-360-06-verification-error.png` → `account/after/ar-participant-mobile-360-06-verification-error.png`; `account/before/ar-participant-360-22-signin-limited.png` → `account/after/ar-participant-mobile-360-22-signin-limited.png` |
| Account code and recorded check-in times lacked a timezone label; registration opening/offer/check-in times lacked direction isolation. | Riyadh labels for account and recorded check-in times, with explicit LTR `bdi` for displayed times; preserved existing LTR email/code inputs and ticket references. | `account/before/ar-participant-360-05-verification-code.png` → `account/after/ar-participant-mobile-360-05-verification-code.png`; `registration/{before,after}/registration-mobile-360-ar/offered.png` and `registration/{before,after}/registration-mobile-360-ar/attendance.png` |
| Identity rejection did not explain accepted document formats. | Show ten digits for national ID/Iqama, four–twenty Latin letters/digits for passports, and numeric keyboard for numeric IDs. Only an actually malformed number gets a field error; generic rejection cannot blame a valid number. | `registration/{before,after}/registration-mobile-360-ar/identity-invalid.png` and `registration/{before,after}/registration-mobile-360-ar/request-rejected.png` |
| A throttled registration request used the generic “Please try again” failure message. | The existing `limited` response now says to wait a moment before retrying. The test preserves document/Terms values, checks pending controls and the existing short disabled interval, then completes one retry. No rate-limit rule or duration changed. | `registration/{before,after}/registration-mobile-360-ar/request-limited.png` |
| A request rejected as closed said registration was “not open yet”, which could imply a future opening after it had ended. | Use “Registration is closed” in EN/AR. The request failure test checks the message, hidden form and axe. | Exact old response: source diff only; final `registration/after/registration-mobile-360-ar/request-closed.png` |
| An eligible early-access form displayed “Registration opens at” beside a future general-opening instant. Eligibility copy did not identify the verified-email match. | Explicit “General registration opens at” while early access is open; clarify existing verified-email/list or organizing-team eligibility. Times remain server projections, with no date defaults. | `registration/{before,after}/registration-mobile-360-ar/early-eligible.png` |
| “Few places left” implied a positive remainder, but the existing boolean also covers zero. | “Places are limited” / «المقاعد محدودة» accurately describes the existing threshold signal without exposing counts or changing allocation. | `registration/{before,after}/registration-mobile-360-ar/open-few-places.png` |
| Request completion and refresh removed the focused control; the submitted-form fallback led directly to a ticket before approval. | Focus the resolved status heading after explicit request/refresh. Fallback links to My registration. Existing action pending/idempotency behavior stays. | `registration/{before,after}/registration-mobile-360-ar/request-submitted.png` and `registration/{before,after}/registration-mobile-360-ar/status-unavailable.png` |
| Signed-out Attend offered only Sign in. | Add Create an account beside Sign in, using the existing gated route; bridge test follows it to registration. | `registration/{before,after}/registration-mobile-360-ar/signed-out.png` |

The shared account-card minimum padding is now 20px instead of scaling to 40px
at 200% text, giving narrow forms more usable width. Error-summary links also
have a 44px minimum width. Baseline and final enlarged verification captures:
`account/before/ar-participant-360-16-verification-reloaded-200.png` and
`account/after/ar-participant-mobile-360-16-verification-reloaded-200.png`.
The final Arabic 360px form has 238px-wide fields at 200% text (198px before),
with no horizontal overflow. The small Arabic error link now measures 44 × 44px
(34.66 × 44px before). Capture assertions verify scroll position zero and that
the page heading remains below the header; final images use CSS-pixel scale.

No contrast defect was found in the reviewed states. Registration Terms/Privacy
links initially looked small, but measured 44px high in the baseline; their
styling was deliberately left unchanged. Tests retain the measurement.

Three small details were found in the source review after the initial captures:
the transient submitted-form ticket link, the closed-request message and the
oversized-password instruction.
Their exact old transient/error states were not captured; the source diff is
the before evidence. Final held-response/error screenshots are
`registration/after/registration-mobile-360-ar/request-submitted-status-loading.png`,
`registration/after/registration-mobile-360-ar/request-closed.png`, and
`account/after/ar-participant-mobile-360-password-too-long-sign-up.png`.
The surrounding submitted and account error states have the before/after pairs
listed above; they are not presented as images of those exact old details.

## Evidence and deliberate boundaries

The full command results, failures retained during work, counts and final
screenshot inventory are in [the Task E receipt](../progress/2026-10-22-codex-e.md).
Raw logs, geometry JSON, screenshots and the generated evidence inventory stay
under `.tools/journey-review/`. Password/code inputs are masked in account and
bridge screenshots; document values and tickets are synthetic.

No migration, RPC signature or API response contract was added or changed.
`normalizeIdentityNumber` moved unchanged to a client-safe pure module and is
re-exported from its existing server module. Server validation, encryption,
ownership, exact-session/origin checks, rate limits, allocation and cancellation
authority remain unchanged. Existing permission/failure/concurrency regression
sources remain in place; no new database behavior requires a migration.

## Left for the owner / Claude

1. **15 November is early access, not general opening.** ORG-056 specifies
   15 November 2026 at 20:00 Riyadh for eligible participants, then 18 November
   at 20:00 for general registration. Owner-entered settings, capacity, roster
   and release evidence remain prerequisites; this review does not seed them.
2. Public opening information before sign-in is not supplied by the existing
   private registration projection. The shared shell is now neutral. A public
   settings projection/publication is a separate slice; no private membership
   or capacity data should be inferred or exposed to fill that gap.
3. Keep ORG-053's approved “Reserve your seat” and “Sign up for MSRC” labels
   unless the owner chooses different public CTA wording. Their surrounding
   journey now distinguishes requesting a seat from receiving confirmation.
4. Cancelled/expired states provide Contact organizers. This review invents no
   reapplication entitlement. Support rota and approver assignments remain
   owner decisions; contact/account/email activation is separate.
5. Review native Arabic wording, 44px menu/short-screen scrolling, and final
   screenshots. Complete actual phone/keyboard/screen-reader/inbox UAT and
   native Auth/database CI before launch. Chromium emulation, axe and 200% root
   text tests do not establish physical-device, Safari or assistive-tech behavior.
6. The 2,000-person scenario is not a load-test result. Run the separate staging/
   load rehearsal and opening-night operational checks; this task adds no live
   traffic, hosted settings, delivery or workflow activation.
