// Loaded by the `preload` of `bunfig.toml` once per `bun test` process.
// Every temporary folder that the tests or the hooks they spawn create goes under
// one folder per process, so repeated runs leave nothing behind in the system temp folder.

import { afterAll } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "dotclaude-tests-"));
process.env["TMPDIR"] = root;
// On Windows, `os.tmpdir()` reads `TEMP` and `TMP`, not `TMPDIR`.
process.env["TEMP"] = root;
process.env["TMP"] = root;
// `bun test` does not emit a `process` `exit` event, so `afterAll` removes the folder.
// The hook runs once, after the last test file of the process.
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
