// The check runner with stubs of `$.process.run`.

import { expect, test } from "bun:test";
import type { EngineInterface } from "claude-code";
import { runCheck } from "../../../../plugins/claudetto/modules/work/finish/adapters/mod.ts";
import { OUTPUT_TAIL_CHARS } from "../../../../plugins/claudetto/modules/work/finish/limits.ts";

interface Stubs {
	exitCode?: number;
	stdout?: string;
}

/** Whether `value` has the parts of the engine that the check runner reads: `process.run`, `env.get`, and `session.root`. */
const isEngine = (value: unknown): value is EngineInterface =>
	typeof value === "object" &&
	value !== null &&
	"process" in value &&
	"env" in value &&
	"session" in value;

/** An engine with a stub of `$.process.run`. */
const engine = (stubs: Stubs = {}): EngineInterface => {
	const stub = {
		env: { get: async () => undefined },
		session: { root: async () => "" },
		process: {
			run: async () => ({
				exitCode: stubs.exitCode ?? 0,
				stdout: stubs.stdout ?? "",
				stderr: "",
			}),
		},
	};
	if (!isEngine(stub)) {
		throw new Error("the stub lacks `process.run`");
	}
	return stub;
};

test("a check passes on exit 0 and fails on another code", async () => {
	expect((await runCheck(engine(), "just check")).pass).toBe(true);
	expect((await runCheck(engine({ exitCode: 2 }), "just check")).pass).toBe(
		false,
	);
});

test("a check keeps only the tail of the output", async () => {
	const stdout = `${"a".repeat(OUTPUT_TAIL_CHARS)}END`;
	const out = (await runCheck(engine({ exitCode: 1, stdout }), "x")).output;
	expect(out).toHaveLength(OUTPUT_TAIL_CHARS);
	expect(out.endsWith("END")).toBe(true);
});
