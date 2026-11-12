import type { On, SessionUsage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "../secrets.mock.ts";

type Reading = Pick<SessionUsage, "context" | "rateLimits">;

const AFTER: Reading = {
	context: { tokens: 76_000, window: 200_000, percent: 38 },
	rateLimits: [
		{ kind: "five_hour", percentUsed: 23.5 },
		{ kind: "seven_day", percentUsed: 41 },
	],
};

const LINE =
	"Budget: context 62% left, five-hour 23.5% used, seven-day 41% used";

const lab = (on: On, reading: Reading = AFTER) => {
	scanner(on);
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", () => ({ value: false }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.root", () => ({ value: "/repo" }));
	on("session.usage", () => ({ value: { startedAt: 0, ...reading } }));
	on("tool.call", () => ({
		result: { stdout: "scored 3 of 4", stderr: "" },
		text: "scored 3 of 4",
	}));
};

const run = ($: Engine, command: string) =>
	$.tool.call({ tool: "Bash", tool_use_id: "toolu_1", command });

const stdoutOf = (out: { readonly result?: unknown }): string => {
	const { result } = out;
	return typeof result === "object" &&
		result !== null &&
		"stdout" in result &&
		typeof result.stdout === "string"
		? result.stdout
		: "";
};

test("a run that calls the model ends with the Budget line, with no prompt between", async ($: Engine, on: On) => {
	lab(on);

	const out = await run($, 'claude -p "grade the cases" --max-turns 3');

	expect(stdoutOf(out)).toBe(`scored 3 of 4\n${LINE}`);
	expect(out.text).toBe(`scored 3 of 4\n${LINE}`);
});

test("a run with the paid flag ends with the Budget line", async ($: Engine, on: On) => {
	lab(on);

	const out = await run($, "bun tools/handover-probe/probe.ts --paid");

	expect(stdoutOf(out)).toContain(LINE);
});

test("a command that calls no model is left whole", async ($: Engine, on: On) => {
	lab(on);

	const out = await run($, "echo claude -p");

	expect(stdoutOf(out)).toBe("scored 3 of 4");
	expect(out.text).toBe("scored 3 of 4");
});

test("a run with no reading from the login is left whole", async ($: Engine, on: On) => {
	lab(on, { context: { window: 200_000 }, rateLimits: [] });

	const out = await run($, "claude -p x");

	expect(stdoutOf(out)).toBe("scored 3 of 4");
});
