// Behavior of the `--plugin-dir` arguments of `dotclaude-sandbox`: claude runs in the sandbox project,
// so each relative plugin folder is made absolute against the folder of the caller.

import assert from "node:assert/strict";
import { test } from "node:test";
import { absolutePluginDirs } from "../../../plugins/dotclaude-lab/features/sandbox/setup.mjs";

test("a relative `--plugin-dir` value resolves against the caller folder", () => {
  assert.deepEqual(
    absolutePluginDirs(
      ["--plugin-dir", "plugins/dotclaude", "-p", "hi"],
      "/repo",
    ),
    ["--plugin-dir", "/repo/plugins/dotclaude", "-p", "hi"],
  );
});

test("the `--plugin-dir=DIR` form resolves the same way", () => {
  assert.deepEqual(absolutePluginDirs(["--plugin-dir=plugins/x"], "/repo"), [
    "--plugin-dir=/repo/plugins/x",
  ]);
});

test("an absolute folder and other arguments do not change", () => {
  const args = ["--plugin-dir", "/abs/p", "--model", "plugins/x"];
  assert.deepEqual(absolutePluginDirs(args, "/repo"), args);
});
