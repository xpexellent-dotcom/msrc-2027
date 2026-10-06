import { readFileSync } from "node:fs";

export type SourceBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export function visibleMarkdown(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

/** Independent, deliberately narrow reader for the two approved source files.
 * Unknown block syntax fails rather than silently dropping an approved clause.
 */
export function readApprovedPolicy(kind: "privacy" | "terms") {
  const source = readFileSync(new URL(`../docs/policies/${kind === "privacy" ? "privacy-policy" : "terms"}-v1.0.en.md`, import.meta.url), "utf8");
  const lines = source.replace(/\r\n/g, "\n").trim().split("\n");
  const title = lines.shift()!.replace(/^# /, "");
  const versionLine = lines.shift() === "" ? lines.shift()! : "";
  if (!versionLine.startsWith("**Version 1.0** · Effective from the date")) throw new Error("Unexpected approved version header");
  const intro: string[] = [];
  const sections: { title: string; blocks: SourceBlock[] }[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    if (line.startsWith("## ")) { sections.push({ title: line.slice(3), blocks: [] }); index++; continue; }
    if (line.startsWith("#") || line.startsWith("```")) throw new Error(`Unsupported approved source syntax: ${line}`);
    const section = sections.at(-1);
    if (line.startsWith("|")) {
      if (!section) throw new Error("Table outside approved policy section");
      const cells = (row: string) => row.slice(1, -1).split("|").map((cell) => cell.trim());
      const headers = cells(line);
      if (!/^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[index + 1])) throw new Error("Malformed approved table separator");
      index += 2;
      const rows: string[][] = [];
      while (lines[index]?.startsWith("|")) {
        const row = cells(lines[index++]);
        if (row.length !== headers.length) throw new Error("Malformed approved table row");
        rows.push(row);
      }
      section.blocks.push({ type: "table", headers, rows });
    } else if (/^(?:- |\d+\. )/.test(line)) {
      if (!section) throw new Error("List outside approved policy section");
      const ordered = /^\d+\. /.test(line), items: string[] = [];
      while (lines[index] && (ordered ? /^\d+\. / : /^- /).test(lines[index])) items.push(lines[index++].replace(/^(?:- |\d+\. )/, ""));
      section.blocks.push({ type: "list", ordered, items });
    } else {
      const paragraph: string[] = [];
      while (lines[index]?.trim() && !/^(?:## |\||- |\d+\. )/.test(lines[index])) paragraph.push(lines[index++]);
      if (!paragraph.length) throw new Error("Unsupported approved source block");
      const text = paragraph.join("\n");
      if (section) section.blocks.push({ type: "paragraph", text });
      else intro.push(text);
    }
  }
  return { title, intro, sections, source };
}

export function sourceBlockText(block: SourceBlock): string[] {
  if (block.type === "paragraph") return [visibleMarkdown(block.text)];
  if (block.type === "list") return block.items.map(visibleMarkdown);
  return [...block.headers, ...block.rows.flat()].map(visibleMarkdown);
}
