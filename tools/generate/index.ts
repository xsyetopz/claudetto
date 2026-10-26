#!/usr/bin/env -S bun --no-env-file
// Runs `just generate`: writes `wiki/` from `src/wiki/` (`wiki.ts`), and `openspec/schemas/` from the presets of the `spec` module (`schemas.ts`).
//
//   bun tools/generate/index.ts           write each page
//   bun tools/generate/index.ts --check   exit 1 and name each page that differs from its source

import fs from "node:fs";
import path from "node:path";
import { schemaPages, schemaProblems } from "./schemas.ts";
import { pages, problems } from "./wiki.ts";

const REPO = path.resolve(import.meta.dir, "../..");

if (!process.argv.includes("--check"))
  for (const { file, text } of [
    ...(await pages(REPO)),
    ...(await schemaPages(REPO)),
  ]) {
    const at = path.join(REPO, file);
    if (fs.existsSync(at) && (await Bun.file(at).text()) === text) continue;
    fs.mkdirSync(path.dirname(at), { recursive: true });
    await Bun.write(at, text);
    console.log(`Wrote ${file}`);
  }
const found = [...(await problems(REPO)), ...(await schemaProblems(REPO))];
for (const line of found) console.error(line);
process.exit(found.length ? 1 : 0);
