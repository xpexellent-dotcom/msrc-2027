import type { TeamCommittee, TeamPerson } from "@/content/team";
import type { PublishedContent } from "./published";

/** Imported roster uses the incumbent components and sorting, including shared rows. */
export function publishedTeamRoster(items: readonly PublishedContent[]): TeamCommittee[] | null {
  if (!items.length || items.some((item) => item.collection !== "team" || !item.fields.teamLayout)) return null;
  const people = new Map<string, TeamPerson>(), rows = new Map(items.map((item) => [item.fields.teamLayout!.slug, item]));
  if (rows.size !== items.length) return null;
  for (const item of items) {
    const f = item.fields, layout = f.teamLayout!;
    people.set(layout.slug, { slug: layout.slug, name: { en: f.nameEn, ar: f.nameAr }, role: { en: f.titleEn, ar: f.titleAr },
      ...(f.descriptionEn ? { description: { en: f.descriptionEn, ar: f.descriptionAr } } : {}),
      ...(f.url ? { profile: f.url } : {}), ...(item.media ? { photo: item.media.src, publishedPhoto: true } : {}),
      noMembers: layout.noMembers, members: layout.members.map((member) => ({ en: member.nameEn, ar: member.nameAr })) });
  }
  const committees: TeamCommittee[] = [];
  for (const id of ["scientific", "organization"] as const) {
    const group = items.filter((item) => item.fields.teamLayout!.committee === id), heads = group.filter((item) => item.fields.teamLayout!.kind === "head");
    if (heads.length > 1) return null;
    if (!heads.length) { if (group.length) return null; continue; }
    for (const item of group.filter((item) => item.fields.teamLayout!.kind === "co-lead")) {
      const parent = rows.get(item.fields.teamLayout!.parentSlug!);
      if (!parent || parent.fields.teamLayout!.committee !== id || parent.fields.teamLayout!.kind !== "lead") return null;
      const person = people.get(parent.fields.teamLayout!.slug)!;
      person.coLeads = [...person.coLeads ?? [], people.get(item.fields.teamLayout!.slug)!];
    }
    committees.push({ id, title: { en: heads[0].fields.groupEn, ar: heads[0].fields.groupAr }, lead: people.get(heads[0].fields.teamLayout!.slug)!,
      leads: group.filter((item) => item.fields.teamLayout!.kind === "lead").map((item) => people.get(item.fields.teamLayout!.slug)!) });
  }
  return committees.length ? committees : null;
}
