import { expect, test } from "bun:test";

import { Glob } from "bun";

const ROOT = `${import.meta.dir}/..`;

const sourcesWith = async (needle: string): Promise<string[]> => {
	const found: string[] = [];
	for await (const path of new Glob("plugins/*/hooks/**/*.ts").scan(ROOT)) {
		if (/\.(?:test|mock)\.ts$/u.test(path)) {
			continue;
		}
		const text = await Bun.file(`${ROOT}/${path}`).text();
		if (text.includes(needle)) {
			found.push(path);
		}
	}
	return found;
};

test("only the Decider module names the TypeSafe host", async () => {
	expect(await sourcesWith("api.typesafe.ai")).toEqual([
		"plugins/claudetto/hooks/decider/jev.ts",
	]);
});
