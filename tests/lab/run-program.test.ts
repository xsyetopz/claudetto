// `runProgram` of `dotclaude-lab` and `dotclaude`: on Windows a `.cmd` command runs through a shell with quoted words.
// The tests set `process.platform` to `win32` for one call and give a fake runner, so no program runs.

import { expect, test } from "bun:test";
import { runProgram as core } from "../../plugins/dotclaude/lib/run-program.ts";
import {
  runProgram as lab,
  type Spawn,
} from "../../plugins/dotclaude-lab/lib/run-program.ts";

const platform = Object.getOwnPropertyDescriptor(
  process,
  "platform",
) as PropertyDescriptor;
const on = (name: string, fn: () => unknown) => {
  Object.defineProperty(process, "platform", { value: name });
  try {
    return fn();
  } finally {
    Object.defineProperty(process, "platform", platform);
  }
};

/** A fake `Spawn` that records each call in `seen` and runs no program. */
function fakeSpawn(seen: unknown[][]): Spawn {
  return (...a) => {
    seen.push(a);
    return null;
  };
}

/** A fake `Bun.spawnSync` that records each call in `seen` and runs no program. */
function fakeSpawnSync(seen: unknown[][]): typeof Bun.spawnSync {
  return ((...a: unknown[]) => {
    seen.push(a);
    return null;
  }) as unknown as typeof Bun.spawnSync;
}

test("on Windows, the lab runner quotes each word and runs the line through `ComSpec` with `/d /s /c`", () => {
  const seen: unknown[][] = [];
  on("win32", () =>
    lab("claude", ["plugin", "a b", "it's"], { cwd: "c" }, fakeSpawn(seen)),
  );
  expect(seen).toStrictEqual([
    [
      process.env["ComSpec"] || "cmd.exe",
      ["/d", "/s", "/c", `"claude" "plugin" "a b" "it's"`],
      { cwd: "c" },
    ],
  ]);
});

test("on Windows, an `.exe` file and any file on another platform run without a shell", () => {
  const seen: unknown[][] = [];
  on("win32", () => lab("C:\\x\\claude.EXE", ["a"], {}, fakeSpawn(seen)));
  on("linux", () => lab("claude", ["a b"], { cwd: "c" }, fakeSpawn(seen)));
  expect(seen).toStrictEqual([
    ["C:\\x\\claude.EXE", ["a"], {}],
    ["claude", ["a b"], { cwd: "c" }],
  ]);
});

test("the core runner gives the same command line on Windows, as one argument vector", () => {
  const seen: unknown[][] = [];
  on("win32", () =>
    core("openspec", ["config", "get"], { cwd: "." }, fakeSpawnSync(seen)),
  );
  expect(seen).toStrictEqual([
    [
      [
        process.env["ComSpec"] || "cmd.exe",
        "/d",
        "/s",
        "/c",
        '"openspec" "config" "get"',
      ],
      { cwd: "." },
    ],
  ]);
});

const REFUSED: [string, string][] = [
  ["%", "50% done"],
  ["!", "hi!"],
  ['"', 'say "x"'],
  ["a CR", "a\rb"],
  ["an LF", "a\nb"],
  ["a NUL", "a\0b"],
  ["a final backslash", "C:\\dir\\"],
  ["the %CMDCMDLINE% attack", "%CMDCMDLINE:~-1%&calc.exe&rem "],
];

// Each runner takes the words and the list that records its spawn calls.
// The lab runner gives its spawn the file, the arguments, and the options, and the core runner gives one argument vector and the options.
// Both end the vector with the command line on Windows.
const RUNNERS: {
  name: string;
  run: (args: string[], seen: unknown[][]) => unknown;
  commandLine: (call: unknown[]) => unknown;
  plain: unknown[][];
}[] = [
  {
    name: "lab",
    run: (args, seen) => lab("claude", args, {}, fakeSpawn(seen)),
    commandLine: (call) => (call[1] as string[]).at(-1),
    plain: [["claude", ["50%"], {}]],
  },
  {
    name: "core",
    run: (args, seen) => core("claude", args, {}, fakeSpawnSync(seen)),
    commandLine: (call) => (call[0] as string[]).at(-1),
    plain: [[["claude", "50%"], {}]],
  },
];

for (const { name, run, commandLine, plain } of RUNNERS) {
  for (const [what, word] of REFUSED)
    test(`on Windows, the ${name} runner refuses a word with ${what} and runs nothing`, () => {
      const seen: unknown[][] = [];
      expect(() => on("win32", () => run(["-p", word], seen))).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(JSON.stringify(word)),
        }),
      );
      expect(seen).toStrictEqual([]);
    });

  test(`on Windows, the ${name} runner still runs a safe word`, () => {
    const seen: unknown[][] = [];
    on("win32", () => run(["-p", "Reply with OK."], seen));
    expect(seen.length).toBe(1);
    expect(commandLine(seen[0] as unknown[])).toBe(
      '"claude" "-p" "Reply with OK."',
    );
  });

  test(`on another platform, the ${name} runner does not check the words`, () => {
    const seen: unknown[][] = [];
    on("linux", () => run(["50%"], seen));
    expect(seen).toStrictEqual(plain);
  });
}
