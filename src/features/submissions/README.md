# Closed abstract submission workspace

ENG-088 / ORG-068 make `/en/abstracts` and `/ar/abstracts` public Research competition pages. The private workspace lives at `/{locale}/abstracts/submit`, with participant-session-authenticated server-only RPC access, one draft and one final submission chance, six sections, 350 words including headings, a 20-word title, profile-derived presenter, private supervisor contacts and an immutable finalized view. Scientific content remains English/LTR within translated chrome. The private `ABSTRACT_SUBMISSIONS_ENABLED` runtime gate remains unset.

No file input, storage write, real email or hosted activation is added. The confidential ethics/similarity evidence and virus-scanning gate blocks finalization until separately approved. Staff scientific settings have no seeded dates, specialties, types or rubric. Missing RPCs show `area-not-ready` and preserve sign-in.

See `docs/features/abstract-submissions.md` and `docs/progress/2026-10-29-codex-abstract-page.md` for the current scope, review-only migration and verification. The earlier `ABSTRACT_REVIEW.md` remains historical review-module context. Browser tests use an isolated loopback synthetic provider; they do not prove database enforcement.
