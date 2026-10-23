import { editionMedia } from "../../content/edition-media.ts";
import { teamCommittees, type TeamPerson } from "../../content/team.ts";
import { emptyContentFields, type ContentFields } from "./content-contract.ts";

/** ORG-060: existing approved site sources only, never inferred people or sponsors. */
export const ARCHIVE_RIGHTS = "Archive photographs supplied by the organizers, who confirmed the photographers' consent on 13 and 23 October 2026; approved existing MSRC public archive use.";
export const TEAM_RIGHTS = "ORG-050: names, roles, descriptions, profile links and photographs submitted by each person for the existing MSRC 2027 team page; approved existing public team-page use.";
export type SiteMediaImport = {
  sourceKey: string; path: string; fields: {
    altEn: string; altAr: string; captionEn: string; captionAr: string; creditEn: string; creditAr: string;
    focalX: number; focalY: number; rightsConfirmed: boolean; rightsEvidence: string;
    editionYear: number | null; kind: "photograph" | "film"; displayOrder: number;
    videoPath: string | null; sourceSlug: string | null; durationSeconds: number | null;
  };
};
export type SiteContentImport = { sourceKey: string; collection: "team" | "partners"; photoSourceKey: string | null; fields: ContentFields };
export function currentSiteImportManifest(): { media: SiteMediaImport[]; content: SiteContentImport[] } {
  const media: SiteMediaImport[] = editionMedia.map((item, displayOrder) => {
    const [focalX, focalY] = (item.objectPosition ?? "50% 50%").split(" ").map(parseFloat);
    return { sourceKey: item.slug, path: item.poster ?? item.asset!, fields: {
      altEn: item.title, altAr: item.titleAr!, captionEn: item.description, captionAr: item.descriptionAr!,
      creditEn: "", creditAr: "", focalX, focalY, rightsConfirmed: true, rightsEvidence: ARCHIVE_RIGHTS,
      editionYear: item.edition!, kind: item.kind === "photograph" ? "photograph" : "film", displayOrder,
      videoPath: item.poster ? item.asset : null, sourceSlug: item.slug, durationSeconds: item.durationSeconds,
    } };
  });
  const content: SiteContentImport[] = [];
  for (const committee of teamCommittees) {
    function person(item: TeamPerson, kind: "head" | "lead" | "co-lead", parentSlug: string | null) {
      const photoSourceKey = item.photo ? `team-${item.slug}` : null;
      if (item.photo) media.push({ sourceKey: photoSourceKey!, path: item.photo, fields: {
        altEn: item.name.en, altAr: item.name.ar, captionEn: item.role.en, captionAr: item.role.ar,
        creditEn: "", creditAr: "", focalX: 50, focalY: 50, rightsConfirmed: true, rightsEvidence: TEAM_RIGHTS,
        editionYear: null, kind: "photograph", displayOrder: content.length, videoPath: null, sourceSlug: null, durationSeconds: null,
      } });
      content.push({ sourceKey: `team-${item.slug}`, collection: "team", photoSourceKey, fields: {
        ...emptyContentFields(), nameEn: item.name.en, nameAr: item.name.ar, titleEn: item.role.en, titleAr: item.role.ar,
        descriptionEn: item.description?.en ?? "", descriptionAr: item.description?.ar ?? "", url: item.profile ?? "",
        groupEn: committee.title.en, groupAr: committee.title.ar, sortOrder: content.length,
        teamLayout: { slug: item.slug, committee: committee.id, kind, parentSlug, noMembers: item.noMembers ?? false,
          members: (item.members ?? []).map((member) => ({ nameEn: member.en, nameAr: member.ar })) },
      } });
      for (const coLead of item.coLeads ?? []) person(coLead, "co-lead", item.slug);
    }
    person(committee.lead, "head", null);
    for (const lead of committee.leads) person(lead, "lead", null);
  }
  // Sponsors currently render neutral Brand slots, not approved partner records.
  return { media, content };
}
