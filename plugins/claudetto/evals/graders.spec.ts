import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import type { Call, Run } from "./graders.builders.ts";
import { fixtures } from "./graders.fixtures.ts";

// Free replica of the `regex` and `tool_used` grader rules the eval harness documents: each grader must pass a known-good run and fail each known-bad run, and a bad run must fail exactly the graders listed for it.

interface Grader {
	readonly target?: string | { readonly path: string };
	readonly pattern?: string;
	readonly flags?: string;
	readonly match?: string;
	readonly tool?: string;
	readonly input_match?: string;
	readonly min?: number;
	readonly max?: number;
}

const parse = async (path: string): Promise<Grader> => {
	const text = await Bun.file(path).text();
	const front: unknown = Bun.YAML.parse(text.split("---\n")[1] ?? "");
	return typeof front === "object" && front !== null ? front : {};
};

const textOf = (grader: Grader, run: Run): string | undefined => {
	const { target } = grader;
	if (typeof target === "object") {
		return run.files?.[target.path];
	}
	if (target === "trace") {
		return (run.calls ?? []).map((call) => JSON.stringify(call)).join("\n");
	}
	return run.last ?? "";
};

const used = (grader: Grader, call: Call): boolean =>
	call.tool === grader.tool &&
	new RegExp(grader.input_match ?? "", "u").test(JSON.stringify(call.input));

const passes = (grader: Grader, run: Run): boolean => {
	if (grader.tool !== undefined) {
		const n = (run.calls ?? []).filter((call) => used(grader, call)).length;
		return (
			n >= (grader.min ?? 1) && n <= (grader.max ?? Number.POSITIVE_INFINITY)
		);
	}
	const text = textOf(grader, run);
	if (text === undefined) {
		return false;
	}
	const flags = `${grader.flags ?? ""}u`;
	const match = grader.match ?? "contains";
	if (match.startsWith("count:")) {
		const found = text.match(new RegExp(grader.pattern ?? "", `${flags}g`));
		return (found?.length ?? 0) === Number(match.slice(6));
	}
	const found = new RegExp(grader.pattern ?? "", flags).test(text);
	return match === "not_contains" ? !found : found;
};

const dirents = await readdir(import.meta.dir, { withFileTypes: true });
const caseNames = await Promise.all(
	dirents
		.filter((dirent) => dirent.isDirectory())
		.map(async (dirent) =>
			(await Bun.file(join(import.meta.dir, dirent.name, "prompt.md")).exists())
				? [dirent.name]
				: [],
		),
);
const cases = caseNames.flat();

const load = async (dir: string): Promise<Map<string, Grader>> => {
	const files = await readdir(dir);
	const specs = await Promise.all(files.map((file) => parse(join(dir, file))));
	return new Map(
		files.map((file, index) => [
			file.replace(/\.md$/u, ""),
			specs[index] ?? {},
		]),
	);
};

test("each case has a fixture and each fixture a case", () => {
	expect(cases.toSorted()).toEqual(Object.keys(fixtures).toSorted());
});

const loaded = await Promise.all(
	cases.map((name) => load(join(import.meta.dir, name, "graders"))),
);

for (const [at, name] of cases.entries()) {
	const graders = loaded[at] ?? new Map<string, Grader>();
	const fixture = fixtures[name];
	if (fixture === undefined) {
		continue;
	}
	test(`${name}: every grader passes a known-good run`, () => {
		for (const [grader, spec] of graders) {
			expect([grader, passes(spec, fixture.good)]).toEqual([grader, true]);
		}
	});
	for (const [index, bad] of fixture.bad.entries()) {
		test(`${name}: known-bad run ${index} fails exactly ${bad.fails.join(", ")}`, () => {
			const failed = [...graders]
				.filter(([, spec]) => !passes(spec, bad))
				.map(([grader]) => grader);
			expect(failed.toSorted()).toEqual(bad.fails.toSorted());
		});
	}
}
