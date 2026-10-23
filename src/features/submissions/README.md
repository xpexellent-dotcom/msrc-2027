# Closed abstract submission workspace

Night-3 Task 5 implements `/en/abstracts` and `/ar/abstracts`, with participant-session-authenticated server-only RPC access, saved drafts, live ABS-04 body counts, explicit preview/finalize, independent author roles and an immutable finalized view. Scientific content remains English/LTR within translated chrome. The My MSRC link requires the private `ABSTRACT_SUBMISSIONS_ENABLED` runtime gate, which remains unset.

No file input, storage write, real email or hosted activation is added. The confidential ethics/similarity evidence and virus-scanning gate blocks finalization until separately approved. Staff scientific settings have no seeded dates, specialties, types or rubric. Missing RPCs show `area-not-ready` and preserve sign-in.

See `docs/features/ABSTRACT_REVIEW.md` and the task receipt for requirements, pending migrations and verification. Browser tests use an isolated loopback synthetic provider; they do not prove database enforcement.
