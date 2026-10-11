// `runProgram` of `dotclaude-lab` and `dotclaude`: on Windows a `.cmd` command runs through a shell with quoted words.
// The tests set `process.platform` to `win32` for one call and give a fake runner, so no program runs.

import assert from "node:assert/strict";
import { test } from "node:test";
import { runProgram as core } from "../../plugins/dotclaude/lib/run-program.mjs";
import { runProgram as lab } from "../../plugins/dotclaude-lab/lib/run-program.mjs";

const platform = Object.getOwnPropertyDescriptor(process, "platform");
const on = (name, fn) => {
  Object.defineProperty(process, "platform", { value: name });
  try {
    return fn();
  } finally {
    Object.defineProperty(process, "platform", platform);
  }
};

test("on Windows, the lab runner quotes each word and sets `shell`", () => {
  const seen = [];
  on("win32", () =>
    lab("claude", ["plugin", "a b", "it's"], { cwd: "c" }, (...a) =>
      seen.push(a),
    ),
  );
  assert.deepEqual(seen, [
    [`"claude" "plugin" "a b" "it's"`, { cwd: "c", shell: true }],
  ]);
});

test("on Windows, an `.exe` file and any file on another platform run without a shell", () => {
  const seen = [];
  const spy = (...a) => seen.push(a);
  on("win32", () => lab("C:\\x\\claude.EXE", ["a"], {}, spy));
  on("linux", () => lab("claude", ["a b"], { cwd: "c" }, spy));
  assert.deepEqual(seen, [
    ["C:\\x\\claude.EXE", ["a"], {}],
    ["claude", ["a b"], { cwd: "c" }],
  ]);
});

test("the core runner gives the same command line on Windows", () => {
  const seen = [];
  on("win32", () =>
    core("openspec", ["config", "get"], { cwd: "." }, (...a) => seen.push(a)),
  );
  assert.deepEqual(seen, [
    ['"openspec" "config" "get"', { cwd: ".", shell: true }],
  ]);
});

const REFUSED = [
  ["%", "50% done"],
  ["!", "hi!"],
  ['"', 'say "x"'],
  ["a CR", "a\rb"],
  ["an LF", "a\nb"],
  ["a NUL", "a\0b"],
  ["a final backslash", "C:\\dir\\"],
  ["the %CMDCMDLINE% attack", "%CMDCMDLINE:~-1%&calc.exe&rem "],
];

for (const [name, runProgram] of [
  ["lab", lab],
  ["core", core],
]) {
  for (const [what, word] of REFUSED)
    test(`on Windows, the ${name} runner refuses a word with ${what} and runs nothing`, () => {
      const seen = [];
      assert.throws(
        () =>
          on("win32", () =>
            runProgram("claude", ["-p", word], {}, (...a) => seen.push(a)),
          ),
        (err) =>
          err.message.includes(JSON.stringify(word)) &&
          err.message.includes("refused, because"),
      );
      assert.deepEqual(seen, []);
    });

  test(`on Windows, the ${name} runner still runs a safe word`, () => {
    const seen = [];
    on("win32", () =>
      runProgram("claude", ["-p", "Reply with OK."], {}, (...a) =>
        seen.push(a),
      ),
    );
    assert.equal(seen.length, 1);
    assert.equal(seen[0][0], '"claude" "-p" "Reply with OK."');
  });

  test(`on another platform, the ${name} runner does not check the words`, () => {
    const seen = [];
    on("linux", () =>
      runProgram("claude", ["50%"], {}, (...a) => seen.push(a)),
    );
    assert.deepEqual(seen, [["claude", ["50%"], {}]]);
  });
}
