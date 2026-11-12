import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	registeredNames,
	stub,
} from "../../tool.call/useAdvisorTool/advisor.mock";

const advisor = ($: Engine, args: string) =>
	$.command.run({
		command: "advisor",
		args,
		origin: { kind: "composer" },
		presentation: { isFullscreen: true, columns: 80 },
	});

test("session.start registers /advisor", async ($: Engine, on: On) => {
	stub(on);

	const { commands } = await registeredNames($, on);

	expect(commands).toContain("advisor");
});

test("/advisor sends the question and each @-named file through the advisor call", async ($: Engine, on: On) => {
	const { sent, read } = stub(on, {
		files: { "/repo/a.ts": "export const a = 1;" },
	});

	const out = await advisor($, "Which queue for @a.ts?");

	expect(out).toEqual({ text: "Use a queue." });
	expect(read).toEqual(["/repo/a.ts"]);
	expect(sent[0]?.effort).toBe("high");
	expect(sent[0]?.prompt).toContain("Which queue for @a.ts?");
	expect(sent[0]?.prompt).toContain("export const a = 1;");
});

test("/advisor with no question says how to use it and sends nothing", async ($: Engine, on: On) => {
	const { sent } = stub(on);

	const out = await advisor($, "  ");

	expect(Reflect.get(out, "text")).toContain("/advisor");
	expect(sent).toEqual([]);
});
