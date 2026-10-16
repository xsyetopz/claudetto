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

// `W_OK` passes for root, so a read-only file is writable for root and this test cannot fail there.
test.skipIf(process.getuid?.() === 0)(
  "a CHANGELOG that cannot be written leaves package.json unchanged",
  async () => {
    fs.chmodSync(path.join(root, "CHANGELOG.md"), 0o444);
    const errors: string[] = [];
    const logError = console.error;
    console.error = (...parts: unknown[]) => {
      errors.push(parts.join(" "));
    };
    let status = -1;
    try {
      status = await main(["patch", "--root", root]);
    } finally {
      console.error = logError;
    }

    // The run fails for the read-only reason, and its message names the file.
    expect(status).toBe(1);
    expect(errors).toEqual([
      "Cannot write CHANGELOG.md, so nothing was changed.",
    ]);
    expect(await Bun.file(path.join(root, "package.json")).text()).toBe(
      PACKAGE,
    );
    expect(await Bun.file(path.join(root, "CHANGELOG.md")).text()).toBe(
      CHANGELOG,
    );
  },
);

test("an exact pre-release target is the next version", () => {
  expect(nextVersion("1.0.0", "0.1.0-alpha.1")).toBe("0.1.0-alpha.1");
});

test("a malformed pre-release target is refused", () => {
  expect(() => nextVersion("1.0.0", "0.1.0-")).toThrow();
  expect(() => nextVersion("1.0.0", "0.1.0-alpha..1")).toThrow();
});

test("a bump from a pre-release version moves the compare link", async () => {
  await Bun.write(
    path.join(root, "package.json"),
    '{\n  "version": "0.1.0-alpha.1"\n}\n',
  );
  await Bun.write(
    path.join(root, "CHANGELOG.md"),
    CHANGELOG.replace("v1.0.0...", "v0.1.0-alpha.1..."),
  );
  expect(await main(["0.1.0-alpha.2", "--root", root])).toBe(0);
  expect(await Bun.file(path.join(root, "CHANGELOG.md")).text()).toContain(
    "compare/v0.1.0-alpha.2...HEAD",
  );
});

test("a pre-release current version is refused", () => {
  expect(() => nextVersion("1.0.0-rc.1", "patch")).toThrow();
});

test("a mistyped dry run writes no file and shows the usage (review row 125)", async () => {
  const logError = console.error;
  console.error = () => {};
  try {
    expect(await main(["minor", "--dryrun", "--root", root])).toBe(2);
    expect(await main(["minor", "x", "--dry-run", "--root", root])).toBe(2);
  } finally {
    console.error = logError;
  }
  expect(await Bun.file(path.join(root, "package.json")).text()).toBe(PACKAGE);
});

test("`--root` with no folder is a usage error that names `--root`, and nothing changes", async () => {
  const errors: string[] = [];
  const logError = console.error;
  console.error = (...parts: unknown[]) => {
    errors.push(parts.join(" "));
  };
  let status = -1;
  try {
    status = await main(["patch", "--root"]);
  } finally {
    console.error = logError;
  }
  expect(status).toBe(2);
  expect(errors.join("\n")).toContain("--root needs a folder");
});
