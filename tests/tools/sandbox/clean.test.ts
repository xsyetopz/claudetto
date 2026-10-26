// Behavior of `claudetto-sandbox --clean`: it removes only the sandbox layout, and it refuses any other folder.
// `just sandbox-install` runs it first, so it also passes on a missing folder.
// Every test uses a folder under the temp folder, never the real home or the working folder.

import { afterEach, beforeEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../../../dev/sandbox/adapters/cli.ts";
import { setUp } from "../../../dev/sandbox/adapters/setup.ts";
import { cleanRefusal } from "../../../dev/sandbox/domain/clean.ts";

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

test("`--clean` of a missing folder exits 0 and makes no folder", async () => {
  const root = path.join(scratch, "missing");

  const code = await main(["--dir", root, "--clean"]);

  expect(code).toBe(0);
  expect(fs.existsSync(root)).toBe(false);
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
    cleanRefusal("/tmp/claudetto-sandbox", ["notes.txt"], true),
  ).toBeNull();
});

test("`cleanRefusal` allows a folder that holds the layout and the marker, and names the foreign entries", () => {
  expect(
    cleanRefusal("/x", ["config", "home", ".claudetto-sandbox"], false),
  ).toBeNull();
  expect(cleanRefusal("/x", ["config", "README.md"], false)).toContain(
    "README.md",
  );
});

test("`cleanRefusal` refuses a folder without the marker, even when it holds only the layout", () => {
  expect(cleanRefusal("/x", ["config", "home"], false)).not.toBeNull();
  expect(cleanRefusal("/x", [], false)).not.toBeNull();
});

test("`--clean` removes a sandbox whose `config/` folder is read-only and holds a file", async () => {
  const root = path.join(scratch, "sandbox");
  const config = path.join(root, "config");
  fs.mkdirSync(config, { recursive: true });
  await Bun.write(path.join(root, ".claudetto-sandbox"), "");
  await Bun.write(path.join(config, "state.json"), "{}");
  fs.chmodSync(config, 0o555);
  try {
    const code = await main(["--dir", root, "--clean"]);
    expect(code).toBe(0);
    expect(fs.existsSync(root)).toBe(false);
  } finally {
    if (fs.existsSync(config)) fs.chmodSync(config, 0o755);
  }
});

test("`--clean` refuses a symlinked root and leaves the folder that the link points to", async () => {
  const outside = path.join(scratch, "outside");
  fs.mkdirSync(path.join(outside, "config"), { recursive: true });
  fs.mkdirSync(path.join(outside, "project"), { recursive: true });
  await Bun.write(path.join(outside, ".claudetto-sandbox"), "");
  fs.chmodSync(path.join(outside, "config"), 0o555);
  fs.chmodSync(outside, 0o555);
  // The test compares with the mode that `chmod` gave.
  const modeOf = (dir: string): number => fs.statSync(dir).mode & 0o777;
  const before = [modeOf(outside), modeOf(path.join(outside, "config"))];
  const link = path.join(scratch, "link");
  fs.symlinkSync(outside, link);

  try {
    const code = await main(["--dir", link, "--clean"]);

    expect(code).not.toBe(0);
    expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
    expect([modeOf(outside), modeOf(path.join(outside, "config"))]).toEqual(
      before,
    );
  } finally {
    fs.chmodSync(path.join(outside, "config"), 0o755);
    fs.chmodSync(outside, 0o755);
  }
});

test("`--clean` on a missing folder exits 0, and a second `--clean` does too", async () => {
  const dir = path.join(scratch, "sandbox");

  expect(await main(["--dir", dir, "--clean"])).toBe(0);
  expect(await main(["--dir", dir, "--clean"])).toBe(0);
  expect(fs.existsSync(dir)).toBe(false);
});

test("`--clean` removes a sandbox folder that holds a read-only file", async () => {
  const dir = path.join(scratch, "sandbox");
  fs.mkdirSync(path.join(dir, "config"), { recursive: true });
  await Bun.write(path.join(dir, ".claudetto-sandbox"), "");
  const locked = path.join(dir, "config", "settings.json");
  await Bun.write(locked, "{}");
  fs.chmodSync(locked, 0o444);

  expect(await main(["--dir", dir, "--clean"])).toBe(0);
  expect(fs.existsSync(dir)).toBe(false);
});
