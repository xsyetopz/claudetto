// The plan mode runs `claude` only against a fake Messages API; a stub runner stands for it here.

import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandRunner } from "../../../claudekit/session/command.ts";
import { styleMain } from "../style/main.ts";

const ROOT = join(import.meta.dir, "..", "..", "..");

/** A runner that answers `git show` with a style file and posts one request to the fake API for each `claude`. */
const stubRunner =
	(calls: string[][]): CommandRunner =>
	async (argv, options) => {
		calls.push([...argv]);
		if (argv[0] === "git") {
			return {
				code: 0,
				stdout:
					"---\nname: Concise\n---\n\n<first_sentence>\nOpen with the outcome.\n</first_sentence>\n",
				stderr: "",
				timedOut: false,
			};
		}
		const base = options.env?.["ANTHROPIC_BASE_URL"] ?? "";
		await fetch(`${base}/v1/messages`, {
			method: "POST",
			body: JSON.stringify({
				model: "claude-opus-5-5",
				max_tokens: 2000,
				stream: true,
				system: await readFile(
					join(
						argv[argv.indexOf("--plugin-dir") + 1] ?? "",
						"output-styles/Concise.md",
					),
					"utf8",
				),
				messages: [{ role: "user", content: argv[2] }],
			}),
		});
		return { code: 0, stdout: "", stderr: "", timedOut: false };
	};

describe("`just eval --style` without `--run`", () => {
	test("prints 60 sessions and the token bound, and starts only the measuring sessions", async () => {
		const calls: string[][] = [];
		const lines: string[] = [];
		const prefix = join(await mkdtemp(join(tmpdir(), "style-run-")), "s-");
		const code = await styleMain([], {
			run: stubRunner(calls),
			out: (line) => lines.push(line),
			root: ROOT,
			tempPrefix: prefix,
		});
		expect(code).toBe(0);
		expect(lines.filter((line) => line.startsWith("session "))).toHaveLength(
			60,
		);
		expect(lines.some((line) => line.startsWith("total: at most "))).toBe(true);
		expect(lines.at(-1)).toContain("Plan only. Nothing ran.");
		// one `git show` and one measuring session for each of the two arms
		expect(calls.filter((argv) => argv[0] === "claude")).toHaveLength(2);
	});
});

describe("`just eval --style --run`", () => {
	test("prints the failing reply and the measured spend after the counts", async () => {
		const lines: string[] = [];
		const base = stubRunner([]);
		const reply = JSON.stringify({
			type: "result",
			is_error: false,
			result: "Sorry about that.",
			modelUsage: { "claude-opus-5-5": { inputTokens: 700 } },
		});
		const prefix = join(await mkdtemp(join(tmpdir(), "style-run-")), "s-");
		const code = await styleMain(
			["--run", "--case", "no-rating", "--arm", "new", "--runs", "1"],
			{
				run: async (argv, options) => {
					// a measuring session posts to the fake API; a graded one has no base URL
					if (argv[0] !== "claude") {
						return base(argv, options);
					}
					if (options.env?.["ANTHROPIC_BASE_URL"] !== undefined) {
						await base(argv, options);
					}
					return { code: 0, stdout: reply, stderr: "", timedOut: false };
				},
				out: (line) => lines.push(line),
				root: ROOT,
				tempPrefix: prefix,
			},
		);
		expect(code).toBe(0);
		expect(lines).toContain("fail no-rating | new | run 1 | Sorry about that.");
		expect(lines.at(-1)).toStartWith(
			"measured: 700 tokens in 1 of 1 sessions, ",
		);
	});
});
