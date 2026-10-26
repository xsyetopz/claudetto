// Tests of the `styles` slice: the output style that the settings snippet selects, and the name in the front matter of that style.

import { expect, test } from "bun:test";
import path from "node:path";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import { REPO } from "../../support/repo.ts";

const STYLE = path.join(REPO, "plugins/claudetto/output-styles/Concise.md");

const frontMatterName = (text: string): string | undefined =>
  text
    .split("\n---")[0]
    ?.split("\n")
    .find((line) => line.startsWith("name:"))
    ?.slice("name:".length)
    .trim();

test("the settings snippet selects the `Concise` style", () => {
  expect(SNIPPET.outputStyle).toBe("claudetto:Concise");
});

test("the style file has the name that the settings snippet selects", async () => {
  const name = frontMatterName(await Bun.file(STYLE).text());
  expect(name).toBe("Concise");
  expect(SNIPPET.outputStyle).toBe(`claudetto:${name}`);
});

// On the lean prompt the key does nothing (`research/text-audit.md`, C6), so the style leaves it out.
test("the style has no `keep-coding-instructions` key", async () => {
  const front = (await Bun.file(STYLE).text()).split("\n---")[0] ?? "";
  expect(front).not.toContain("keep-coding-instructions");
});
