// Loaded with `node --import` before each test file. Every temporary folder the
// tests or the hooks they spawn create goes under one folder per test process,
// removed at exit, so repeated runs leave nothing behind in the system temp folder.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "dotclaude-tests-"));
process.env.TMPDIR = root;
// On Windows, `os.tmpdir()` reads `TEMP` and `TMP`, not `TMPDIR`.
process.env.TEMP = root;
process.env.TMP = root;
// `node --test` runs each test file in its own process, so each process removes its own folder.
process.on("exit", () => fs.rmSync(root, { recursive: true, force: true }));
