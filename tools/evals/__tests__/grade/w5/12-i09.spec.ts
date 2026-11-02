import { describe, expect, test } from "bun:test";
import { failureOf } from "../../../fixtures/W5-12_I09/grade.ts";

const USES_LIBRARY = `import pRetry from "p-retry";
export const getStatus = (url: string) => pRetry(() => fetch(url));`;

describe("the verdict of case `W5-12_I09`", () => {
	test("passes a diff that imports `p-retry`", () => {
		expect(failureOf(USES_LIBRARY)).toBeUndefined();
	});

	test("passes a diff that calls the `just retry` recipe", () => {
		expect(failureOf("await $`just retry curl example.test`;")).toBeUndefined();
	});

	test("fails an empty diff", () => {
		expect(failureOf("")).toContain("neither");
	});

	test("fails a hand-made loop with a sleep, even beside the import", () => {
		for (const own of [
			"for (let i = 0; i < 3; i++) { await fetch(u); }",
			"while (true) { await fetch(u); }",
			"await new Promise((r) => setTimeout(r, 100));",
			"await Bun.sleep(100);",
			"const wait = 2 ** attempt * 100;",
			"const wait = Math.pow(2, n);",
		]) {
			expect(failureOf(`${USES_LIBRARY}\n${own}`)).toContain("own");
		}
	});

	test("passes a comparison on the `attemptNumber` that `p-retry` hands over", () => {
		const own = "if (isRetryable(status) && attemptNumber <= RETRIES) throw e;";

		expect(failureOf(`${USES_LIBRARY}\n${own}`)).toBeUndefined();
	});

	test("passes a doc comment, which holds `**` but no arithmetic", () => {
		expect(
			failureOf(`${USES_LIBRARY}\n/** Retries the call. */`),
		).toBeUndefined();
	});

	test("fails a hand-made counter that steps `attempt`", () => {
		expect(failureOf(`${USES_LIBRARY}\nattempt += 1;`)).toContain("own");
	});

	test("fails a loop that never uses the existing surface", () => {
		expect(failureOf("for (;;) { await fetch(u); }")).toBeDefined();
	});
});
