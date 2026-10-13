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
const rootWithText = async (): Promise<string> => {
  const dir = tmpDir("generate-modes");
  for (const o of MADE) {
    const at = path.join(dir, o.file);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    await Bun.write(at, o.text);
    fs.chmodSync(at, 0o644);
  }
  return dir;
};

const modeOf = (dir: string, file: string): number =>
  fs.statSync(path.join(dir, file)).mode & 0o777;

test("a launcher and an eval script with no `+x` get one message each, and a text file gets none", async () => {
  const found = modeProblems(await rootWithText(), MADE, "linux");
  expect(found).toHaveLength(2);
  expect(found.some((line) => line.startsWith("plugins/q/bin/tool "))).toBe(
    true,
  );
  expect(
    found.some((line) => line.startsWith("plugins/q/evals/case/setup.sh ")),
  ).toBe(true);
});

test("on Windows, the check reads `+x` from the git index, so only a program with the index mode `100644` gets a message", async () => {
  const dir = await rootWithText();
  const git = (...args: string[]): void => {
    const run = Bun.spawnSync(["git", ...args], { cwd: dir });
    if (run.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed`);
  };
  git("init", "--quiet");
  git("add", "--chmod=-x", "--", "plugins");
  git("update-index", "--chmod=+x", "--", "plugins/q/bin/tool");
  const found = modeProblems(dir, MADE, "win32");
  expect(found).toHaveLength(1);
  expect(found[0]).toStartWith("plugins/q/evals/case/setup.sh ");
});

// Windows has no POSIX mode bits, so `chmod` cannot set 755, and `modeOf` reads 644 there.
test.skipIf(process.platform === "win32")(
  "the write sets the mode 755 on a program whose text did not change",
  async () => {
    const dir = await rootWithText();
    setModes(dir, MADE);
    expect(modeOf(dir, "plugins/q/bin/tool")).toBe(0o755);
    expect(modeOf(dir, "plugins/q/evals/case/setup.sh")).toBe(0o755);
    expect(modeOf(dir, "plugins/q/skills/a/SKILL.md")).toBe(0o644);
    expect(modeProblems(dir, MADE)).toEqual([]);
  },
);
