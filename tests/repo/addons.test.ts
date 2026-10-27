// Each add-on plugin installs and works without the core plugin,
// so no add-on file names a path in `plugins/claudetto/` or the old operating spec.

import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { file } from "bun";
import { PLUGINS, walk } from "../support/repo.ts";

const ADDONS = (await readdir(PLUGINS)).filter((name) =>
	name.startsWith("claudetto-"),
);
const TEXT = /\.(?:mjs|js|ts|json|md)$/;
const CORE_TIE = /\.\.\/claudetto\/|plugins\/claudetto\//;

test("the add-ons exist", () => {
	expect(ADDONS.length > 0, `${ADDONS.length}`).toBeTruthy();
});

for (const addon of ADDONS) {
	test(`${addon} has no ties to the core plugin`, async () => {
		const files = await walk(path.join(PLUGINS, addon), {
			keep: (f) => TEXT.test(f),
		});
		await Promise.all(
			files.map(async (name) => {
				const text = await file(name).text();
				expect(text, name).not.toMatch(CORE_TIE);
			}),
		);
	});
}
