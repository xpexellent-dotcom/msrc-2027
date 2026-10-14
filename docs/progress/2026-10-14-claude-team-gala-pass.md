# 14 October 2026: Team page owner design pass on PR #76

- Light gala layer over the GPT team directory: drifting colour light, a pointer glow, glass cards with gradient edges, a gold segmented filter, larger type, and upright quotes (the italic font is removed).
- Mohammed Almohmadi (owner-confirmed spelling) is shown as Laura Hamadi's co-leader with his photo and LinkedIn. Photos link to LinkedIn for pointer users only. LinkedIn tracking parameters are stripped.
- Phone: names wrap between words, the co-leader box stacks, and the filter pills wrap at 320 px and 200% text.
- PASS: lint, types, 2,406 unit tests, production build, and 53/53 Team and people browser tests (desktop, tablet and mobile, EN and AR) including axe and 320 px/200% reflow.
- Header now uses the Program page anatomy (photo hero, large two-line title, lead, glass side panel) with a Founders panel on the right. It reads "Founders to be announced" until `teamFounders` in `src/content/team.ts` is filled (name, optional Arabic name, role, photo, LinkedIn). Committee filters reuse the Program day-toggle style.
- Owner correction: the co-leader stays inside Laura Hamadi's card, now placed after her quote and LinkedIn. Cards no longer stretch to the row height, so short cards have no empty space. "(Joker)" is removed and Laura's quote is capitalized.
- Owner request: masonry columns so every card is followed by the same gap (measured 24 px everywhere at 1440 px). Cards keep their natural height; reading order runs down each column.
