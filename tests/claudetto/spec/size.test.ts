// MiniSpec only shrinks: the lines and bytes of its code, presets, and skills stay at or under the bounds of `limits.ts`.
// A change that needs more lowers no bound and adds a behavior that the plan names (`0-3-0`, D10).

import { expect, test } from "bun:test";
import path from "node:path";
import {
  CODE_BYTES_MAX,
  CODE_LINES_MAX,
  PRESET_BYTES_MAX,
  SKILL_BYTES_MAX,
} from "../../../plugins/claudetto/slices/spec/limits.ts";
import { REPO } from "../../support/repo.ts";

const PLUGIN = path.join(REPO, "plugins/claudetto");

/** The text of each file that matches `pattern` under `dir`, except `limits.ts`, which holds the bounds. */
const texts = async (dir: string, pattern: string): Promise<string[]> =>
  Promise.all(
    [...new Bun.Glob(pattern).scanSync({ cwd: dir })]
      .filter((f) => f !== "limits.ts")
      .map((f) => Bun.file(path.join(dir, f)).text()),
  );

const bytes = (parts: readonly string[]): number =>
  parts.reduce((n, t) => n + Buffer.byteLength(t), 0);

const code = [
  ...(await texts(path.join(PLUGIN, "slices/spec"), "**/*.ts")),
  ...(await texts(path.join(PLUGIN, "bin"), "minispec")),
];

test("the lines of the code of MiniSpec stay under `CODE_LINES_MAX`", () => {
  const lines = code.reduce((n, t) => n + t.split("\n").length - 1, 0);
  expect(lines).toBeLessThanOrEqual(CODE_LINES_MAX);
});

test("the bytes of the code of MiniSpec stay under `CODE_BYTES_MAX`", () => {
  expect(bytes(code)).toBeLessThanOrEqual(CODE_BYTES_MAX);
});

test("the bytes of the presets stay under `PRESET_BYTES_MAX`", async () => {
  const presets = await texts(path.join(PLUGIN, "slices/spec/presets"), "**/*");
  expect(bytes(presets)).toBeLessThanOrEqual(PRESET_BYTES_MAX);
});

test("the bytes of the four skills stay under `SKILL_BYTES_MAX`", async () => {
  const skills = await Promise.all(
    ["propose", "apply", "verify", "archive"].map((s) =>
      Bun.file(path.join(PLUGIN, `skills/${s}/SKILL.md`)).text(),
    ),
  );
  expect(bytes(skills)).toBeLessThanOrEqual(SKILL_BYTES_MAX);
});
