// Behavior of `dotclaude-sandbox --clean`: it removes only the sandbox layout, and it refuses any other folder.
// Every test uses a folder under the temp folder, never the real home or the working folder.

import { afterEach, beforeEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../../../src/plugins/dotclaude-lab/slices/sandbox/adapters/cli.ts";
import { setUp } from "../../../src/plugins/dotclaude-lab/slices/sandbox/adapters/setup.ts";
import { cleanRefusal } from "../../../src/plugins/dotclaude-lab/slices/sandbox/domain/clean.ts";

let scratch = "";
beforeEach(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "clean-test-"));
});
afterEach(() => {
  fs.rmSync(scratch, { recursive: true, force: true });
});

test("`--clean` refuses a folder that holds a file outside the sandbox layout", async () => {
  const root = path.join(scratch, "work");
  fs.mkdirSync(path.join(root, "config"), { recursive: true });
  await Bun.write(path.join(root, "notes.txt"), "keep me");

  const code = await main(["--dir", root, "--clean"]);

  expect(code).not.toBe(0);
  expect(await Bun.file(path.join(root, "notes.txt")).text()).toBe("keep me");
});

test("`--clean` refuses a folder that holds a sub-folder outside the layout", async () => {
  const root = path.join(scratch, "work");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });

  const code = await main(["--dir", root, "--clean"]);

  expect(code).not.toBe(0);
  expect(fs.existsSync(path.join(root, "src"))).toBe(true);
});

test("`--clean` refuses a folder that holds only `config/` and `project/` and no marker", async () => {
  const root = path.join(scratch, "work");
  fs.mkdirSync(path.join(root, "config"), { recursive: true });
  fs.mkdirSync(path.join(root, "project"), { recursive: true });

  const code = await main(["--dir", root, "--clean"]);

  expect(code).not.toBe(0);
  expect(fs.existsSync(path.join(root, "config"))).toBe(true);
  expect(fs.existsSync(path.join(root, "project"))).toBe(true);
});

test("`--clean` refuses an empty folder that is not the default", async () => {
  const root = path.join(scratch, "mount");
  fs.mkdirSync(root);

  const code = await main(["--dir", root, "--clean"]);

  expect(code).not.toBe(0);
  expect(fs.existsSync(root)).toBe(true);
});

test("`--clean` removes a folder that the setup made", async () => {
  const root = path.join(scratch, "sandbox");
  await setUp({
    root,
    config: path.join(root, "config"),
    home: path.join(root, "home"),
    project: path.join(root, "project"),
  });

  const code = await main(["--dir", root, "--clean"]);

  expect(code).toBe(0);
  expect(fs.existsSync(root)).toBe(false);
});

test("`--dir` followed by a flag exits 1 and does not take the flag as the folder", async () => {
  const code = await main(["--dir", "--clean"]);

  expect(code).toBe(1);
});

test("`cleanRefusal` allows the default folder whatever it holds", () => {
  expect(
    cleanRefusal("/tmp/dotclaude-sandbox", ["notes.txt"], true),
  ).toBeNull();
});

test("`cleanRefusal` allows a folder that holds the layout and the marker, and names the foreign entries", () => {
  expect(
    cleanRefusal("/x", ["config", "home", ".dotclaude-sandbox"], false),
  ).toBeNull();
  expect(cleanRefusal("/x", ["config", "README.md"], false)).toContain(
    "README.md",
  );
});

test("`cleanRefusal` refuses a folder without the marker, even when it holds only the layout", () => {
  expect(cleanRefusal("/x", ["config", "home"], false)).not.toBeNull();
  expect(cleanRefusal("/x", [], false)).not.toBeNull();
});
