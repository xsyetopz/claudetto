// The starter files ride the setup command's dialog, so they take no model turn either.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { questionOf, run } from "./support.ts";

const FILE = "/home/u/.claude/settings.json";

interface Lab {
	readonly written: Map<string, string>;
	readonly asked: string[];
}

const ok = (stdout: string) => ({
	value: {
		stdout,
		stderr: "",
		exitCode: 0,
		isStdoutTruncated: false,
		isStderrTruncated: false,
	},
});

/** A repo at `/r` that holds `files`, a settings file that already holds every key, and `held` files on disk. */
const lab = (
	on: On,
	files: readonly string[],
	held: readonly string[],
	answer: string,
	appearing: readonly string[] = [],
): Lab => {
	const state: Lab = { written: new Map(), asked: [] };
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined,
	}));
	on("session.cwd", () => ({ value: "/r" }));
	on("fs.exists", (_$, e) => ({
		value:
			e.path === FILE ||
			held.some((name) => e.path === `/r/${name}`) ||
			(state.asked.some((q) => q.includes("Write these files?")) &&
				appearing.some((name) => e.path === `/r/${name}`)) ||
			state.written.has(e.path),
	}));
	on("fs.read", (_$, e) => {
		if (e.path === FILE) {
			return { value: "{}" };
		}
		throw new Error("no file");
	});
	on("fs.write", (_$, e) => {
		state.written.set(e.path, e.text);
		return { value: undefined };
	});
	on("process.run", (_$, e) =>
		ok(e.argv[0] === "uname" ? "Darwin\n" : files.join("\n")),
	);
	on("tool.call", (_$, e, next) => {
		if (e.tool !== "AskUserQuestion") {
			return next(e);
		}
		const question = questionOf(e);
		state.asked.push(question);
		const starter = question.includes("Write these files?");
		return { result: { answers: { [question]: starter ? answer : "" } } };
	});
	return state;
};

test("a repo with neither file is shown the starter files, and a Write writes them", async ($: Engine, on: On) => {
	const state = lab(on, ["Cargo.toml", "src/main.rs"], [], "Write");

	const text = await run($);

	expect(state.asked.some((q) => q.includes("+++ AGENTS.md"))).toBe(true);
	expect(state.written.get("/r/CLAUDE.md")).toBe(`# CLAUDE.md

@AGENTS.md
`);
	expect(state.written.get("/r/AGENTS.md")).toContain("cargo build -q");
	expect(text).toContain("Wrote `/r/AGENTS.md`.");
});

test("a Skip writes no starter file", async ($: Engine, on: On) => {
	const state = lab(on, ["Cargo.toml"], [], "Skip");

	const text = await run($);

	expect(state.written.has("/r/AGENTS.md")).toBe(false);
	expect(text).toContain("Wrote no starter file.");
});

test("a repo with an AGENTS.md is offered nothing", async ($: Engine, on: On) => {
	const state = lab(on, ["Cargo.toml"], ["AGENTS.md"], "Write");

	await run($);

	expect(state.asked.some((q) => q.includes("Write these files?"))).toBe(false);
});

test("a file that appears after the question is not overwritten", async ($: Engine, on: On) => {
	const state = lab(on, ["Cargo.toml"], [], "Write", ["CLAUDE.md"]);

	const text = await run($);

	expect(state.written.has("/r/CLAUDE.md")).toBe(false);
	expect(text).toContain("`/r/CLAUDE.md` exists");
});
