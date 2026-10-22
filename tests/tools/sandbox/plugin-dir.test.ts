// Behavior of the `--plugin-dir` arguments of `claudetto-sandbox`: claude runs in the sandbox project,
// so each relative plugin folder is made absolute against the folder of the caller.

import { expect, test } from "bun:test";
import path from "node:path";
import { absolutePluginDirs } from "../../../tools/sandbox/adapters/setup.ts";

test("a relative `--plugin-dir` value resolves against the caller folder", () => {
  expect(
    absolutePluginDirs(
      ["--plugin-dir", "plugins/claudetto", "-p", "hi"],
      "/repo",
    ),
  ).toStrictEqual([
    "--plugin-dir",
    path.resolve("/repo", "plugins/claudetto"),
    "-p",
    "hi",
  ]);
});

test("the `--plugin-dir=DIR` form resolves the same way", () => {
  expect(absolutePluginDirs(["--plugin-dir=plugins/x"], "/repo")).toStrictEqual(
    [`--plugin-dir=${path.resolve("/repo", "plugins/x")}`],
  );
});

test("an absolute folder and other arguments do not change", () => {
  const abs = path.resolve("/abs/p");
  const args = ["--plugin-dir", abs, "--model", "plugins/x"];
  expect(absolutePluginDirs(args, "/repo")).toStrictEqual(args);
});
