// `runProgram` of the kernel on Windows: a name that `PATH` gives as an `.exe` file runs with no shell, and any other name runs through `cmd.exe`.
// The tests set `process.platform` to `win32` for one call and give a fake spawn and a fake lookup, so no program runs.

import { expect, test } from "bun:test";
import { runProgram } from "../../src/kernel/node/process.ts";

const platform = Object.getOwnPropertyDescriptor(
  process,
  "platform",
) as PropertyDescriptor;
const onWindows = (fn: () => unknown) => {
  Object.defineProperty(process, "platform", { value: "win32" });
  try {
    return fn();
  } finally {
    Object.defineProperty(process, "platform", platform);
  }
};

/** A fake spawn that records each call in `seen` and runs no program. */
const fakeSpawn = (seen: unknown[][]) =>
  ((...a: unknown[]) => {
    seen.push(a);
    return {};
  }) as unknown as typeof Bun.spawnSync;

const QUOTED = `bun -e 'console.log("two  spaces")'`;

test('on Windows, a name that `PATH` gives as an `.exe` file runs with no shell, also with a `"` in a word', () => {
  const seen: unknown[][] = [];
  const sh = "C:\\Git\\usr\\bin\\sh.exe";
  onWindows(() =>
    runProgram("sh", ["-c", QUOTED], { cwd: "c" }, fakeSpawn(seen), () => sh),
  );
  expect(seen).toStrictEqual([[[sh, "-c", QUOTED], { cwd: "c" }]]);
});

test('on Windows, a name that `PATH` gives as a `.cmd` file runs through `cmd.exe` and still refuses a `"`', () => {
  const seen: unknown[][] = [];
  const find = () => "C:\\npm\\claude.cmd";
  onWindows(() =>
    runProgram("claude", ["-p", "ok"], {}, fakeSpawn(seen), find),
  );
  const [call] = seen as [[string[], unknown]];
  expect(seen).toHaveLength(1);
  expect(call[0].slice(1)).toStrictEqual([
    "/d",
    "/s",
    "/c",
    `""claude" "-p" "ok""`,
  ]);
  expect(() =>
    onWindows(() =>
      runProgram("claude", ["-p", 'say "x"'], {}, fakeSpawn(seen), find),
    ),
  ).toThrow('"say \\"x\\""');
  expect(seen).toHaveLength(1);
});

test("on Windows, a name that `PATH` does not give throws, and nothing runs", () => {
  const seen: unknown[][] = [];
  expect(() =>
    onWindows(() => runProgram("nope", [], {}, fakeSpawn(seen), () => null)),
  ).toThrow("Cannot find nope on PATH.");
  expect(seen).toStrictEqual([]);
});
