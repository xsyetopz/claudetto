// The eval cases ship in the `evals/` folder of each plugin and nowhere else.
// No other file of `plugins/` names a case, a grader, or `case.yaml`,
// so the text of a case does not leak into the context of the agent under test.
// So the name of each case and each grader is unique in `plugins/`.

import { expect, test } from "bun:test";
import { access, lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { file } from "bun";
import { parse } from "yaml";
import { PLUGINS, walk } from "../support/repo.ts";

const SKIP = ["node_modules", ".git"];
const files = (dir: string): Promise<string[]> => walk(dir, { skip: SKIP });

/** The `evals/` folder of each plugin that has one. */
const exists = async (p: string): Promise<boolean> => {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
};
const evalDirs = (await readdir(PLUGINS)).map((plugin) =>
	path.join(PLUGINS, plugin, "evals"),
);
const evalDirsFound = await Promise.all(evalDirs.map(exists));
const EVALS = evalDirs.filter((_, i) => evalDirsFound[i]);
const inEvals = (p: string): boolean =>
	EVALS.some((dir) => p.startsWith(dir + path.sep));

const cases = (await Promise.all(EVALS.map(files)))
	.flat()
	.filter((p) => p.endsWith(`${path.sep}case.yaml`));
const names = (
	await Promise.all(
		cases.map(async (caseFile) => {
			const doc: { name: string; graders: { name: string }[] } = parse(
				await file(caseFile).text(),
			);
			return [doc.name, ...doc.graders.map((g) => g.name)];
		}),
	)
).flat();
const outsideEvals = (await files(PLUGINS)).filter((p) => !inEvals(p));
const isLink = await Promise.all(
	outsideEvals.map(async (p) => (await lstat(p)).isSymbolicLink()),
);
const outside = outsideEvals.filter((_, i) => !isLink[i]);

test("the eval folder holds cases", () => {
	expect(cases.length > 0, `${cases.length}`).toBeTruthy();
});

test("a case file sits only in the eval folder", async () => {
	const stray = (await files(PLUGINS)).filter(
		(p) => path.basename(p) === "case.yaml" && !inEvals(p),
	);
	expect(stray).toStrictEqual([]);
});

// A lint of the live repository.
test("lint: no file outside the eval folder names `case.yaml`, a case, or a grader", async () => {
	const found = await Promise.all(
		outside.map(async (name) => {
			const buf = Buffer.from(await file(name).bytes());
			if (buf.includes(0)) {
				return null;
			}
			const text = buf.toString("utf8");
			const hit = ["case.yaml", ...names].find((n) => text.includes(n));
			return hit ? `${path.relative(PLUGINS, name)}: ${hit}` : null;
		}),
	);
	const leaks = found.filter((leak) => leak !== null);
	expect(leaks).toStrictEqual([]);
});
