// Read approved literal content without executing server modules or resolving app aliases.
import { readFileSync } from "node:fs";
import ts from "typescript";

async function readLiteralConstant(file, name) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let initializer;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!initializer) throw new Error(`Missing approved content ${name} in ${file}`);
  const { outputText } = ts.transpileModule(`export default ${initializer.getText(source)};`, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return (await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`)).default;
}

export async function homeDisplayStrings() {
  const homepage = await readLiteralConstant("src/content/public-site.ts", "homepageCopy");
  const expectations = await readLiteralConstant("src/content/conference-expectations.ts", "conferenceExpectations");
  const narrative = await readLiteralConstant("src/content/homepage-narrative.ts", "homepageNarrative");
  const film = await readLiteralConstant("src/components/cinematic-film.tsx", "copy");
  return Object.fromEntries(["en", "ar"].map((locale) => [locale, {
    hero: homepage[locale].title,
    h2: [film[locale].title, homepage[locale].pathwaysTitle, expectations[locale].title, narrative[locale].speakersTitle, expectations[locale].historyTitle, expectations[locale].venueTitle, narrative[locale].practicalTitle, homepage[locale].endingTitle],
  }]));
}
