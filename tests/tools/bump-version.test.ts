// `bump-version.ts` writes two files, so a bump that cannot write the second one must leave the first one as it was.
// Every test uses a folder under the temp folder, and the bump runs with `--root` on that folder.

import { afterEach, beforeEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main, nextVersion } from "../../tools/bump-version.ts";

const PACKAGE = '{\n  "version": "1.0.0"\n}\n';
const CHANGELOG =
  "# Changelog\n\n## [Unreleased]\n\n- A change.\n\n" +
  "[unreleased]: https://example.com/compare/v1.0.0...HEAD\n";

let root = "";
beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "bump-test-"));
  await Bun.write(path.join(root, "package.json"), PACKAGE);
  await Bun.write(path.join(root, "CHANGELOG.md"), CHANGELOG);
});
afterEach(() => {
  fs.chmodSync(path.join(root, "CHANGELOG.md"), 0o644);
  fs.rmSync(root, { recursive: true, force: true });
});

test("a CHANGELOG that cannot be written leaves package.json unchanged", async () => {
  fs.chmodSync(path.join(root, "CHANGELOG.md"), 0o444);

  const status = await main(["patch", "--root", root]).catch(() => 1);

  expect(status).not.toBe(0);
  expect(await Bun.file(path.join(root, "package.json")).text()).toBe(PACKAGE);
  expect(await Bun.file(path.join(root, "CHANGELOG.md")).text()).toBe(
    CHANGELOG,
  );
});

test("a pre-release target is refused, so no pre-release version is written", () => {
  expect(() => nextVersion("1.0.0", "1.1.0-rc.1")).toThrow();
});

test("a pre-release current version is refused", () => {
  expect(() => nextVersion("1.0.0-rc.1", "patch")).toThrow();
});
