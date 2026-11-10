import { expect, test } from "bun:test";

import { Glob } from "bun";

const PLUGINS = `${import.meta.dir}/../plugins`;
// The lab loads a test only from inside the plugin folder, so `*.test.ts` and `*.mock.ts` files stay.
const BUN_RUN = /\.spec\.ts$|(?:^|\/)fixtures\/|\/fixture-[^/]+\.ts$/u;

test("no plugin folder holds a file that only a Bun-run test loads", async () => {
	const files = await Array.fromAsync(new Glob("**").scan(PLUGINS));
	expect(files.filter((f) => BUN_RUN.test(f))).toEqual([]);
});
