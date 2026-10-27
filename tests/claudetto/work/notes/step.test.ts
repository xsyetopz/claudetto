// The `turn.step` hook of the `notes` slice with a fake stream: the `learn:` block is cut from the text and sets a note.

import { expect, test } from "bun:test";
import { onStep } from "../../../../plugins/claudetto/modules/work/notes/adapters/mod.ts";

interface Chunk {
	kind: string;
	index: number;
	text?: string;
}

const isLooseStep = (
	f: unknown,
): f is (...a: unknown[]) => AsyncGenerator<Chunk, { answer: string }> =>
	typeof f === "function";

/** Pulls the chunks of `stream` into `seen` one after the other, and gives its return value. */
const drain = async (
	stream: AsyncGenerator<Chunk, { answer: string }>,
	seen: Chunk[],
): Promise<{ answer: string }> => {
	const step = await stream.next();
	if (step.done) {
		return step.value;
	}
	seen.push(step.value);
	return drain(stream, seen);
};

test("`onStep` hides the `learn:` block, sets the note, and returns the result of the stream", async () => {
	const sets: unknown[] = [];
	const $ = {
		state: {
			get: async () => ({ value: undefined, version: 1 }),
			set: async (_ref: unknown, value: unknown) => {
				sets.push(value);
				return { isSet: true };
			},
		},
	};
	const answer = "Done.\nlearn: Use `just check`\nexplain: It runs all.";
	const next = async function* () {
		yield { kind: "text", index: 0, text: "Done.\n" };
		yield { kind: "text", index: 0, text: "learn: Use `just check`\n" };
		yield { kind: "tool", index: 1 };
		return { answer };
	};
	if (!isLooseStep(onStep)) {
		throw new Error("`onStep` is not a function");
	}
	const stream = onStep($, { agentId: undefined }, next);
	const seen: Chunk[] = [];
	const result = await drain(stream, seen);
	expect(result).toEqual({ answer });
	expect(seen.map((c) => c.kind)).toEqual(["text", "tool"]);
	expect(seen.map((c) => c.text ?? "").join("")).not.toContain("learn:");
	expect(sets.length).toBeGreaterThan(0);
});
