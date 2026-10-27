// Behavior of the grader rules for the eval cases (eval-rebuild, "No Word Graders"):
// no `regex` grader reads the text of the model, and each paid eval recipe names its judge model.

import { expect, test } from "bun:test";
import { join } from "node:path";
import { file as bunFile, Glob, spawn, which } from "bun";
import { parse } from "yaml";

interface CaseGrader {
	type?: string;
	name?: string;
	target?: string | { source?: string };
	pattern?: string;
}

const ROOT = join(import.meta.dir, "../..");
const CASES = "plugins/*/evals/*/case.yaml";
// A trace pattern starts at the name of a tool call, so it reads a tool call and no reply.
const TOOL_CALL = '"name":"';

/** The source of the text that a `regex` grader reads, where no target means the last message. */
const sourceOf = (g: CaseGrader): string =>
	(typeof g.target === "string" ? g.target : g.target?.source) ??
	"last_message";

/** The names of the `regex` graders that read the text of the model. */
const wordGraders = (graders: CaseGrader[]): string[] =>
	graders
		.filter((g) => g.type === "regex")
		.filter((g) => {
			const source = sourceOf(g);
			return (
				source !== "file" &&
				!(source === "trace" && g.pattern?.includes(TOOL_CALL))
			);
		})
		.map((g) => g.name ?? "(unnamed)");

const cases = async (): Promise<{ file: string; graders: CaseGrader[] }[]> => {
	const out: { file: string; graders: CaseGrader[] }[] = [];
	for await (const f of new Glob(CASES).scan(ROOT)) {
		const doc = parse(await bunFile(join(ROOT, f)).text());
		out.push({ file: f, graders: doc?.graders ?? [] });
	}
	return out.sort((a, b) => a.file.localeCompare(b.file));
};

test("a `regex` grader with no target or a `last_message` target reads the reply", () => {
	expect(
		wordGraders([
			{ type: "regex", name: "a", pattern: "done" },
			{ type: "regex", name: "b", target: "last_message", pattern: "done" },
			{ type: "regex", name: "c", target: { source: "last_message" } },
		]),
	).toEqual(["a", "b", "c"]);
});

test("a `regex` grader over a file or a tool call of the trace passes", () => {
	expect(
		wordGraders([
			{ type: "regex", name: "f", target: { source: "file" }, pattern: "x" },
			{
				type: "regex",
				name: "t",
				target: "trace",
				pattern: '"name":"Edit"',
			},
			{ type: "tool_used", name: "u" },
			{ type: "llm", name: "j" },
		]),
	).toEqual([]);
});

test("a `regex` grader over the trace with no tool call in its pattern reads text", () => {
	expect(
		wordGraders([
			{ type: "regex", name: "w", target: "trace", pattern: "sorry" },
		]),
	).toEqual(["w"]);
});

test("no case of `plugins/` grades the reply with a `regex` grader", async () => {
	const faults = (await cases()).flatMap((c) =>
		wordGraders(c.graders).map((name) => `${c.file}: ${name}`),
	);
	expect(faults).toEqual([]);
});

// `claude plugin eval` has no judge key per grader, only `--judge-model` for the run (`claude plugin eval --help`).
// The PATH holds no `claude`, so a recipe that lacks the guard fails at the call and spends nothing.
const RECIPES: string[][] = [["eval"], ["eval-variant", "HEAD"]];

test.each(RECIPES)(
	"`just %s` with no `--judge-model` stops before the eval",
	async (...recipe: string[]) => {
		const path = ["bun", "just"]
			.map((bin) => join(which(bin) ?? "", ".."))
			.concat("/usr/bin", "/bin")
			.join(":");

		const run = spawn(["just", ...recipe, "--model", "haiku"], {
			cwd: ROOT,
			env: { PATH: path },
			stderr: "pipe",
		});

		expect(await run.exited).toBe(1);
		expect(await new Response(run.stderr).text()).toContain("`--judge-model`");
	},
);
