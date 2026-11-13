import { expect, test } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { parseArgs } from "../../plugins/claudetto/hygiene/args.ts";
import {
	logged,
	realOr,
	trashRoots,
} from "../../plugins/claudetto/hygiene/roots.ts";
import { sweep } from "../../plugins/claudetto/hygiene/sweep.ts";
import { tempDir } from "../temp.mock.ts";
import { host } from "./trash.mock.ts";

const sink = () => {
	const lines: string[] = [];
	return { lines, log: (line: string) => void lines.push(line) };
};

test("a path that is absent is answered without a log line", async () => {
	const root = await tempDir("absent-");
	await mkdir(join(root, "proj"), { recursive: true });
	const { lines, log } = sink();
	const gone = join(root, "gone");

	expect(await realOr(gone, log)).toBe(gone);
	await trashRoots(join(root, "proj"), [gone], join(root, "home"), log);
	await sweep(parseArgs([]), {
		...host(root, join(root, "proj")),
		log,
	});

	expect(lines).toEqual([]);
});

test("an error that is not ENOENT is still logged", () => {
	const { lines, log } = sink();
	const denied = Object.assign(new Error("denied"), { code: "EACCES" });

	expect(logged(log, "The path was not read", 0)(denied)).toBe(0);

	expect(lines).toHaveLength(1);
	expect(lines[0]).toContain("denied");
});
