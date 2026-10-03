# Organizer content intake

`MSRC2027-website-content-template.xlsx` is the workbook organizers fill in with speakers,
sessions and workshops for the public catalogue (CMS-03, PRG-01, WKS-01). It has a
bilingual "How to fill this in" sheet, then one sheet each for Speakers, Sessions and
Workshops. Row 1 holds the headings, row 2 marks each column Required or Optional,
row 3 explains what to write and row 4 is a yellow example row that the checker ignores.

The columns come from `PublicSpeaker`, `PublicSession` and `PublicWorkshop` in
`src/content/conference-experiences.ts`. The template and the checker share one column
list in `scripts/content-intake.ts`, so they cannot drift apart.

```bash
pnpm content:template
pnpm content:check path/to/returned.xlsx --out records.json
```

`content:template` regenerates the committed workbook; a unit test fails if the committed
file differs from the generated one. `content:check` prints a plain-language report,
grouped into problems that block the import and things to double-check. It exits with
status 1 when anything blocks the import and only then skips writing `--out`.

The checker never edits `src/content/conference-catalogue.server.ts`. Moving checked
records into the catalogue remains a reviewed change, and only records the committee
marked Approved are published.

Conversions the checker applies:

- Times are 24-hour Riyadh wall-clock times; they become UTC instants (Riyadh is UTC+3
  with no daylight saving). Session dates come from the chosen conference day.
- A photo file name becomes `/media/speakers/<file name>`. Photos arrive as separate
  files and still need media approval before they are added under `public/`.
- Speaker links must be `https://` addresses.

Open points for organizer review: the Arabic wording on the instructions sheet, and the
`/media/speakers/` location for approved portraits.
