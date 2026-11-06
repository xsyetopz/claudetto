import type { Grader } from "../grade/grade.ts";
import { type Aggregate, type Fixture, loadFixtures } from "./fixture.ts";

// Every message, a failure included, carries counts only: an error text could quote a case.
const [setPath, graderModule] = Bun.argv.slice(2);
const aggregate: Aggregate = { n: 0, pass: 0, byLabel: {} };
let error: string | undefined;
try {
	const set = await loadFixtures(setPath as string);
	const grader = (await import(graderModule as string)).default as Grader<Fixture>;
	for (const f of set.fixtures) {
		error = `grader failed on case ${aggregate.n + 1} of ${set.fixtures.length}`;
		const v = await grader.grade(f);
		error = undefined;
		aggregate.n++;
		aggregate.pass += v.pass ? 1 : 0;
		aggregate.byLabel[v.label] = (aggregate.byLabel[v.label] ?? 0) + 1;
	}
} catch {
	error ??= "set or grader module failed to load";
}
process.send?.(error ? { ...aggregate, error } : aggregate);
