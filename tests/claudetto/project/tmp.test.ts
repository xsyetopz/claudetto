// Tests of `tempDirs` (spec `permission-gate`, "One Temp Folder").

import { expect, test } from "bun:test";
import { inTmp } from "../../../plugins/claudetto/modules/gate/domain/paths.ts";
import { tempDirs } from "../../../plugins/claudetto/modules/project/domain/tmp.ts";

const ENV: Record<string, string> = {
  TMPDIR: "/var/folders/x/T/",
  CLAUDE_CODE_TMPDIR: "/tmp/cc",
};
const REAL: Record<string, string> = {
  "/var/folders/x/T": "/private/var/folders/x/T",
  "/tmp": "/private/tmp",
  "/private/tmp": "/private/tmp",
};

test("Same Folders: `TMPDIR`, `CLAUDE_CODE_TMPDIR`, `/tmp`, and `/private/tmp`, each with its real path", async () => {
  const dirs = await tempDirs(ENV, async (path) => REAL[path] ?? path);
  expect(dirs).toStrictEqual([
    ["/var/folders/x/T", "/private/var/folders/x/T"],
    ["/tmp/cc", "/tmp/cc"],
    ["/tmp", "/private/tmp"],
    ["/private/tmp", "/private/tmp"],
  ]);
  const temps = dirs.flat();
  const at = { cwd: "/p", home: "/u", tmp: "/var/folders/x/T", temps };
  for (const path of [
    "/var/folders/x/T/a",
    "/private/var/folders/x/T/a",
    "/tmp/cc/a",
    "/tmp/a",
    "/private/tmp/a",
  ])
    expect(inTmp(path, at)).toBe(true);
  expect(inTmp("/var/a", at)).toBe(false);
});

test("an unset `TMPDIR` drops out, and a root stays `/`", async () => {
  const dirs = await tempDirs({ CLAUDE_CODE_TMPDIR: "/" }, async (p) => p);
  expect(dirs.map((d) => d[0])).toStrictEqual(["/", "/tmp", "/private/tmp"]);
});
