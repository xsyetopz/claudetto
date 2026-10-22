// The command `jscpd-config --run` runs `bunx jscpd` with `BUN_TMPDIR` set to `TMPDIR`, so the skill needs no env prefix (task 13.16).

import { expect, test } from "bun:test";
import path from "node:path";
import { runEnv } from "../../../plugins/claudetto/slices/dry/adapters/cli.ts";

const SKILL = await Bun.file(
  path.join(
    import.meta.dir,
    "../../../plugins/claudetto/skills/dedupe/SKILL.md",
  ),
).text();

test("`runEnv` sets `BUN_TMPDIR` from `TMPDIR` and keeps the other variables", () => {
  const env = runEnv({ TMPDIR: "/tmp/x", PATH: "/bin" });
  expect(env["BUN_TMPDIR"]).toBe("/tmp/x");
  expect(env["PATH"]).toBe("/bin");
});

test("`runEnv` leaves `BUN_TMPDIR` as it is when `TMPDIR` is not set", () => {
  expect(runEnv({ BUN_TMPDIR: "/a" })["BUN_TMPDIR"]).toBe("/a");
  expect(runEnv({})["BUN_TMPDIR"]).toBeUndefined();
});

test("`runEnv` keeps `BUN_INSTALL` when the cache of Bun takes a write", () => {
  const env = runEnv({ TMPDIR: "/tmp/x", BUN_INSTALL: "/home/.bun" }, true);
  expect(env["BUN_INSTALL"]).toBe("/home/.bun");
});

test("`runEnv` puts `BUN_INSTALL` under `TMPDIR` when the cache of Bun takes no write", () => {
  const env = runEnv({ TMPDIR: "/tmp/x", BUN_INSTALL: "/home/.bun" }, false);
  expect(env["BUN_INSTALL"]).toBe("/tmp/x/bun");
  expect(env["BUN_TMPDIR"]).toBe("/tmp/x");
});

test("`runEnv` keeps `BUN_INSTALL` when the cache takes no write and `TMPDIR` is not set", () => {
  expect(runEnv({ BUN_INSTALL: "/a" }, false)["BUN_INSTALL"]).toBe("/a");
  expect(runEnv({}, false)["BUN_INSTALL"]).toBeUndefined();
});

test("the skill allows only `jscpd-config *` without a prompt", () => {
  expect(SKILL).toMatch(/^allowed-tools: Bash\(jscpd-config \*\)$/m);
});
