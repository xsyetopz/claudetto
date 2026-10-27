// The test plugin in `padded/` holds two cases for the judge `plain-reply`: a padded reply and a plain reply.
// A paid run of them shows that the judge fails a padded reply and passes a plain one (`wiki/claudetto/evidence/Evals-0.1.0.md`).
// This test keeps the judge of the test plugin equal to the judge of each style case, so the run covers the shipped judge.

import { expect, test } from "bun:test";
import path from "node:path";
import { deepEquals, file } from "bun";
import { parse } from "yaml";
import { REPO, walk } from "../../support/repo.ts";

interface Case {
	name: string;
	graders: { name: string; type: string; focus?: string; criteria?: string }[];
}

const EVALS = path.join(REPO, "plugins/claudetto/evals");
const PADDED_EVALS = path.join(import.meta.dir, "padded/evals");

const load = async (dir: string): Promise<Case[]> =>
	Promise.all(
		(await walk(dir, { keep: (f) => path.basename(f) === "case.yaml" })).map(
			async (f): Promise<Case> => parse(await file(f).text()),
		),
	);

const judgeOf = (c: Case) => c.graders.find((g) => g.name === "plain-reply");

test("the test plugin has the padded case and the plain case", async () => {
	const names = (await load(PADDED_EVALS))
		.map((c) => c.name)
		.sort((a, b) => Number(a > b) - Number(a < b));
	expect(names).toEqual(["padded-reply", "plain-control"]);
});

test("each case of the test plugin has only the judge `plain-reply`", async () => {
	for (const c of await load(PADDED_EVALS)) {
		expect(c.graders.map((g) => g.name)).toEqual(["plain-reply"]);
	}
});

test("the judge `plain-reply` is the same in each style case and in the test plugin", async () => {
	const style = (await load(EVALS)).filter(judgeOf);
	expect(style.length).toBe(5);
	const judges = [...style, ...(await load(PADDED_EVALS))].map((c) => {
		const g = judgeOf(c);
		expect(g, c.name).toBeTruthy();
		return { type: g?.type, focus: g?.focus, criteria: g?.criteria };
	});
	const different = judges.filter((j) => !deepEquals(j, judges[0], true));
	expect(different).toStrictEqual([]);
	expect(judges[0]?.type).toBe("llm");
	expect(judges[0]?.focus).toBe("last_message");
});
