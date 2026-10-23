import { readFileSync } from "node:fs";
import sharp from "sharp";
import { expect, it } from "vitest";
import { participantEmailBanner } from "@/lib/email/participant-message.server";
import { announcementCopy } from "@/features/announcements/staff-copy";

it("keeps the placeholder at the single email URL, exact dimensions and site purple", async () => {
  const banner = sharp("public/brand/email-banner.png");
  const metadata = await banner.metadata();
  expect(metadata).toMatchObject({ width: 600, height: 338, format: "png" });
  const pixel = await banner.extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  const purple = readFileSync("src/styles/tokens.css", "utf8").match(/--color-purple:\s*#([a-f0-9]{6})/i)![1];
  expect(pixel.toString("hex")).toBe(purple);
  expect(participantEmailBanner.alt).toBe("MSRC 2027");
  expect(participantEmailBanner.src).toMatch(/\/brand\/email-banner.png$/);
});

it("explains that the verified audience includes accounts without registration in both locales", () => {
  expect(announcementCopy.en.segments.verified_participants).toBe("All verified accounts");
  expect(announcementCopy.en.audienceHint).toContain("even without conference registration");
  expect(announcementCopy.ar.segments.verified_participants).toContain("الحسابات");
  expect(announcementCopy.ar.audienceHint).toContain("حتى من لم يسجّلوا في المؤتمر");
});
