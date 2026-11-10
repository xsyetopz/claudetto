import { expect, test } from "bun:test";

import { file, Glob } from "bun";

const PLUGIN = `${import.meta.dir}/../plugins/claudetto`;
// `$.process.run` resolves when its process exits; these start one that can outlive the hook (task 18.17).
const LONG_LIVED_TS =
	/\$\.process\.spawn|\bBun\.spawn|["'](?:node:)?child_process["']|\.unref\(\)/;
const LONG_LIVED_SH = /(?:^|[\s;])(?:nohup|setsid|disown)\s|&\s*$/m;
const TEST_FILE = /\.(?:test|spec|mock)\.ts$/;
const NONE = /^$/;

const matching = async (
	pattern: string,
	skip: RegExp,
	starts: RegExp,
): Promise<string[]> => {
	const files = await Array.fromAsync(new Glob(pattern).scan(PLUGIN));
	const texts = await Promise.all(
		files
			.filter((f) => !skip.test(f))
			.map(async (f) => ({ f, text: await file(`${PLUGIN}/${f}`).text() })),
	);
	return texts.filter(({ text }) => starts.test(text)).map(({ f }) => f);
};

test("the plugin starts no process that outlives the hook or script that started it", async () => {
	expect(await matching("**/*.ts", TEST_FILE, LONG_LIVED_TS)).toEqual([]);
	expect(await matching("bin/*", NONE, LONG_LIVED_SH)).toEqual([]);
});
