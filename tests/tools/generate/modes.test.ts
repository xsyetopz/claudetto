// The file mode of the generated programs (`tools/generate/modes.ts`).

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { Output } from "../../../tools/generate/emit/texts.ts";
import { modeProblems, setModes } from "../../../tools/generate/modes.ts";
import { tmpDir } from "../../support/repo.ts";

const out = (file: string): Output => ({ file, text: "x\n", source: "src/x" });
const MADE = [
  out("plugins/q/bin/tool"),
  out("plugins/q/evals/case/setup.sh"),
  out("plugins/q/skills/a/SKILL.md"),
];

/** A root that holds each file of `MADE` with the mode 644. */
const rootWithText = (): string => {
  const dir = tmpDir("generate-modes");
  for (const o of MADE) {
    const at = path.join(dir, o.file);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, o.text);
    fs.chmodSync(at, 0o644);
  }
  return dir;
};

const modeOf = (dir: string, file: string): number =>
  fs.statSync(path.join(dir, file)).mode & 0o777;

test("a launcher and an eval script with no `+x` get one message each, and a text file gets none", () => {
  const found = modeProblems(rootWithText(), MADE);
  expect(found).toHaveLength(2);
  expect(found.some((line) => line.startsWith("plugins/q/bin/tool "))).toBe(
    true,
  );
  expect(
    found.some((line) => line.startsWith("plugins/q/evals/case/setup.sh ")),
  ).toBe(true);
});

test("the write sets the mode 755 on a program whose text did not change", () => {
  const dir = rootWithText();
  setModes(dir, MADE);
  expect(modeOf(dir, "plugins/q/bin/tool")).toBe(0o755);
  expect(modeOf(dir, "plugins/q/evals/case/setup.sh")).toBe(0o755);
  expect(modeOf(dir, "plugins/q/skills/a/SKILL.md")).toBe(0o644);
  expect(modeProblems(dir, MADE)).toEqual([]);
});
