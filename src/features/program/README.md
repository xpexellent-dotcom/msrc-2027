# Program feature boundary

PRG-01 / CMS-01..04: the Night-3 content editor supplies organizer-authored published sessions and speakers through `src/features/content`. Existing public programme, speaker cards and detail pages use that service-only projection with per-collection static fallbacks. The static catalogue remains empty until content is supplied; development fixtures are synthetic and are never seeded.

The public filters preserve authored days, Riyadh times, room, format, ordering and published speaker links. This does not add a personal schedule builder, workshop bookings or any participant workflow. See the content feature notes for caching, revalidation and the pending migration boundary.
