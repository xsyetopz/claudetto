// Publishes `wiki/` to the GitHub wiki (`just wiki`).
// The wiki repository exists only after its first page is made in the web UI.

import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { $ } from "bun";
import { must, output, REPO, recipe } from "./recipes.ts";

const WIKI = "https://github.com/xsyetopz/claudetto.wiki.git";

await recipe(async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "claudetto-wiki-"));
	try {
		await must($`git clone --quiet ${WIKI} ${tmp}`);
		// As `rsync --delete --exclude .git`: remove each entry but `.git`, then copy `wiki/`.
		const names = (await readdir(tmp)).filter((name) => name !== ".git");
		await Promise.all(
			names.map((name) =>
				rm(path.join(tmp, name), { recursive: true, force: true }),
			),
		);
		await cp(path.join(REPO, "wiki"), tmp, { recursive: true });
		await must($`git -C ${tmp} add -A`);
		const diff = await $`git -C ${tmp} diff --cached --quiet`.nothrow();
		if (diff.exitCode === 0) {
			process.stdout.write("The wiki is up to date.\n");
			return;
		}
		const head = (await output($`git rev-parse --short HEAD`)).trim();
		await must(
			$`git -C ${tmp} commit --quiet -m ${`Sync wiki from claudetto ${head}`}`,
		);
		await must($`git -C ${tmp} push --quiet origin HEAD`);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});
