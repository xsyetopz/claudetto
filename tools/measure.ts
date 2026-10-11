#!/usr/bin/env -S bun --no-env-file
// Runs `dotclaude-start` of the plugin `dotclaude-sessions` with the start bounds of this repository.
// The bounds are in `tools/limits.ts`, so the plugin holds no bound of this repository.
//
//   node tools/measure.ts [SESSION.jsonl] [dotclaude-start options...]

import path from "node:path";
import {
  FIRST_REQUEST_HIGH_BYTES,
  FIRST_REQUEST_LOW_BYTES,
  START_TOKENS,
} from "./limits.ts";

const BIN = path.join(
  import.meta.dirname,
  "../plugins/dotclaude-sessions/bin/dotclaude-start",
);
const bounds = [
  "--bound",
  String(START_TOKENS),
  "--text-min",
  String(FIRST_REQUEST_LOW_BYTES),
  "--text-max",
  String(FIRST_REQUEST_HIGH_BYTES),
];
const r = Bun.spawnSync(
  [process.execPath, "--no-env-file", BIN, ...process.argv.slice(2), ...bounds],
  { stdin: "inherit", stdout: "inherit", stderr: "inherit" },
);
process.exit(r.exitCode ?? 1);
