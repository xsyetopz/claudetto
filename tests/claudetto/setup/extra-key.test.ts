// Each key of the settings snippet has a source: the `Lever` of a `disable` row of the replace matrix, or a decision of the design of `0-3-0` or `release-0-3-0-alpha-2` (spec `settings-levers`, "Extra Key").
// The files are found by glob, so the test also reads them after the change goes to `openspec/changes/archive/`.

import { expect, test } from "bun:test";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import { REPO } from "../../support/repo.ts";
import { snippetLevers } from "../../support/settings-pin.ts";

/** The text of the one file of `change` that matches `name`. */
const changeFile = async (name: string, change = "0-3-0"): Promise<string> => {
  const [file] = [
    ...new Bun.Glob(`openspec/changes/**/*${change}/${name}`).scanSync(REPO),
  ];
  if (!file) throw new Error(`No file ${name} of change ${change}.`);
  return Bun.file(`${REPO}/${file}`).text();
};

/** The code items of `text`: the words in single backticks, and each name before `=` or `:` in them. */
const codeItems = (text: string): Set<string> =>
  new Set(
    [...text.matchAll(/`([^`]+)`/g)].flatMap(([, item = ""]) => [
      item,
      item.split(/[=:]/)[0]?.trim() ?? "",
    ]),
  );

/** The `Lever` cells of the matrix rows with the decision `disable` or `replace and disable`. */
const levers = (matrix: string): string =>
  matrix
    .split("\n")
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) =>
      ["disable", "replace and disable"].includes(cells[3] ?? ""),
    )
    .map((cells) => cells[4])
    .join("\n");

/** The names that the snippet writes. */
const names = (): string[] => Object.keys(snippetLevers(SNIPPET));

/** The names in `list` that `sources` does not name. */
const extra = (list: string[], sources: Set<string>): string[] =>
  list.filter(
    (name) =>
      !sources.has(name) && !sources.has(name.replace(/^permissions\./, "")),
  );

const sources = codeItems(
  [
    levers(await changeFile("research/replace-matrix.md")),
    await changeFile("design.md"),
    await changeFile("design.md", "release-0-3-0-alpha-2"),
  ].join("\n"),
);

test("each key of the snippet has a row of the matrix or a decision of the design", () => {
  expect(extra(names(), sources)).toStrictEqual([]);
});

test("a key with no source fails and is named", () => {
  expect(extra([...names(), "CLAUDE_CODE_EXTRA_KEY"], sources)).toStrictEqual([
    "CLAUDE_CODE_EXTRA_KEY",
  ]);
});
