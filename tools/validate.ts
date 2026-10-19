#!/usr/bin/env bun
// Validates the marketplace and each plugin with `claude plugin validate --strict`.
//
//   bun tools/validate.ts   exit 0 when each manifest, skill, and agent is valid

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { replyOnlyCasesIn, thinEvalClaimsIn } from "./case-checks.ts";
import { EVAL_MIN_RUNS_PER_ARM } from "./limits.ts";
import { $claude } from "./telemetry.ts";

const root = join(import.meta.dir, "..");
const plugins = join(root, "plugins");

if (import.meta.main) {
  const parts = (await replyOnlyCasesIn(root)).map(
    (f) => `${f}: no check of a file or a tool call (D25)`,
  );
  for (const c of await thinEvalClaimsIn(root))
    parts.push(
      `${c.file}:${c.line}: cites an eval of ${c.runs} runs in an arm, and the least is ${EVAL_MIN_RUNS_PER_ARM} (D25)`,
    );
  if (parts.length) {
    for (const line of parts) console.error(`${line}`);
    process.exit(1);
  }
  await $claude()`claude plugin validate --strict ${root}`;
  for (const entry of readdirSync(plugins, { withFileTypes: true })) {
    if (entry.isDirectory())
      await $claude()`claude plugin validate --strict ${join(plugins, entry.name)}`;
  }
}
