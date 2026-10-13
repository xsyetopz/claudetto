// The `ci` recipe runs the same gate as `check`, except the type check, which CI skips on purpose.
// The steps are the words after the colon of each recipe line.

import { expect, test } from "bun:test";
import path from "node:path";
import { REPO } from "../support/repo.ts";

const JUSTFILE = await Bun.file(path.join(REPO, "justfile")).text();

/** The steps of a recipe line, where a step with arguments, such as `(generate "--check")`, is one step. */
const steps = (recipe: string): string[] => {
  const line = JUSTFILE.split("\n").find((l) => l.startsWith(`${recipe}:`));
  if (line === undefined)
    throw new Error(`the justfile has no \`${recipe}\` recipe`);
  return line.slice(recipe.length + 1).match(/\([^)]*\)|\S+/g) ?? [];
};

test("`ci` runs each step of `check` except the type check", () => {
  expect(steps("ci")).toEqual(steps("check").filter((s) => s !== "typecheck"));
});

test("`ci` runs the generated-file check", () => {
  expect(steps("ci")).toContain('(generate "--check")');
});
