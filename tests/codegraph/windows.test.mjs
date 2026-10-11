// The Windows path of the codegraph hooks, with `process.platform` set to `win32` for one call.
// A shell that runs a `.cmd` file gives exit status 1 for a missing program, so the hook looks on `PATH` first.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  findOnPath,
  sessionStart,
} from "../../plugins/dotclaude-codegraph/features/graph/cli.mjs";
import { tmpDir } from "../support/repo.mjs";

const platform = Object.getOwnPropertyDescriptor(process, "platform");
const onWindows = (fn) => {
  Object.defineProperty(process, "platform", { value: "win32" });
  try {
    return fn();
  } finally {
    Object.defineProperty(process, "platform", platform);
  }
};

function project() {
  const dir = tmpDir("codegraph-win");
  fs.mkdirSync(path.join(dir, "bin"));
  fs.mkdirSync(path.join(dir, "project", ".codegraph"), { recursive: true });
  fs.writeFileSync(path.join(dir, "project", ".codegraph", "codegraph.db"), "");
  return dir;
}

test("with no codegraph on PATH, session start adds nothing on Windows", () => {
  const dir = project();
  const env = { Path: path.join(dir, "bin"), PATHEXT: ".EXE;.CMD" };
  const out = onWindows(() =>
    sessionStart({ cwd: path.join(dir, "project") }, env),
  );
  assert.equal(out, undefined);
});

test("`findOnPath` tries each extension of PATHEXT in each folder of PATH, and reads `Path` without case", () => {
  const dir = project();
  const bin = path.join(dir, "bin");
  fs.writeFileSync(path.join(bin, "codegraph.CMD"), "");
  const env = {
    Path: ["missing", bin].join(path.delimiter),
    PATHEXT: ".EXE;.CMD",
  };
  assert.equal(findOnPath("codegraph", env), path.join(bin, "codegraph.CMD"));
  assert.equal(findOnPath("other", env), undefined);
});

test("on Windows, a call that fails or times out in `run-tree.mjs` is not a missing CLI, so session start still adds its line", () => {
  const dir = project();
  const bin = path.join(dir, "bin");
  fs.writeFileSync(path.join(bin, "codegraph.CMD"), "");
  const env = { Path: bin, PATHEXT: ".EXE;.CMD" };
  const out = onWindows(() =>
    sessionStart({ cwd: path.join(dir, "project") }, env),
  );
  // The `.CMD` file is empty and the node child cannot run it as a program, so the call fails and adds the line:
  // only an `ENOENT` hides the line, and a failed call is not one.
  assert.equal(out.hookSpecificOutput.hookEventName, "SessionStart");
});
