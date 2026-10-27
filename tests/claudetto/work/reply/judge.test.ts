// The judge of a reply opening with fake ports: Jev first, then the model, and a fault lets the stop go. No paid call runs.

import { beforeEach, expect, test } from "bun:test";
import { keepOptions } from "../../../../plugins/claudetto/kernel/options.ts";
import {
	type Facts,
	isFiller,
	type JudgeIo,
} from "../../../../plugins/claudetto/modules/work/reply/adapters/judge.ts";

const USAGE = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
};

const FACTS: Facts = { request: "Use `bun check`.", opening: "You're right." };

beforeEach(() => keepOptions({ decide: "jev", TYPESAFE_API_KEY: "k" }));

/** Ports whose Jev gives `p` (`undefined` is a failing call), and whose model gives `text`. `calls` counts the model calls. */
const ports = (p: number | undefined, text: string | Error, calls = [0]) => {
	const io: JudgeIo = {
		jevKey: async () => "k",
		fetch: async () => {
			if (p === undefined) {
				throw new Error("down");
			}
			return {
				ok: true,
				status: 200,
				headers: {},
				text: JSON.stringify({ answers: { q: { noul: p } } }),
			};
		},
		sleep: async () => undefined,
		complete: async () => {
			calls[0] = (calls[0] ?? 0) + 1;
			if (text instanceof Error) {
				throw text;
			}
			return { isAnswered: true, text, usage: USAGE };
		},
	};
	return io;
};

test("Jev sure of yes blocks with no model call", async () => {
	const calls = [0];
	expect(
		await isFiller(ports(0.95, "<block>no</block>", calls), FACTS, true),
	).toBe(true);
	expect(calls[0]).toBe(0);
});

test("Jev sure of no lets the stop go with no model call", async () => {
	const calls = [0];
	expect(
		await isFiller(ports(0.05, "<block>yes</block>", calls), FACTS, true),
	).toBe(false);
	expect(calls[0]).toBe(0);
});

test("Jev not sure asks the model, and its yes blocks", async () => {
	const calls = [0];
	expect(
		await isFiller(ports(0.5, "<block>yes</block>", calls), FACTS, true),
	).toBe(true);
	expect(calls[0]).toBe(1);
});

test("Jev not available asks the model, and its no lets the stop go", async () => {
	expect(
		await isFiller(ports(undefined, "<block>no</block>"), FACTS, true),
	).toBe(false);
	expect(
		await isFiller(ports(undefined, "<block>yes</block>"), FACTS, true),
	).toBe(true);
});

test("the `classifier` option off skips the model", async () => {
	const calls = [0];
	expect(
		await isFiller(ports(0.5, "<block>yes</block>", calls), FACTS, false),
	).toBe(false);
	expect(calls[0]).toBe(0);
});

test("a fault or a bad answer of both steps lets the stop go", async () => {
	expect(await isFiller(ports(undefined, new Error("x")), FACTS, true)).toBe(
		false,
	);
	expect(await isFiller(ports(undefined, "maybe"), FACTS, true)).toBe(false);
	expect(
		await isFiller(
			ports(undefined, "<block>yes</block><block>no</block>"),
			FACTS,
			true,
		),
	).toBe(false);
});
