#!/usr/bin/env -S bun --no-env-file
// Runs `just generate`: writes each text that a plugin ships from its source in `src/` (design D12).
//
//   bun tools/generate/index.ts           write each generated file
//   bun tools/generate/index.ts --check   exit 1 and name each generated file that differs from its source

import fs from "node:fs";
import path from "node:path";
import { outputs, stale } from "./emit/texts.ts";

const REPO = path.resolve(import.meta.dir, "../..");

if (process.argv[1] === import.meta.path) {
  if (process.argv.includes("--check")) {
    const found = await stale(REPO);
    for (const line of found) console.error(line);
    process.exit(found.length ? 1 : 0);
  }
  for (const o of await outputs(REPO)) {
    const at = path.join(REPO, o.file);
    if (fs.existsSync(at) && (await Bun.file(at).text()) === o.text) continue;
    fs.mkdirSync(path.dirname(at), { recursive: true });
    await Bun.write(at, o.text);
    console.log(`Wrote ${o.file}`);
  }
}
