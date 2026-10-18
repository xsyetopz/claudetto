// Behavior of the part rules of `just validate`: the pins of D40, and the short files and thin folders of D41.

import { expect, test } from "bun:test";
import {
  overPins,
  partLines,
  shortFiles,
  thinFolders,
} from "../../tools/parts.ts";

const SLICE = "src/plugins/claudetto/slices/guard";

test("the lines of a part are the sum of its `.ts` files, and tests and other files are out", () => {
  const lines: Record<string, number> = {
    [`${SLICE}/a.ts`]: 20,
    [`${SLICE}/domain/b.ts`]: 30,
    [`${SLICE}/a.test.ts`]: 99,
    [`${SLICE}/prompts/x.md`]: 99,
    "src/kernel/k.ts": 40,
    "src/plugins/claudetto/plugin.ts": 8,
  };
  const sum = partLines(Object.keys(lines), (f) => lines[f] as number);
  expect(sum).toEqual({ [SLICE]: 50, "src/kernel": 40 });
});

test("a part over its pin fails, a part at its pin passes, and a part with no pin fails", () => {
  expect(overPins({ a: 10, b: 11, c: 5 }, { a: 10, b: 10 })).toEqual([
    "b: 11 lines, over its pin of 10",
    "c: 5 lines and no pin in `tools/limits.ts`",
  ]);
});

test("a code file under 15 lines fails unless it is an entry point or allowed", () => {
  const lines: Record<string, number> = {
    [`${SLICE}/slice.ts`]: 4,
    [`${SLICE}/limits.ts`]: 4,
    [`${SLICE}/adapters/mod.ts`]: 4,
    "src/plugins/claudetto/plugin.ts": 4,
    [`${SLICE}/tiny.ts`]: 14,
    [`${SLICE}/old.ts`]: 5,
    [`${SLICE}/ok.ts`]: 15,
  };
  const files = Object.keys(lines);
  expect(
    shortFiles(files, (f) => lines[f] as number, [`${SLICE}/old.ts`]),
  ).toEqual([`${SLICE}/tiny.ts: 14 lines, under 15`]);
});

test("an allowed short file that grew is reported as stale", () => {
  const f = `${SLICE}/old.ts`;
  expect(shortFiles([f], () => 20, [f])).toEqual([
    `${f}: allowed in \`tools/limits.ts\` but no longer a short file`,
  ]);
});

test("a `domain/`, `adapters/`, or `prompts/` folder with one file fails unless allowed", () => {
  const files = [
    `${SLICE}/domain/a.ts`,
    `${SLICE}/adapters/a.ts`,
    `${SLICE}/adapters/b.ts`,
    `${SLICE}/prompts/p.md`,
    "src/kernel/domain/x.ts",
  ];
  expect(thinFolders(files, [`${SLICE}/prompts`])).toEqual([
    `${SLICE}/domain: a folder with one file`,
    "src/kernel/domain: a folder with one file",
  ]);
  expect(thinFolders(files.slice(0, 3), [`${SLICE}/gone`])).toEqual([
    `${SLICE}/domain: a folder with one file`,
    `${SLICE}/gone: allowed in \`tools/limits.ts\` but no longer a thin folder`,
  ]);
});
