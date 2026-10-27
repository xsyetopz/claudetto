// The compaction line of the `built-in` path: the `session.compact` mod hook adds it to `instructions`, with no process spawn.

import { expect, test } from "bun:test";
import { file } from "bun";
import { keepOptions } from "../../../../plugins/claudetto/kernel/options.ts";
import { onCompact } from "../../../../plugins/claudetto/modules/session/prompt/adapters/mod.ts";
import { PRECOMPACT_LINE } from "../../../../plugins/claudetto/modules/session/prompt/prompts.ts";

interface Event {
	trigger: string;
	instructions?: string;
	messages: [];
}

type Run = (
	$: unknown,
	e: Event,
	next: (e: Event) => Promise<unknown>,
) => Promise<unknown>;

/** Whether `f` is a function, so a test can call the handler with a fake `$`. */
const isRun = (f: unknown): f is Run => typeof f === "function";

const run: Run = (...a) => {
	if (!isRun(onCompact)) {
		throw new Error("`onCompact` is not a function");
	}
	return onCompact(...a);
};

/** The `instructions` that `next` gets for the option `compaction` and the text after `/compact`. */
const sent = async (
	compaction: string | undefined,
	instructions?: string,
): Promise<string | undefined> => {
	keepOptions(compaction === undefined ? {} : { compaction });
	let got: Event | undefined;
	const base: Event = { trigger: "auto", messages: [] };
	await run({}, instructions ? { ...base, instructions } : base, async (e) => {
		got = e;
		return { messages: [] };
	});
	return got?.instructions;
};

test("the `built-in` path adds the line", async () => {
	expect(await sent("built-in")).toBe(PRECOMPACT_LINE);
});

test("the `built-in` path keeps the text after `/compact`", async () => {
	expect(await sent("built-in", "the plan")).toBe(
		`the plan\n\n${PRECOMPACT_LINE}`,
	);
});

test("the other paths leave `instructions` as they are", async () => {
	expect(await sent("auto")).toBeUndefined();
	expect(await sent("handover", "the plan")).toBe("the plan");
	expect(await sent(undefined)).toBeUndefined();
});

test("`hooks.json` has no `PreCompact` command hook", async () => {
	const hooks = await file(
		new URL("../../../../plugins/claudetto/hooks/hooks.json", import.meta.url),
	).json();
	expect(hooks.hooks.PreCompact).toBeUndefined();
});
