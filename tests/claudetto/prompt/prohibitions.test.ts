// No text that a plugin sends to Claude has a prohibition list: a paragraph with three or more sentences that start with `Do not`, `Never`, or `Avoid` (task 21.5, `prompt-audit.md:100`).
// A list can stay only when its failure reproduces on the target model, and then `Prohibition-Lists` names its file under "Kept Prohibition Lists".

import { expect, test } from "bun:test";
import path from "node:path";

const ROOT = path.join(import.meta.dir, "../../..");
const PAGE = path.join(
  ROOT,
  "src/wiki/claudetto/evidence/Prohibition-Lists.md",
);
const HEADS = ["Do not ", "Don't ", "Never ", "Avoid "];
const MIN_RUN = 3;

/** The sentences of a paragraph, one for each line, with a list mark removed. */
const sentences = (paragraph: string): string[] =>
  paragraph.split("\n").map((line) => line.trim().replace(/^[-*]\s+/, ""));

const isProhibition = (sentence: string): boolean =>
  HEADS.some((head) => sentence.startsWith(head));

/** The `.md` files under `src/plugins/`, relative to the root. */
const texts = (): string[] =>
  [...new Bun.Glob("**/*.md").scanSync(path.join(ROOT, "src/plugins"))]
    .map((f) => `src/plugins/${f}`)
    .sort();

/** The files with a paragraph that has `MIN_RUN` or more prohibitions. */
const found = async (): Promise<string[]> => {
  const hits: string[] = [];
  for (const f of texts()) {
    const text = await Bun.file(path.join(ROOT, f)).text();
    const paragraphs = text.split(/\n\s*\n/);
    if (
      paragraphs.some(
        (p) => sentences(p).filter(isProhibition).length >= MIN_RUN,
      )
    )
      hits.push(f);
  }
  return hits;
};

/** The files that the page names under "Kept Prohibition Lists". */
const kept = async (): Promise<string[]> => {
  const page = await Bun.file(PAGE).text();
  const start = page.indexOf("## Kept Prohibition Lists");
  expect(start).toBeGreaterThan(-1);
  const end = page.indexOf("\n## ", start + 1);
  return page
    .slice(start, end < 0 ? undefined : end)
    .split("\n")
    .filter((line) => line.startsWith("- `"))
    .map((line) => line.slice(3, line.indexOf("`", 3)));
};

test("the prompts with a prohibition list are the ones that `Prohibition-Lists` keeps", async () => {
  expect(await found()).toStrictEqual(await kept());
});

test("a paragraph with three prohibitions counts as a list", () => {
  const text = "- Do not a.\n- Never b.\n- Avoid c.";
  expect(sentences(text).filter(isProhibition).length).toBe(MIN_RUN);
});
