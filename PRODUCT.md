# MSRC 2027

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Public visitors and prospective participants: understand the conference, compare
participation pathways, and find accurate practical information. This priority was
confirmed in the preceding design review. Organizers and scientific staff have
separate restricted workflows outside this public visual redesign.

## Product Purpose

The website for the fifth Medical Students Research Conference at King Abdulaziz
University, Jeddah. The current request is a full public visual overhaul combining
the preceding accessibility and interaction improvements, delivered as a working
demo for the requester's approval. The requester delegates creative direction.

## Operating Context

Existing Next.js App Router, TypeScript and pnpm application, managed Vercel and
Supabase infrastructure. Current local baseline is main 340e36d plus the preceding
design engineering changes. This record does not establish deployment readiness.
Authority remains current organizer decisions, specification, then summaries.

## Capabilities and Constraints

- Preserve approved public copy, native navigation, programme/media filters and
  their URL/hydration behavior. No invented speakers, sessions, sponsor marks,
  attendance figures, prizes, prices, opening times or service availability.
- Dates: 27–28 January 2027 (ORG-001). Venue: King Faisal Conference Center,
  King Abdulaziz University, Jeddah (ORG-031). Separate workflow windows are unset.
- Keep operational release gates closed; public browsing stays open. Design
  approval does not authorize deployment, database changes or communications.
- Preserve published Privacy/Terms verbatim and private organizer boundaries.
- No full-site search, personal schedule, public abstract/attendee directory,
  third-party video embeds or gallery downloads.

## Brand Commitments

MSRC 2027, KAU and Jeddah remain the identity. Carry forward the recognizable
purple/gold family and cleared previous-edition film. The requester now authorizes
substantial layout, visual and interaction changes, beyond the earlier polish-only
scope. ENG-023 extends the preceding Axiom composition through the latest pinned
Vitarc, Cerebrium, GM Studios and Reach references: expansive film, large type at
the reading margin, a slim capsule header, a rising ivory content sheet, restrained
scientific artwork and native horizontal browsing. Sponsors have a dedicated
page; speaker and team previews use anonymous shapes and pending names. The
finished demo is the approval point; it is not a live release.

## Evidence on Hand

Current bilingual content, docs/PROJECT_BRIEF.md, docs/DECISIONS.md, the product
specification and docs/MEDIA_REGISTER.md. Only the approved MSRC2026 homepage
montage and its two responsive posters are cleared real conference media.
Previous poster/video provenance must remain clear; no fictional event photography.
The supplied MSRC 2026 Drive collection and licensed Jeddah Corniche footage are
also authorized for the requested local demo, with sources recorded in
docs/media/axiom-demo-assets.md. They are not promoted to production media.
ENG-023 replaces photographic speaker/team previews with anonymous portrait
shapes and names or sessions to be announced, and removes repeated public demo
disclaimers. Neutral Brand slots remain on the dedicated Sponsors page; no 2027
roster, roster capacity, approved tier or sponsor affiliation is inferred.
The supplied PDF grounds historical attendance across the four preceding
editions, not unique people. Its selected history photographs, an actual venue
image from KAU, and generated decorative scientific artwork and grain are recorded
in docs/media/editorial-revision-assets.md. Generated material is neither a
medical diagram nor factual event/venue photography. The closing-video
replacement now uses the user-supplied Drive source's first 23 seconds, with the
configured excerpt and poster matching the media receipt. This resolves the
earlier download blocker; local edit authorization does not establish public
reuse clearance for the source footage.

## Product Principles

1. Make approved information immediately understandable.
2. Keep participation states honest and distinct.
3. Give English and Arabic equal completeness and craft.
4. Preserve privacy and human authority over operations.
5. Verify the finished demo before presenting it for approval.

## Accessibility & Inclusion

Target WCAG2.2 AA, native scrolling, visible keyboard focus, reduced-motion support,
44px touch targets, enlarged text and robust responsive layouts. Public interfaces
are EN/AR with full RTL; scientific content stays English/LTR. Keep the accessible
background film control, deliberate cinema mode and preference-aware poster fallback.

## Team page scope — 14 October 2026

ENG-042 supplies the public staff roster and portrait sources for `/team`,
superseding the older anonymous-team preview direction only on that page.
Speaker/sponsor placeholders retain their existing scope. Match the site's
photo-header format using the supplied historical MSRC 2026 auditorium image,
then an ivory split-committee gallery with four portraits across desktop,
proportional conference leaders, italic source quotes and an animated names-only
member popup. Existing tokens, self-hosted fonts, native scrolling, EN/AR interface,
RTL and closed operational boundaries stay authoritative. Source reconciliation,
missing photographs and provisional English member spellings are explicit in
`docs/features/team-organization.md`. Deliver a review PR; do not merge or deploy.
