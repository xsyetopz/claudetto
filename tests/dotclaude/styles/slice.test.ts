// Tests of the `styles` slice: the output style that the settings snippet selects, and the name in the front matter of that style.

import { expect, test } from "bun:test";
import path from "node:path";
import { slice } from "../../../src/plugins/dotclaude/slices/styles/slice.ts";
import { REPO } from "../../support/repo.ts";

const STYLE = path.join(
  REPO,
  "src/plugins/dotclaude/slices/styles/styles/Concise.md",
);

const frontMatterName = (text: string): string | undefined =>
  text
    .split("\n---")[0]
    ?.split("\n")
    .find((line) => line.startsWith("name:"))
    ?.slice("name:".length)
    .trim();

test("the settings snippet selects the style of the slice", () => {
  expect(slice.settings).toEqual({ outputStyle: "dotclaude:Concise" });
});

test("the slice ships the style file whose name is the style name", async () => {
  expect(slice.outputStyles).toEqual(["Concise"]);
  const name = frontMatterName(await Bun.file(STYLE).text());
  expect(name).toBe("Concise");
  expect(slice.settings).toEqual({ outputStyle: `dotclaude:${name}` });
});
