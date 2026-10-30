import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const KEY = "ctx7sk-test";

/** The bottom of the chain records each write, as the engine would make it. */
const started = async (
	$: Engine,
	on: On,
	env: Record<string, string>,
): Promise<{ name: string; value: string | undefined }[]> => {
	const writes: { name: string; value: string | undefined }[] = [];
	mock.env(on, env);
	on("env.set", (_$, e) => {
		writes.push({ name: e.name, value: e.value });
		return { value: {} };
	});
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	await $.session.start({
		cwd: "/p",
		surface: "terminal",
		isInteractive: true,
	});
	return writes;
};

test(
	"the `CONTEXT7_API_KEY` option reaches the env that `bunx ctx7` inherits",
	{ options: { CONTEXT7_API_KEY: KEY } },
	async ($: Engine, on: On) => {
		const writes = await started($, on, {});

		expect(writes).toEqual([{ name: "CONTEXT7_API_KEY", value: KEY }]);
	},
);

test(
	"a `CONTEXT7_API_KEY` already in the env is the user's and stays",
	{ options: { CONTEXT7_API_KEY: KEY } },
	async ($: Engine, on: On) => {
		const writes = await started($, on, { CONTEXT7_API_KEY: "own" });

		expect(writes).toEqual([]);
	},
);

test("with no key option nothing is written", async ($: Engine, on: On) => {
	const writes = await started($, on, {});

	expect(writes).toEqual([]);
});
