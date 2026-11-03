import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sessionTokens } from "../tokens.ts";

const line = (id: string, input: number, output: number): string =>
	JSON.stringify({
		timestamp: "2026-11-03T10:00:00.000Z",
		requestId: `req_${id}`,
		message: {
			id: `msg_${id}`,
			model: "claude-opus-5-5",
			usage: {
				input_tokens: input,
				cache_read_input_tokens: 100,
				cache_creation_input_tokens: 10,
				output_tokens: output,
			},
		},
	});

describe("sessionTokens", () => {
	test("sums each response once across the main transcript and its subagents", async () => {
		const dir = await mkdtemp(join(tmpdir(), "tokens-"));
		await mkdir(join(dir, "s1", "subagents"), { recursive: true });
		// The transcript repeats a response once per content block.
		await writeFile(
			join(dir, "s1.jsonl"),
			`${line("a", 1, 5)}
${line("a", 1, 5)}
${line("b", 2, 6)}`,
		);
		await writeFile(
			join(dir, "s1", "subagents", "agent-1.jsonl"),
			line("c", 3, 7),
		);

		expect(await sessionTokens(dir)).toBe(1 + 2 + 3 + 3 * 110 + 5 + 6 + 7);
	});

	test("counts a folder that does not exist yet as no tokens", async () => {
		expect(await sessionTokens(join(tmpdir(), "no-such-project-dir"))).toBe(0);
	});
});
