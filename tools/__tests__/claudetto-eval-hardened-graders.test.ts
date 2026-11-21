import { expect, test } from "bun:test";
import { join } from "node:path";

// ADR-0193 rule 3: each regex grader of the hardened REQ-REPLY-145 and REQ-REPLY-146 cases has
// known-good and known-bad samples, and each pattern must accept the first and reject the second.
import { SAMPLES } from "./claudetto-eval-hardened-samples";
import { loadGraders, passes } from "./spec-eval-graders";

const evals = join(
	import.meta.dir,
	"..",
	"..",
	"plugins",
	"claudetto",
	"evals"
);
const graders = await loadGraders(evals, [
	"count-after-change",
	"count-in-reply",
	"dispute-checkable"
]);

test("every grader of the three hardened cases has samples", () => {
	expect([...graders.keys()].toSorted()).toEqual(
		Object.keys(SAMPLES).toSorted()
	);
});

for (const [id, samples] of Object.entries(SAMPLES)) {
	test(`${id} accepts its good samples and rejects its bad ones`, () => {
		const grader = graders.get(id);
		expect(grader).toBeDefined();
		if (grader === undefined) {
			return;
		}
		for (const good of samples.good) {
			expect({ sample: good, ok: passes(grader, good) }).toEqual({
				sample: good,
				ok: true
			});
		}
		for (const bad of samples.bad) {
			expect({ sample: bad, ok: passes(grader, bad) }).toEqual({
				sample: bad,
				ok: false
			});
		}
	});
}
