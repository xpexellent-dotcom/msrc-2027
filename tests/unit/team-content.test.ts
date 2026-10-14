import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { teamCommittees, teamCopy, type TeamPerson } from "@/content/team";

const people = teamCommittees.flatMap((committee) => [committee.leader, ...committee.leads]);
const find = (id: string): TeamPerson => {
  const person = people.find((entry) => entry.id === id);
  expect(person, `The appointed ${id} is represented once`).toBeDefined();
  return person!;
};

describe("organizer-supplied team content (SCP-02, CMS-04, LOC-01/03, MED-01/04)", () => {
  it("preserves the two leaders, each appointed lead and the explicit mixed-role assignment", () => {
    expect(teamCommittees.map((committee) => committee.id)).toEqual(["scientific", "organization"]);
    expect(teamCommittees.map((committee) => committee.leader.name)).toEqual(["Abdulrahman Ismail Maqbool", "Fatima Salem Alfrhah"]);
    expect(teamCommittees.map((committee) => committee.leads.length)).toEqual([9, 10]);
    expect(people).toHaveLength(21);
    expect(new Set(people.map((person) => person.id)).size).toBe(21);
    expect(new Set(people.map((person) => person.name)).size).toBe(21);
    const organization = teamCommittees.find((committee) => committee.id === "organization")!;
    for (const id of ["hanadi-orayf", "areen-youssef", "lara-qawas"]) {
      expect(organization.leads.some((person) => person.id === id)).toBe(true);
      expect(teamCommittees.find((committee) => committee.id === "scientific")!.leads.some((person) => person.id === id)).toBe(false);
    }
    for (const committee of teamCommittees) {
      const names = committee.leads.map((person) => person.name);
      expect(names).toEqual([...names].sort((first, second) => first.localeCompare(second, "en", { sensitivity: "base" })));
      expect(committee.leader.headRole?.en).toMatch(/^Head of /);
      expect(committee.leader.headRole?.ar).toMatch(/اللجنة/);
    }
  });

  it("keeps the confirmed co-leader distinct from unrelated unassigned Sheet entries", () => {
    expect(find("laura-hamadi").coLeaders).toEqual([{ name: "Mohammed Almohmadi", profile: "https://www.linkedin.com/in/mohammed-almohmadi-80a5293a8", portrait: { src: "/media/team/mohammed-almohmadi.webp", width: 640, height: 800 } }]);
    expect(find("hanadi-orayf").members).toEqual([
      { name: "Fatima Alshuqayfi", arName: "فاطمه الشقيفي" },
      { name: "Rama Alghamdi", arName: "رامه الغامدي" },
      { name: "Tamara Alsindi", arName: "تمارا السندي" },
    ]);
    const names = people.flatMap((person) => [person.name, ...(person.coLeaders ?? []).map((entry) => entry.name), ...(person.members ?? []).map((entry) => entry.name)]);
    expect(names).toHaveLength(25);
    expect(new Set(names).size).toBe(25);
    expect(names).not.toContain("Lama Mastour Alsulami");
    expect(people.filter((person) => person.members?.length)).toHaveLength(1);
    expect(people.filter((person) => person.coLeaders?.length)).toHaveLength(1);
    expect(find("areen-youssef")).not.toHaveProperty("description");
    expect(find("areen-youssef")).not.toHaveProperty("profile");
  });

  it("preserves the refreshed quote, public profile allowlist and bilingual role labels", () => {
    expect(find("akram-awan").description).toBe("The numbers are being difficult");
    expect(find("akram-awan").profile).toBe("https://www.linkedin.com/in/akram-awan-233a7b2bb/");
    expect(find("mohammad-alsayegh").role.en).toBe("Scientific Officer (Joker)");
    expect(find("amal-sayqal").role.en).toBe("3MT Lead");
    for (const person of people) {
      expect(person.name.trim()).toBe(person.name);
      expect(person.role.en).toMatch(/\S/);
      expect(person.role.ar).toMatch(/[\u0600-\u06ff]/);
      if (person.profile) {
        const profile = new URL(person.profile);
        expect(profile.protocol).toBe("https:");
        expect(profile.hostname).toBe("www.linkedin.com");
        expect(profile.pathname).toMatch(/^\/in\//);
        expect(profile.username).toBe("");
        expect(profile.password).toBe("");
      }
    }
    expect(Object.keys(teamCopy.en).sort()).toEqual(Object.keys(teamCopy.ar).sort());
    for (const text of Object.values(teamCopy.en)) expect(text).toMatch(/\S/);
    for (const text of Object.values(teamCopy.ar)) expect(text).toMatch(/[\u0600-\u06ff]/);
  });

  it("ships twelve local image assets and preserves nine honest missing portraits", () => {
    const portraits = people.flatMap((person) => person.portrait ? [person.portrait] : []);
    expect(portraits).toHaveLength(12);
    expect(people.filter((person) => !person.portrait)).toHaveLength(9);
    expect(new Set(portraits.map((portrait) => portrait.src)).size).toBe(12);
    for (const portrait of portraits) {
      expect(portrait.src).toMatch(/^\/media\/team\/[a-z0-9-]+\.webp$/);
      expect(portrait.width).toBeGreaterThan(0);
      expect(portrait.height).toBeGreaterThan(0);
      const path = resolve("public", portrait.src.slice(1));
      expect(existsSync(path), `${portrait.src} exists in the public asset set`).toBe(true);
      const file = readFileSync(path);
      expect(file.toString("ascii", 0, 4)).toBe("RIFF");
      expect(file.toString("ascii", 8, 12)).toBe("WEBP");
    }
    // The public catalogue contains asset paths, never Drive download receipts.
    expect(JSON.stringify(teamCommittees)).not.toMatch(/drive\.google|googleusercontent|signed|access_token/i);
  });
});
