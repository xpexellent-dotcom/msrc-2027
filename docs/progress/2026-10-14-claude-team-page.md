# 14 October 2026 — Team page roster (ORG-050)

- Replaced the eight anonymous Team placeholders with the organizer roster in layout A: two conference leaders, then one row per lead (Scientific 9, Organizing 10) with a members box that reads "to be announced" until members are supplied.
- Data lives in `src/content/team.ts`; styles in `src/styles/team.css`. Eight self-supplied portraits are metadata-free 640×800 derivatives (MEDIA_REGISTER §10); others show initials. Photos link to the person's LinkedIn for pointer users; the visible "LinkedIn" text link is the single keyboard stop.
- Arabic names, role labels and description translations are drafts for organizer review.
- PASS: lint, types, 2,402 unit tests, production build; local EN/AR desktop and phone screenshots with no horizontal overflow. No flags, database or hosting changes.
