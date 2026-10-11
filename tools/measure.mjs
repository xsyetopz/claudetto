#!/usr/bin/env node
// Runs `dotclaude-start` of the plugin `dotclaude-sessions` with the start bounds of this repository.
// The bounds are in `tools/limits.mjs`, so the plugin holds no bound of this repository.
//
//   node tools/measure.mjs [SESSION.jsonl] [dotclaude-start options...]

import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  FIRST_REQUEST_HIGH_BYTES,
  FIRST_REQUEST_LOW_BYTES,
  START_TOKENS,
} from "./limits.mjs";

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
const r = spawnSync(
  process.execPath,
  [BIN, ...process.argv.slice(2), ...bounds],
  { stdio: "inherit" },
);
process.exit(r.status ?? 1);
