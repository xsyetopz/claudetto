// Behavior of `dotclaude-sandbox --clean`: it removes only the sandbox layout, and it refuses any other folder.
// Every test uses a folder under the temp folder, never the real home or the working folder.

import { afterEach, beforeEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../../../src/plugins/dotclaude-lab/slices/sandbox/adapters/cli.ts";
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
  fs.writeFileSync(path.join(root, "notes.txt"), "keep me");

  const code = await main(["--dir", root, "--clean"]);

  expect(code).not.toBe(0);
  expect(fs.readFileSync(path.join(root, "notes.txt"), "utf8")).toBe("keep me");
});

test("`--clean` refuses a folder that holds a sub-folder outside the layout", async () => {
  const root = path.join(scratch, "work");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });

  const code = await main(["--dir", root, "--clean"]);

  expect(code).not.toBe(0);
  expect(fs.existsSync(path.join(root, "src"))).toBe(true);
});

test("`--clean` removes a folder that holds only the sandbox layout", async () => {
  const root = path.join(scratch, "sandbox");
  for (const name of ["config", "project", "home"])
    fs.mkdirSync(path.join(root, name), { recursive: true });

  const code = await main(["--dir", root, "--clean"]);

  expect(code).toBe(0);
  expect(fs.existsSync(root)).toBe(false);
});

test("`cleanRefusal` allows the default folder whatever it holds", () => {
  expect(
    cleanRefusal("/tmp/dotclaude-sandbox", ["notes.txt"], true),
  ).toBeNull();
});

test("`cleanRefusal` allows a folder that holds only the layout, and names the foreign entries", () => {
  expect(cleanRefusal("/x", ["config", "home"], false)).toBeNull();
  expect(cleanRefusal("/x", ["config", "README.md"], false)).toContain(
    "README.md",
  );
});
