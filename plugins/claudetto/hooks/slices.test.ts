import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { scanned } from "./secrets.mock.ts";

const lab = (
	on: On,
	status: string,
	commit: "allow" | "deny" = "allow",
	runs: string[][] = [],
	answer = '{"faults":[]}',
	stopped: { block?: string } = {},
) => {
	on("process.run", (_$, e) => {
		if (e.argv[0] === "git") {
			runs.push([...e.argv]);
			return {
				value: {
					exitCode: 0,
					stdout: status,
					stderr: "",
					isStdoutTruncated: false,
					isStderrTruncated: false,
				},
			};
		}
		return scanned(e);
	});
	on("classic.Stop", () => stopped);
	on("session.messages", () => ({ value: [] }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", () => ({ value: true }));
	on("model.complete", () => ({
		value: {
			isAnswered: true,
			text: answer,
			usage: { inputTokens: 1, outputTokens: 1 },
		},
	}));
	on("tool.check", (_$, e) => ({
		decision: e.tool === "Bash" ? commit : "allow",
	}));
	on("tool.call", () => ({ result: {} }));
};

const edit = ($: Engine, file_path = "/repo/src/a.ts") =>
	$.tool.call({
		tool: "Edit",
		tool_use_id: "t1",
		file_path,
		old_string: "a",
		new_string: "b",
	});

const stop = ($: Engine, active = false) =>
	$.classic.Stop({
		stop_hook_active: active,
		last_assistant_message: "Done.",
		background_tasks: [],
	});

test("a stop with an edited file git reports changed is blocked, and the block names it", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, " M src/a.ts\n", "allow", runs);
	await edit($);
	const out = await stop($);
	expect(out.block).toContain("`src/a.ts`");
	expect(out.block).toContain("one revertable change per commit");
	expect(runs).toEqual([
		["git", "status", "--porcelain", "--", "/repo/src/a.ts"],
	]);
});

test("a committed edit passes", async ($: Engine, on: On) => {
	lab(on, "");
	await edit($);
	expect((await stop($)).block).toBeUndefined();
});

test("a stop with no write runs no git and passes", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, " M src/a.ts\n", "allow", runs);
	expect((await stop($)).block).toBeUndefined();
	expect(runs).toEqual([]);
});

test("when the permission chain denies a commit, the stop passes", async ($: Engine, on: On) => {
	lab(on, " M src/a.ts\n", "deny");
	await edit($);
	expect((await stop($)).block).toBeUndefined();
});

test("a stop the hook already continued passes", async ($: Engine, on: On) => {
	lab(on, " M src/a.ts\n");
	await edit($);
	expect((await stop($, true)).block).toBeUndefined();
});

test("a no-commit constraint from the user, through the ledger, lets the stop pass", async ($: Engine, on: On) => {
	lab(
		on,
		" M src/a.ts\n",
		"allow",
		[],
		'{"kind":"task","constraints":[{"text":"Do not commit.","rule":"no-commit"}]}',
	);
	on("prompt.submit", (_$, e) => e);
	await $.prompt.submit({
		text: "Fix it, but do not commit.",
		wait: false,
		origin: { kind: "composer" },
	});
	await edit($);
	expect((await stop($)).block).toBeUndefined();
});

test("a stop another check blocked keeps that block", async ($: Engine, on: On) => {
	lab(on, " M src/a.ts\n", "allow", [], undefined, { block: "Other check." });
	await edit($);
	expect((await stop($)).block).toBe("Other check.");
});
