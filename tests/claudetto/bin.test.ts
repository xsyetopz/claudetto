// Each command of `bin/` imports names that its target module exports. The type check skips these files, because they have no `.ts` extension.

import { expect, test } from "bun:test";
import path from "node:path";
import { file, Glob } from "bun";

const IMPORT_FROM = /import \{([^}]+)\} from "([^"]+)"/g;

const entries = [...new Glob("plugins/*/bin/*").scanSync(".")].sort(
	(a, b) => Number(a > b) - Number(a < b),
);

test("each plugin has a command in `bin/`", () => {
	expect(entries.length).toBeGreaterThan(0);
});

for (const entry of entries) {
	test(`\`${entry}\` imports only exported names`, async () => {
		const text = await file(entry).text();
		const imports = [...text.matchAll(IMPORT_FROM)];
		const found = await Promise.all(
			imports.map(async ([, names = "", spec = ""]) => {
				const target = await import(path.resolve(path.dirname(entry), spec));
				return names
					.split(",")
					.map((n) => n.trim())
					.filter((name) => name !== "" && !(name in target))
					.map((name) => `${name} of ${spec}`);
			}),
		);
		expect(found.flat()).toStrictEqual([]);
	});
}
