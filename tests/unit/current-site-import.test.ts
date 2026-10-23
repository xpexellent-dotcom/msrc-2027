import { describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { editionMedia } from "@/content/edition-media";
import { teamCommittees, type TeamPerson } from "@/content/team";
import { contentPublishIssue, decodeContentFields } from "@/features/staff-portal/content-contract";
import { currentSiteImportManifest } from "@/features/staff-portal/current-site-import";
import { createCurrentSiteImporter, type ImportContext } from "@/features/staff-portal/current-site-import.server";
import { decodePublishedContent } from "@/features/content/published";
import { publishedTeamRoster } from "@/features/content/team-roster";
import { StaffRpcMissingError } from "@/features/staff-portal/backend.server";
import { processMedia } from "@/features/staff-portal/media-processing.server";
import type { StaffConfig } from "@/features/staff-portal/config.server";

const id = (n: number) => `39000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
describe("current approved site import", () => {
  it.each(currentSiteImportManifest().media)("accepts the checked-in source $sourceKey through the existing canonical pipeline", async (item) => {
    const processed = await processMedia(await readFile(join(process.cwd(), "public", item.path)));
    expect(processed.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(processed.variants.map((variant) => variant.suffix)).toEqual(["", ".640", ".1280", ".1920"]);
    expect(processed.width).toBeLessThanOrEqual(2560); expect(processed.height).toBeLessThanOrEqual(2560);
  });
  it("maps every archive item in order with paired text, focal points and static film sources", async () => {
    const { media } = currentSiteImportManifest(), archive = media.filter((item) => item.fields.editionYear !== null);
    expect(archive).toHaveLength(editionMedia.length);
    for (const [index, source] of editionMedia.entries()) {
      const item = archive[index];
      expect(item.sourceKey).toBe(source.slug);
      expect(item.fields).toMatchObject({ altEn: source.title, altAr: source.titleAr, captionEn: source.description,
        captionAr: source.descriptionAr, editionYear: source.edition, displayOrder: index, rightsConfirmed: true,
        videoPath: source.poster ? source.asset : null, kind: source.poster ? "film" : "photograph" });
      expect(`${item.fields.focalX}% ${item.fields.focalY}%`).toBe(source.objectPosition ?? "50% 50%");
      expect(item.fields.rightsEvidence).toContain("13 and 23 October 2026");
      expect((await readFile(join(process.cwd(), "public", item.path))).length).toBeGreaterThan(0);
    }
  });
  it("imports every roster person/photo and passes existing bilingual publication gates", async () => {
    const manifest = currentSiteImportManifest();
    const people: TeamPerson[] = teamCommittees.flatMap((committee) => [committee.lead, ...committee.leads.flatMap((person) => [person, ...person.coLeads ?? []])]);
    expect(manifest.content).toHaveLength(people.length);
    for (const person of people) {
      const item = manifest.content.find((item) => item.sourceKey === `team-${person.slug}`)!;
      expect(item.fields.nameEn).toBe(person.name.en); expect(item.fields.nameAr).toBe(person.name.ar);
      expect(decodeContentFields(item.fields)).toEqual(item.fields);
      expect(contentPublishIssue("team", item.fields)).toBeNull();
      expect(item.photoSourceKey).toBe(person.photo ? `team-${person.slug}` : null);
      if (person.photo) expect((await readFile(join(process.cwd(), "public", person.photo))).length).toBeGreaterThan(0);
    }
    expect(manifest.content.filter((item) => item.collection === "partners")).toHaveLength(0);
    const published = decodePublishedContent({ items: manifest.content.map((item, index) => ({ id: id(index + 1), collection: "team", version: 2,
      fields: item.fields, media: item.photoSourceKey ? { path: `edition/${id(index + 1)}/image.webp`, altEn: item.fields.nameEn, altAr: item.fields.nameAr, width: 400, height: 400, focalX: 50, focalY: 50 } : null })) }, "team", "https://example.invalid")!;
    expect(published).not.toBeNull();
    const roster = publishedTeamRoster(published)!;
    expect(roster.map((group) => ({ id: group.id, leads: group.leads.length, head: group.lead.name })))
      .toEqual(teamCommittees.map((group) => ({ id: group.id, leads: group.leads.length, head: group.lead.name })));
    for (const committee of teamCommittees) for (const person of committee.leads) {
      const imported = roster.find((group) => group.id === committee.id)!.leads.find((item) => item.slug === person.slug)!;
      expect(imported.description).toEqual(person.description); expect(imported.profile).toEqual(person.profile);
      expect(imported.coLeads?.map((item) => item.name) ?? []).toEqual(person.coLeads?.map((item) => item.name) ?? []);
      expect(imported.members).toEqual(person.members ?? []); expect(imported.noMembers).toBe(person.noMembers ?? false);
    }
  });
  it("accepts migration null defaults and rejects malformed or unpaired layout metadata", () => {
    const fields = currentSiteImportManifest().content[0].fields;
    expect(decodeContentFields({ ...fields, teamLayout: null })?.teamLayout).toBeUndefined();
    for (const teamLayout of [{ ...fields.teamLayout, unknown: true }, { ...fields.teamLayout, kind: "co-lead", parentSlug: null },
      { ...fields.teamLayout, members: [{ nameEn: "One", nameAr: "" }] }, { ...fields.teamLayout, slug: "../escape" }]) {
      expect(decodeContentFields({ ...fields, teamLayout })).toBeNull();
    }
  });
  function fixture() {
    const manifest = currentSiteImportManifest(), sources = new Map<string, string>(), content = new Set<string>(); let sequence = 0;
    const reserved = new Map<string, string>();
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (name === "msrc_staff_media_import_reserve") {
        if (sources.has(String(args.source_key))) return { state: "duplicate", assetId: sources.get(String(args.source_key)), sourceExisting: true };
        const importId = id(++sequence); reserved.set(importId, String(args.source_key));
        return { state: "reserved", importId, storagePath: `edition/${importId}/image.webp`, publicPath: `edition/${importId}/published/image.webp` };
      }
      if (name === "msrc_staff_media_import_finish") { const assetId = id(++sequence); sources.set(reserved.get(String(args.import_id))!, assetId); return { state: "created", assetId }; }
      const items = args.items as { sourceKey: string; fields: Record<string, unknown> }[];
      let created = 0;
      for (const item of items) { if (!content.has(item.sourceKey)) created++; content.add(item.sourceKey); }
      return { state: "ready", created, existing: items.length - created };
    });
    const write = vi.fn(async () => {}), remove = vi.fn(async () => {});
    const context = { config: { editionKey: "edition" } as StaffConfig, backend: { rpc }, storage: { write, remove }, claims: { sub: id(900) }, accessToken: "verified-native" } as unknown as ImportContext;
    const process = vi.fn(async () => ({ sha256: "a".repeat(64), size: 3, width: 4, height: 3, mime: "image/webp" as const,
      variants: ["", ".640", ".1280", ".1920"].map((suffix) => ({ suffix, bytes: Buffer.from("webp") })) }));
    const read = vi.fn(async () => Buffer.from("image"));
    return { manifest, rpc, write, remove, context, read, process, importer: createCurrentSiteImporter({ read, process }) };
  }
  it("reruns without storage writes or new records, and links imported photos before atomic content publication", async () => {
    const f = fixture();
    expect(await f.importer(f.context)).toEqual({ state: "ready", summary: { mediaCreated: f.manifest.media.length, mediaExisting: 0, contentCreated: f.manifest.content.length, contentExisting: 0 } });
    expect(f.write).toHaveBeenCalledTimes(f.manifest.media.length * 8);
    const contentCall = f.rpc.mock.calls.find(([name]) => name === "msrc_staff_content_import")!;
    expect(contentCall[1].media_sources).toEqual(f.manifest.media.map((item) => item.sourceKey));
    expect(contentCall[1].items).toEqual(f.manifest.content.map((item) => expect.objectContaining({ sourceKey: item.sourceKey,
      fields: expect.objectContaining({ assetId: item.photoSourceKey ? expect.stringMatching(/^3900/) : null }) })));
    f.write.mockClear();
    expect(await f.importer(f.context)).toEqual({ state: "ready", summary: { mediaCreated: 0, mediaExisting: f.manifest.media.length, contentCreated: 0, contentExisting: f.manifest.content.length } });
    expect(f.write).not.toHaveBeenCalled();
  });
  it("never uploads or publishes content after a denied, busy or malformed reservation", async () => {
    for (const reply of [{ state: "denied" }, { state: "busy" }, { state: "reserved", importId: id(1), storagePath: "../bad", publicPath: "../bad" }, { state: "duplicate", assetId: "bad" }]) {
      const f = fixture(); f.rpc.mockResolvedValueOnce(reply);
      expect((await f.importer(f.context)).state).toBe(["denied", "busy"].includes(reply.state) ? reply.state : "unavailable");
      expect(f.write).not.toHaveBeenCalled(); expect(f.rpc).toHaveBeenCalledTimes(1);
    }
  });
  it("preserves missing-RPC errors and durable reservations after ambiguous storage/finish failure", async () => {
    const f = fixture(); f.rpc.mockRejectedValueOnce(new StaffRpcMissingError());
    await expect(f.importer(f.context)).rejects.toBeInstanceOf(StaffRpcMissingError);
    const g = fixture(); g.write.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(g.importer(g.context)).rejects.toThrow("storage unavailable");
    expect(g.rpc).toHaveBeenCalledTimes(1);
    const h = fixture(); h.rpc.mockImplementationOnce(async () => ({ state: "reserved", importId: id(1), storagePath: `edition/${id(1)}/image.webp`, publicPath: `edition/${id(1)}/published/image.webp` })).mockResolvedValueOnce({ state: "denied" });
    expect(await h.importer(h.context)).toEqual({ state: "denied" });
    expect(h.rpc.mock.calls.some(([name]) => name === "msrc_staff_content_import")).toBe(false);
  });
  it("cleans only unused reservation files when an ordinary upload wins SHA dedupe", async () => {
    const f = fixture(), source = f.manifest.media[0], importId = id(100);
    f.rpc.mockResolvedValueOnce({ state: "reserved", importId, storagePath: `edition/${importId}/image.webp`, publicPath: `edition/${importId}/published/image.webp` })
      .mockResolvedValueOnce({ state: "duplicate", assetId: id(101), unusedUpload: true, asset: { ...source.fields, state: "published" } }).mockResolvedValueOnce({ state: "ready", created: 0, existing: 0 });
    const importer = createCurrentSiteImporter({ manifest: () => ({ media: [source], content: [] }), read: f.read, process: f.process });
    expect(await importer(f.context)).toEqual({ state: "ready", summary: { mediaCreated: 0, mediaExisting: 1, contentCreated: 0, contentExisting: 0 } });
    expect(f.remove.mock.calls).toEqual([
      ["msrc-media-drafts", ["", ".640", ".1280", ".1920"].map((suffix) => `edition/${importId}/image${suffix}.webp`)],
      ["msrc-published-media", ["", ".640", ".1280", ".1920"].map((suffix) => `edition/${importId}/published/image${suffix}.webp`)],
    ]);
  });
  it("refuses an unmatched incumbent SHA collision without overwriting metadata or publishing a partial archive", async () => {
    for (const asset of [undefined, { ...currentSiteImportManifest().media[0].fields, editionYear: null, state: "published" }]) {
      const f = fixture(); f.rpc.mockResolvedValueOnce({ state: "duplicate", assetId: id(999), sourceExisting: false, asset });
      expect(await f.importer(f.context)).toEqual({ state: "conflict" });
      expect(f.write).not.toHaveBeenCalled(); expect(f.rpc).toHaveBeenCalledTimes(1);
    }
  });
});
