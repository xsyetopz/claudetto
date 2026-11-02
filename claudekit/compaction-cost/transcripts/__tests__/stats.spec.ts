import { expect, test } from "bun:test";
import { boundaryStats } from "../stats.ts";

test("boundaryStats leaves a boundary whose pre size is below its post size out of the kept share", () => {
	const sessions = [
		[
			{ kind: "boundary", trigger: "auto", pre: 200_000, post: 20_000, ms: 1 },
			{ kind: "boundary", trigger: "manual", pre: 2, post: 9000, ms: 1 },
		],
	] as const;

	const stats = boundaryStats(sessions);

	expect(stats.keptShare).toBeCloseTo(10, 9);
	expect(stats.keptHigh).toBeCloseTo(10, 9);
}, 5000);
