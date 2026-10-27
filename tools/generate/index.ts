#!/usr/bin/env -S bun --no-env-file
// Runs `just generate`: writes `wiki/` from `src/wiki/` (`wiki.ts`), and `openspec/schemas/` from the presets of the `spec` module (`schemas.ts`).
//
//   bun tools/generate/index.ts           write each page
//   bun tools/generate/index.ts --check   exit 1 and name each page that differs from its source

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { file as bunFile, write } from "bun";
import { schemaPages, schemaProblems } from "./schemas.ts";
import { pages, problems } from "./wiki.ts";

const REPO = path.resolve(import.meta.dir, "../..");

if (!process.argv.includes("--check")) {
	const wrote = await Promise.all(
		[...(await pages(REPO)), ...(await schemaPages(REPO))].map(
			async ({ file, text }) => {
				const at = path.join(REPO, file);
				if (
					(await bunFile(at).exists()) &&
					(await bunFile(at).text()) === text
				) {
					return null;
				}
				await mkdir(path.dirname(at), { recursive: true });
				await write(at, text);
				return file;
			},
		),
	);
	for (const file of wrote) {
		if (file !== null) {
			process.stdout.write(`Wrote ${file}\n`);
		}
	}
}
const found = [...(await problems(REPO)), ...(await schemaProblems(REPO))];
for (const line of found) {
	console.error(line);
}
process.exitCode = found.length > 0 ? 1 : 0;
