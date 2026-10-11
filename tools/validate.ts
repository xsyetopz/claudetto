#!/usr/bin/env bun
// Validates the marketplace and each plugin with `claude plugin validate --strict`.
//
//   bun tools/validate.ts   exit 0 when each manifest, skill, and agent is valid

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

const root = join(import.meta.dir, "..");
const plugins = join(root, "plugins");

await $`claude plugin validate --strict ${root}`;
for (const entry of readdirSync(plugins, { withFileTypes: true })) {
  if (entry.isDirectory())
    await $`claude plugin validate --strict ${join(plugins, entry.name)}`;
}
