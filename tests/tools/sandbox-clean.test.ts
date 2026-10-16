// `claudetto-sandbox --clean` as `just sandbox-install` runs it first: on a folder that is missing, and on a folder that the sandbox made.
// Every test uses a folder under the temp folder, never the default sandbox folder.

import { afterEach, beforeEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../../plugins/claudetto-lab/slices/sandbox/adapters/cli.ts";

let scratch = "";
beforeEach(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-clean-test-"));
});
afterEach(() => {
  fs.rmSync(scratch, { recursive: true, force: true });
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
