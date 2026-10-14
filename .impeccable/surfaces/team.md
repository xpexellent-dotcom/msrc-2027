---
version: 1
slug: team
primary_target: "src/app/[locale]/(preview)/team/page.tsx"
related_targets: ["src/features/team/team-page.tsx", "src/features/team/committee-view.ts", "src/styles/team-directory.css", "src/styles/team-gala.css", "src/content/team.ts"]
---

# Team & Organization

Mode: Experience. ENG-042 supplies the staff roster; ORG-050 and later owner
corrections govern this surface. Preserve the shared shell, Program-style
historical photo header and Founders panel (pending until names are supplied),
Manrope headings/names, upright Inter quotes, Noto Sans Arabic interface and
existing ivory/purple/lilac/gold tokens.

Keep equal desktop committee halves, two lead columns each (four across overall),
with prominent proportional conference leaders around 200–240px wide. The owner
selected equal-gap masonry: A–Z reads down each column, then across. Single-view
desktop uses four columns; tablet uses three and phones normally two, with
enlarged-text reflow. Keep original photographs filling 4:5 white/purple-bordered
frames, a restrained curved-corner detail and soft lilac pending surfaces.

Retain Laura Hamadi's co-leader Mohammed Almohmadi, including his photo/profile,
inside her card after her quote and profile. Mohammad Alsayegh's title is
Scientific Officer. Source quotes use literal double quotation marks and upright
type; supplied English names/quotes keep English/LTR semantics. Exact supplied
Arabic member names appear on the Arabic route in English A–Z source order.

Refine with static ivory and white cards, quiet borders and readable role labels.
No drifting orbs, cursor glow, glass blur, gradient edges or card lift. Existing
portrait reveals and fine-pointer 2%/180ms photo hover provide restrained feedback.
Keep committee selection in the URL and local lazy portraits with automatic
image sizing and capped fallbacks; no runtime Drive/Sheet requests.

Keep **View team** as the native modal: 220ms pointer entrance, 160ms exit, instant
keyboard/reduced-motion paths, focus containment, Escape/backdrop dismissal and
return focus. Fixed gutters and container-aware heading layout keep heading/Close
outside the scrolling names list. Only while open, the Team-page effect locks
background scrolling and restores previous styles afterward. Normal page flow
stays native. No replacement faces or invented source content.

Scope and receipts: `docs/features/team-organization.md`. The initial source audit
and 144-case receipt belong to `93e95fc`; the current 181-case browser receipt and
independent Chromium/WebKit checks are recorded separately in the feature note.
