// Each slice states its rung of the decision ladder in one line of its `slice.ts` (design D2).
// The test reads the text, so a removed line fails here and not only in the type check.
// The formatter can move a long value to the next line, so the value can follow a line break.

import { expect, test } from "bun:test";
import path from "node:path";
import { RUNGS } from "../../src/kernel/slice.ts";

const ROOT = path.join(import.meta.dir, "..", "..");
const LINE = new RegExp(`^  ladder:\\s+"(${RUNGS.join("|")}): \\S.*",$`, "gm");

const sources = (): string[] =>
  Array.from(
    new Bun.Glob("src/plugins/*/slices/*/slice.ts").scanSync({ cwd: ROOT }),
  ).sort();

/** The files of `files` with no ladder line, or with more than one. */
const missing = (files: Readonly<Record<string, string>>): string[] =>
  Object.entries(files)
    .filter(([, text]) => (text.match(LINE) ?? []).length !== 1)
    .map(([file]) => file);

test("each slice has one ladder line with a rung and a reason", async () => {
  const files: Record<string, string> = {};
  for (const file of sources())
    files[file] = await Bun.file(path.join(ROOT, file)).text();
  expect(Object.keys(files).length).toBeGreaterThan(0);
  expect(missing(files)).toStrictEqual([]);
});

test("a slice with its ladder line removed fails", async () => {
  const [file] = sources();
  if (!file) throw new Error("no slice");
  const text = await Bun.file(path.join(ROOT, file)).text();
  const removed = text.replace(LINE, "");
  expect(missing({ [file]: removed })).toStrictEqual([file]);
});

test("a ladder line with an unknown rung or no reason fails", () => {
  expect(
    missing({
      a: '  name: "a",\n  ladder: "hook: a reason",\n',
      b: '  name: "b",\n  ladder: "mod: ",\n',
    }),
  ).toStrictEqual(["a", "b"]);
});
