import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	act,
	fixture,
	inOrder,
	LINE,
	mountBand,
	offerReply,
	ON,
	openRow,
	PUSH,
	step,
	typed,
} from "./register.mock";

test("a new install with no option set makes no request and writes nothing", async ($: Engine, on: On) => {
	const f = fixture(on, { store: { sessions: [openRow("offer")] } });
	await typed($, "build the export");
	await act($, f, "t1");
	expect(f.asked).toHaveLength(0);
	expect(f.store.size).toBe(1);
	const band = await mountBand($);
	expect(await band.findAll({ type: "Button" })).toEqual([]);
});

test(
	"an old option name enabled: true leaves the observer off",
	{ options: { enabled: true } },
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1");
		expect(f.asked).toHaveLength(0);
	},
);

test(
	"a step with no tool call starts no check",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await inOrder([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], (index) =>
			step($, f, { turnId: "t1", index }),
		);
		expect(f.asked).toHaveLength(0);
	},
);

test(
	"a main-loop call waits for the check, and a note stops it before it runs and opens the view",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		f.answerWith(offerReply("Push waits for a passing full check."));
		const out = await act($, f, "t1");
		expect(f.asked).toHaveLength(1);
		expect(f.ran).toEqual([]);
		expect(out.deny).toContain("Push waits for a passing full check.");
		expect(f.row()?.view?.kind).toBe("offer");
	},
);

test(
	"a check with nothing to say lets the call run",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		const out = await act($, f, "t1");
		expect(f.asked).toHaveLength(1);
		expect(out.deny).toBeUndefined();
		expect(f.ran).toEqual(["Bash"]);
	},
);

test(
	"the check body ends with the call about to run",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1");
		expect(f.body().split("\n").at(-1)).toContain('"command":"git push"');
	},
);

test(
	"a read-only tool and a question to the person run with no check",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1", { tool: "Read", file_path: "a.md" });
		await $.tool.call({
			tool: "AskUserQuestion",
			questions: [
				{
					question: "Push now?",
					header: "Push",
					options: [
						{ label: "Yes", description: "Push it." },
						{ label: "No", description: "Keep it local." },
					],
					multiSelect: false,
				},
			],
		});
		expect(f.asked).toHaveLength(0);
		expect(f.ran).toEqual(["Read", "AskUserQuestion"]);
	},
);

test("a subagent's call runs with no check", ON, async ($: Engine, on: On) => {
	const f = fixture(on);
	await step($, f, { turnId: "t1", index: 1 });
	await $.tool.call({ ...PUSH, agentId: "a1" });
	expect(f.asked).toHaveLength(0);
	expect(f.ran).toEqual(["Bash"]);
});

test(
	"a note stops the call it judged, and another call of the turn runs with no new request",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		f.answerWith(offerReply(LINE));
		const judged = await act($, f, "t1", { ...PUSH, tool_use_id: "a" });
		const other = await $.tool.call({
			tool: "Write",
			file_path: "a",
			content: "",
			tool_use_id: "b",
		});
		const retry = await $.tool.call({ ...PUSH, tool_use_id: "a" });
		expect(f.asked).toHaveLength(1);
		expect(judged.deny).toContain(LINE);
		expect(other.deny).toBeUndefined();
		expect(retry.deny).toContain(LINE);
		expect(f.ran).toEqual(["Write"]);
	},
);

test(
	"a popup the person answers while this turn's note is open closes the note, and the next call runs",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		f.answerWith(offerReply(LINE));
		await act($, f, "t1");
		await $.tool.call({
			tool: "AskUserQuestion",
			questions: [
				{
					question: "Push now?",
					header: "Push",
					options: [
						{ label: "Yes", description: "Push it." },
						{ label: "No", description: "Keep it local." },
					],
					multiSelect: false,
				},
			],
		});
		const out = await $.tool.call(PUSH);
		expect(out.deny).toBeUndefined();
		expect(f.ran).toEqual(["AskUserQuestion", "Bash"]);
		expect(f.row()?.view).toBeNull();
		expect(f.asked).toHaveLength(1);
	},
);

test(
	"no check runs on a surface that draws no band",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { surfaces: ["vscode"] });
		await act($, f, "t1");
		expect(f.asked).toHaveLength(0);
	},
);

test(
	"a desktop surface is checked like a terminal",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { surfaces: ["desktop"] });
		await act($, f, "t1");
		expect(f.asked).toHaveLength(1);
	},
);

test("no check runs while a view is open", ON, async ($: Engine, on: On) => {
	const f = fixture(on, { store: { sessions: [openRow("offer")] } });
	await act($, f, "t1");
	expect(f.asked).toHaveLength(0);
});

test(
	"no check runs in a turn that already got an offer",
	ON,
	async ($: Engine, on: On) => {
		const row = { ...openRow("offer"), view: null, offeredTurn: "t1" };
		const f = fixture(on, { store: { sessions: [row] } });
		await act($, f, "t1");
		expect(f.asked).toHaveLength(0);
		expect(f.ran).toEqual(["Bash"]);
	},
);

test(
	"two calls in one response share one check, and its note stops only the call it judged",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		f.answerWith(offerReply(LINE));
		await step($, f, { turnId: "t1", index: 1 });
		const outs = await Promise.all([
			$.tool.call({ ...PUSH, tool_use_id: "a" }),
			$.tool.call({ tool: "Bash", command: "git tag v1", tool_use_id: "b" }),
		]);
		expect(f.asked).toHaveLength(1);
		expect(outs.map((o) => o.deny?.includes(LINE))).toEqual([true, undefined]);
		expect(f.ran).toEqual(["Bash"]);
	},
);

test(
	"a fault in the tool.call hook is logged with its cause and the call goes on",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { idFault: true });
		const lines: string[] = [];
		on("ui.log", (_$, e) => {
			lines.push(e.text);
			return { value: undefined };
		});
		const out = await $.tool.call(PUSH);
		expect(lines.join("\n")).toContain(
			"The side check failed (no implementation for session.id)",
		);
		expect(out.deny).toBeUndefined();
		expect(f.ran).toEqual(["Bash"]);
	},
);

test(
	"a check fault is swallowed and the person sees nothing",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { fault: true });
		await act($, f, "t1");
		expect(f.asked).toHaveLength(1);
		expect(f.row()?.view).toBeNull();
	},
);
