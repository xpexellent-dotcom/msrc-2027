# Official brand components

ORG-072 adopts the owner-supplied MSRC 2027 identity for the public homepage and
shared header/footer. The official on-purple logo is referenced by `brandLogo`
in `src/content/brand-identity.ts`. Use it only on solid Royal Purple, preserve
its proportions, allow clear space of about one-third of its height, and never
recolour or shadow it. Its opaque R counter remains an acknowledged export
artefact pending a corrected owner source.

`BrandIcon` renders the supplied full-colour WebP icons without recolouring.
Its physical 2% image shift centres the lilac disc and does not mirror in Arabic.
The homepage uses ten approved identity icons; the remaining source assets stay
untouched.

`Sparkle` is the shared decorative gold star. Each section has at most one heading
sparkle and one content sparkle. The preview belt separators and one sparkle per
anonymous speaker card are the documented exceptions. All decorative artwork is
hidden from assistive technology.

`FlowRibbon` supplies small inline SVG bookends, mirrored in RTL and hidden in
film mode, forced colours and print. The existing `flow-lines.tsx` component
remains available to its incumbent pages; the homepage uses `AmbientArtwork`'s
separate `flow` variant instead.

These visual components do not open operational workflows or approve unpublished
sponsors, people or social URLs. See ORG-072, ENG-094 and
`docs/features/homepage-v2.md` for the implementation boundary.
