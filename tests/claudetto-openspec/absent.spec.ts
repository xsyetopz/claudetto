import { expect, test } from "bun:test";
import { join } from "node:path";

import {
	type Fs,
	safeList,
	statOf,
} from "../../plugins/claudetto-openspec/hooks/fs.ts";
import { linkEscapes } from "../../plugins/claudetto-openspec/hooks/validate-discover.ts";
import { nodeFs } from "../../tools/node-fs.ts";
import { tempDir } from "../../tools/temp.mock.ts";

const denied = () => Promise.reject(new Error("EACCES: permission denied"));

const logging = (fs: Fs = nodeFs) => {
	const lines: string[] = [];
	return {
		lines,
		fs: { ...fs, log: (line: string) => void lines.push(line) },
	};
};

test("a path that is absent is answered without a log line", async () => {
	const root = await tempDir("absent-");
	const { fs, lines } = logging();

	expect(await statOf(fs, join(root, "gone"))).toBeUndefined();
	expect(await safeList(fs, join(root, "gone"))).toEqual([]);
	expect(await linkEscapes(fs, join(root, "specs"), "thing")).toBe(false);
	expect(lines).toEqual([]);
});

test("an error that is not ENOENT is still logged", async () => {
	const { fs, lines } = logging({ ...nodeFs, stat: denied, list: denied });

	expect(await statOf(fs, "/x")).toBeUndefined();
	expect(await safeList(fs, "/x")).toEqual([]);
	expect(lines).toHaveLength(2);
});
