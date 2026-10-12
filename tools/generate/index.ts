#!/usr/bin/env -S bun --no-env-file
// Runs `just generate`: writes each file that a plugin ships from its source in `src/` (design, "Generated tree").
//
//   bun tools/generate/index.ts           write each generated file
//   bun tools/generate/index.ts --check   exit 1 and name each generated file that differs from its source
//
// Both modes also exit 1 and name each file in `plugins/` that has no source and that `tools/rebuild-pending.txt` does not name.

import fs from "node:fs";
import path from "node:path";
import { generated, problems } from "./outputs.ts";

const REPO = path.resolve(import.meta.dir, "../..");

/** A launcher in `bin/` of a plugin, or a scaffold script of an eval case, which run as programs. */
const LAUNCHER = /^plugins\/[^/]+\/bin\/|^plugins\/[^/]+\/evals\/.+\.sh$/;

if (process.argv[1] === import.meta.path) {
  const made = await generated(REPO);
  if (!process.argv.includes("--check"))
    for (const o of made) {
      const at = path.join(REPO, o.file);
      if (fs.existsSync(at) && (await Bun.file(at).text()) === o.text) continue;
      fs.mkdirSync(path.dirname(at), { recursive: true });
      await Bun.write(at, o.text);
      if (LAUNCHER.test(o.file)) fs.chmodSync(at, 0o755);
      console.log(`Wrote ${o.file}`);
    }
  const found = await problems(REPO, made);
  for (const line of found) console.error(line);
  process.exit(found.length ? 1 : 0);
}
