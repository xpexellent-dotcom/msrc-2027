# Site speed and access verification

27 November 2026. Requirements NFR-01–03, AUTH-03/04/05/07, ROL-01/03–06/10/12,
SEC-01/02/06, PRV-02/05, LOC-01/03, ACC-01 and REL-06.

## Live baseline

The canonical public sitemap had 30 successful HTTP responses. Each carried
Vercel deployment `dpl_8XqDTvJuT5XitsntbRBfcCZm9RDj`, matched to Git commit
`4b6bff945b68688918218bab08e087a9fc1f727d`. The paced sequential requests had
a median response-header time of 136 ms and a range of 89–405 ms. This batch
measured routing and availability from one connection.

Chromium observations used three samples per route from one desktop
connection. Across the six cold documents, median response-start times
were 175–180 ms and header readiness was 558–662 ms. Warm click-to-heading
medians were 146 ms in English and 138 ms in Arabic from Home to Program,
and 26 ms in English and 33 ms in Arabic from Team to Sponsors. English
Program to Contact took 181 ms. Arabic Home to Team on an emulated phone
took 67 ms. Initial homepage transfers included the approved autoplay film.
The responsive poster appeared as two distinct requests on desktop.
Four hidden Participate links accounted for eight prefetch requests under
the measured conditions. The local candidate loaded one poster, saving about
140 KB on desktop, and requested 14 instead of 22 route-prefetch resources
on initial load. The four submenu links prefetch after the submenu opens.

A signed-in Brave session measured the live participant dashboard using
wall time from the browser automation action to the matching control.
Across three reloads, median Sign out visibility was 1.79 s and median
enablement was 5.24 s. Across three editor journeys, median time from
navigation to the editor being visible after clicking Edit profile was
3.03 s. Three live Staff Overview to Audit log transitions reached the heading
at a median of 2.33 s and enabled its search controls at a median of 4.85 s.
These measurements include browser automation overhead. The browser check
ended before any form submission or sign-out.

## Changes and the verified boundaries

| Area | Delay removed | Access behavior |
| --- | --- | --- |
| Staff console | One startup follow-up for ten shared sections. Other shared screens still use their own panel reads. | Signed one-use token, same-origin request, current session, assurance, activity expiry and role checks. The existing database reads retain their scope. |
| Competition and Research Judging staff | The entry list and settings travel in one browser response. | Both database reads retain their own authorizations. Reviewer and judge payloads retain their separate scopes. |
| My profile | Verified server render supplies the sign-out token. Announcements and bookings load independently. Edit accepts the click while authorized data loads. | Logout checks origin, signature, expiry and a one-use claim, then revokes the session. Sign-up, sign-in and recovery retain their minimum form age. Late reads cannot restore the signed-in UI during logout. |
| Site account header | The dashboard shares its authorized avatar result with the header. The header requests only the summary fields it displays. | The header still checks the session. The avatar path is same-origin. Account details stay with the owner view and private responses remain no-store. |
| Abstracts | An authorized GET reuses its first current snapshot. | Draft and finalization write paths still acquire the fresh persisted result. Owner and eligibility checks remain in place. |
| Staff workshop save | A successful write can include the freshly authorized overview. | The overview runs after the write and rechecks staff permission. A read failure remains separate from the write outcome and operation ID. |
| Public navigation and film | Hidden desktop submenu links prefetch when opened. The hero uses its existing responsive fallback image. | Keyboard and touch navigation, reduced motion, and video controls continue through their existing paths. |

Registration status, seat and offer allocation, participant certificate
freshness, and competition file transfer ordering were inspected. Their
existing sequencing maintains current state or enforces security policy.
The production-shaped synthetic tests exercised protected workflows with
isolated records.

## Controlled timing

| Journey | Before | After | Condition |
| --- | ---: | ---: | --- |
| Staff People and roles controls usable | 535.85 ms | 195.25 ms | Chromium production builds, 12 samples per build, 150 ms added to every shared staff API request |
| Staff Audit log search usable | 524.50 ms | 191.35 ms | Same synthetic delay conditions and sample count |
| My profile Sign out usable | 2,749.75 ms | 57.40 ms | Chromium production builds, eight samples per build, 350 ms announcements delay and 150 ms added per account/profile GET |
| My profile first typing | 836.05 ms | 451.50 ms | Same synthetic delay conditions and sample count |

People and roles and Audit log used three follow-up shared API requests before
and one after. The participant benchmark used an authenticated synthetic session,
waited for header hydration before navigating and timed button readiness and
editor typing. The dashboard and header now share one profile details request.

## Local verification

- `pnpm check` passed lint, type checking, 5,776 unit tests and the production build.
- The production build passed the 52 My profile, 56 organizer and workshop,
  and 106 abstracts browser cases. Two desktop-only research journeys were
  skipped in the mobile project. The targeted participant session and navigation
  run covered 14 cases. These suites exercised English and Arabic on desktop and
  mobile.
- Public navigation and media smoke coverage passed 16 browser cases. Four
  desktop-only cases were skipped in the mobile project.
- The competition staff and research judging suites passed 78 cases.
- Program and Media enlarged-text tests use independent documents. This keeps
  the strict browser error checks on each page and avoids aborting the earlier
  page's prefetch during an unrelated layout check. All 20 targeted Chromium
  and WebKit cases passed locally.
- The authenticated production observations above are the live baseline. The
  pull request carries its deployment and native integration results.
