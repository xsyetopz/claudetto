import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import {
	firstPath,
	firstText,
	goal,
	HANDOFF_PATH,
	KEY,
	startup,
} from "../handoff.mock.ts";
import { readBackKey } from "./read-back.ts";

const FIELDS = {
	goal: "ship the cut",
	standing: "never restore the deletions",
	state: "done: parser",
	decisions: "table over regex",
	next_prompt: "run the suite",
};

const STATUS = "## main...origin/main [ahead 3]";

type Step = "clear" | "goal" | "submit" | "write";

interface Seen {
	readonly calls: string[];
	readonly files: { path: string; text: string }[];
	fails: Step | undefined;
}

const reach = (seen: Seen, step: Step): void => {
	if (step === seen.fails) {
		throw new Error(`${step} refused`);
	}
};

const wire = (on: On, seen: Seen): void => {
	on("session.root", () => ({ value: "/repo" }));
	on("store.set", { key: [readBackKey("/repo")] }, (_$, e, next) => {
		seen.calls.push(`taken:${String(e.value)}`);
		return next(e);
	});
	on("fs.write", (_$, e) => {
		if (seen.fails === "write") {
			return { deny: "disk full" };
		}
		seen.files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("ui.log", (_$, e) => {
		seen.calls.push(`log:${e.text}`);
		return { value: undefined };
	});
	on("turn.start", (_$, e) => ({ turnId: e.turnId }));
	on("turn.abort", (_$, e) => {
		seen.calls.push(`abort:${e.turnId}`);
		return { value: undefined };
	});
	on("prompt.submit", (_$, e) => {
		reach(seen, "submit");
		seen.calls.push(`submit:${e.text}`);
		return e;
	});
	on("command.run", (_$, e) => {
		reach(seen, e.command === "goal" ? "goal" : "clear");
		seen.calls.push(e.command === "goal" ? `goal:${e.args}` : e.command);
		return {};
	});
};

/** The engine beneath a handoff call in turn `t1`, after the user's `/goal` when one is given; `fails` names the step the engine refuses from then on. The timer that clears runs on `clock.advance`. */
const lab = async (
	$: Engine,
	on: On,
	given: { fails?: Step; goal?: string } = {},
) => {
	const seen: Seen = { calls: [], files: [], fails: undefined };
	const clock = mock.clock(on, { now: 0 });
	wire(on, seen);
	startup(on, STATUS);
	await $.turn.start({ text: "", turnId: "t1" });
	if (given.goal !== undefined) {
		await goal($, given.goal);
	}
	seen.calls.length = 0;
	seen.fails = given.fails;
	return { calls: seen.calls, files: seen.files, clock };
};

const handOff = async (
	$: Engine,
	input: Readonly<Record<string, string>> = FIELDS,
): Promise<string> => {
	const out = await $.tool.call({ tool: "mcp__claudetto__handoff", ...input });
	return String(out.result);
};

const kinds = (calls: readonly string[]): (string | undefined)[] =>
	calls.map((call) => call.split(":")[0]);

test("the tool writes the file with its fields under the nine headings and no other", async ($: Engine, on: On) => {
	const { files } = await lab($, on);

	await handOff($);

	const text = firstText(files);
	const headings = text.split("\n").filter((line) => line.startsWith("## "));
	expect(headings).toEqual([
		"## Goal",
		"## Standing Instructions",
		"## Decisions Log",
		"## Current State",
		"## In Progress",
		"## Next Steps",
		"## Key Files And Symbols",
		"## Gotchas And Dead Ends",
		"## Open Questions",
	]);
	expect(text).toContain("ship the cut");
	expect(text).toContain("table over regex");
	expect(firstPath(files).slice("/repo/".length)).toMatch(HANDOFF_PATH);
});

test("Git State Is Dated: the tool's handoff states the git status line as of its write time", async ($: Engine, on: On) => {
	const { files } = await lab($, on);

	await handOff($);

	const text = firstText(files);
	const at = /Written by Claude at (\S+)\./u.exec(text)?.[1];
	expect(at).toBeDefined();
	expect(
		text.split("## Current State")[1]?.split("## In Progress")[0],
	).toContain(`Git as of ${at}: \`${STATUS}\``);
});

test("a call without a required field writes nothing and names the field", async ($: Engine, on: On) => {
	const { files, calls, clock } = await lab($, on);

	const result = await handOff($, { ...FIELDS, state: " " });
	await clock.advance(1);

	expect(files).toEqual([]);
	expect(calls).toEqual([]);
	expect(result).toContain("state");
});

test("a key in a field is redacted in the file and in the next prompt", async ($: Engine, on: On) => {
	const { files, calls, clock } = await lab($, on);

	await handOff($, { ...FIELDS, next_prompt: `use ${KEY}` });
	await clock.advance(1);

	expect(firstText(files)).not.toContain(KEY);
	expect(kinds(calls)).toContain("submit");
	expect(calls.join("\n")).not.toContain(KEY);
});

test("the turn ends with no further request, and the clear and the submit wait for the idle", async ($: Engine, on: On) => {
	const { calls, clock } = await lab($, on);

	await handOff($);

	expect(calls).toEqual(["abort:t1"]);
	await clock.advance(1);
	expect(kinds(calls.slice(1, 4))).toEqual(["clear", "taken", "submit"]);
});

test("a second call while one runs runs no second clear and no second submit", async ($: Engine, on: On) => {
	const { calls, clock } = await lab($, on);

	await handOff($);
	const second = await handOff($);
	await clock.advance(1);

	expect(second).toContain("already in progress");
	expect(kinds(calls).filter((kind) => kind === "clear")).toHaveLength(1);
	expect(kinds(calls).filter((kind) => kind === "submit")).toHaveLength(1);
});

test("the tool can hand off again after the first clear", async ($: Engine, on: On) => {
	const { calls, clock } = await lab($, on);

	await handOff($);
	await clock.advance(1);
	await handOff($);
	await clock.advance(1);

	expect(kinds(calls).filter((kind) => kind === "clear")).toHaveLength(2);
});

test("a failed clear submits nothing and says so", async ($: Engine, on: On) => {
	const { calls, clock } = await lab($, on, { fails: "clear" });

	await handOff($);
	await clock.advance(1);

	expect(calls.some((call) => call.startsWith("submit:"))).toBe(false);
	expect(calls.some((call) => call.includes("the clear failed"))).toBe(true);
});

test("a submit the session refuses tells the user in one line", async ($: Engine, on: On) => {
	const { calls, clock } = await lab($, on, { fails: "submit" });

	await handOff($);
	await clock.advance(1);

	expect(calls.filter((call) => call.includes("was not sent"))).toHaveLength(1);
});

test("a write that fails comes back as the result and clears nothing", async ($: Engine, on: On) => {
	const { calls, clock } = await lab($, on, { fails: "write" });

	const result = await handOff($);
	await clock.advance(1);

	expect(result).toContain("disk full");
	expect(calls).toEqual([]);
});

test("an active goal is set again after the clear and before the submit", async ($: Engine, on: On) => {
	const { calls, clock } = await lab($, on, { goal: "all tests pass" });

	await handOff($);
	await clock.advance(1);

	expect(kinds(calls.slice(1))).toEqual(["clear", "taken", "goal", "submit"]);
	expect(calls).toContain("goal:all tests pass");
});

test("no goal is set after a clear when none was active", async ($: Engine, on: On) => {
	const { calls, clock } = await lab($, on);

	await handOff($);
	await clock.advance(1);

	expect(calls.filter((call) => call.startsWith("goal"))).toEqual([]);
});

test("a goal the engine refuses is named, and the handoff is still sent", async ($: Engine, on: On) => {
	const { calls, clock } = await lab($, on, { fails: "goal", goal: "done" });

	await handOff($);
	await clock.advance(1);

	expect(calls.some((call) => call.startsWith("log:"))).toBe(true);
	expect(calls.some((call) => call.startsWith("submit:"))).toBe(true);
});
