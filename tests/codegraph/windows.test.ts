// The Windows path of the codegraph hooks, with `process.platform` set to `win32` for one call.
// A shell that runs a `.cmd` file gives exit status 1 for a missing program, so the hook looks on `PATH` first.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { findOnPath } from "../../plugins/dotclaude-codegraph/slices/graph/adapters/codegraph.ts";
import { sessionStart } from "../../plugins/dotclaude-codegraph/slices/graph/adapters/hook.ts";
import { tmpDir } from "../support/repo.ts";

const platform = Object.getOwnPropertyDescriptor(process, "platform");
const onWindows = <T>(fn: () => T): T => {
  Object.defineProperty(process, "platform", { value: "win32" });
  try {
    return fn();
  } finally {
    Object.defineProperty(process, "platform", platform as PropertyDescriptor);
  }
};

const project = async (): Promise<string> => {
  const dir = tmpDir("codegraph-win");
  fs.mkdirSync(path.join(dir, "bin"));
  fs.mkdirSync(path.join(dir, "project", ".codegraph"), { recursive: true });
  await Bun.write(path.join(dir, "project", ".codegraph", "codegraph.db"), "");
  return dir;
};

test("with no codegraph on PATH, session start adds nothing on Windows", async () => {
  const dir = await project();
  const env = { Path: path.join(dir, "bin"), PATHEXT: ".EXE;.CMD" };
  const out = onWindows(() =>
    sessionStart({ cwd: path.join(dir, "project") }, env),
  );
  expect(out).toBe(undefined);
});

test("`findOnPath` tries each extension of PATHEXT in each folder of PATH, and reads `Path` without case", async () => {
  const dir = await project();
  const bin = path.join(dir, "bin");
  await Bun.write(path.join(bin, "codegraph.CMD"), "");
  const env = {
    Path: ["missing", bin].join(path.delimiter),
    PATHEXT: ".EXE;.CMD",
  };
  expect(findOnPath("codegraph", env)).toBe(path.join(bin, "codegraph.CMD"));
  expect(findOnPath("other", env)).toBe(undefined);
});

test("on Windows, a call that fails or times out in `run-tree.mjs` is not a missing CLI, so session start still adds its line", async () => {
  const dir = await project();
  const bin = path.join(dir, "bin");
  await Bun.write(path.join(bin, "codegraph.CMD"), "");
  const env = { Path: bin, PATHEXT: ".EXE;.CMD" };
  const out = onWindows(() =>
    sessionStart({ cwd: path.join(dir, "project") }, env),
  );
  // The `.CMD` file is empty and the node child cannot run it as a program, so the call fails and adds the line:
  // only an `ENOENT` hides the line, and a failed call is not one.
  expect(out?.hookSpecificOutput.hookEventName).toBe("SessionStart");
});
