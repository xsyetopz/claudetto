// Lab tests of the `notes` slice: the band above the prompt, the rules, the `learn:` block, and the keys.
// The stubs answer the engine beneath the plugin, and no model runs.

import type { BackgroundTaskSummary, On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { isRecord } from "../modules/jev/domain/jev.ts";
import { ran, stubFreshSession, stubState } from "./stubs/process.ts";

const BAND = {
	plugin: "claudetto",
	surface: "terminal",
	component: "AbovePrompt",
	props: {
		hasSurvey: false,
		isWorking: false,
		maxRows: 10,
		bodyColumns: 80,
		scroll: { offset: 0, bodyRows: 9 },
		view: {},
	},
} as const;

const THREE = /\b3\b/;
/** A label that starts with a hotkey, which Claude Code draws a second time in front of a plain `Button` label. */
const HOTKEY_IN_LABEL = /\d: (Insert|Turn)/;

/** The text that the band shows now. */
const band = async ($: Engine): Promise<string> => {
	const ui = await $.ui.mount(BAND);
	const text = JSON.stringify(await ui.drawn());
	await ui.unmount();
	return text;
};

const noLedger: unknown[] = [];

/** Stubs the verdict of `tool.check` with a deny of one rule, the settings files, and the prompt box. */
const stub = (on: On, fills: string[] = []) => {
	const world = {
		isAllowed: false,
		now: 0,
		status: "",
		ledger: noLedger,
		file: "",
		store: new Map<string, unknown>(),
	};
	on("tool.check", () =>
		world.isAllowed
			? { decision: "allow" }
			: { decision: "deny", reason: "no", rule: "Bash(rm:*)" },
	);
	on("clock.now", () => ({ value: world.now }));
	on("process.run", (_$, e) =>
		ran(e.argv.includes("rev-parse") ? "/p\n" : world.status),
	);
	on("env.get", () => ({ value: "/tmp" }));
	on("fs.exists", (_$, e) => ({ value: e.path.endsWith(".jsonl") }));
	const { store } = world;
	stubState(on, store);
	on("turn.complete", (_$, e) => ({ text: e.answer }));
	stubModel(on);
	on("turn.start", () => ({ turnId: "t" }));
	on("classic.PostToolUseFailure", () => ({}));
	on("classic.PostToolUse", () => ({}));
	on("ui.render", (_$, e) => {
		const text = "text" in e.props ? e.props.text : undefined;
		return { type: "Text", props: {}, children: [String(text ?? "")] };
	});
	on("session.root", () => ({ value: "/p" }));
	on("session.cwd", () => ({ value: "/p" }));
	on("store.get", () => ({ value: world.ledger }));
	on("fs.read", (_$, e) => {
		if (e.path.endsWith("settings.local.json")) {
			return { value: '{"permissions":{"deny":["Bash(rm:*)"]}}' };
		}
		if (e.path === "/p/src/a.ts") {
			return { value: world.file };
		}
		return { deny: "ENOENT" };
	});
	on("prompt.fill", (_$, e) => {
		fills.push(e.text);
		return { isFilled: true };
	});
	stubFreshSession(on);
	on("classic.Stop", () => ({}));
	return world;
};

const TASK = { id: "b1", type: "shell", status: "running", description: "d" };

const stop = ($: Engine, tasks: BackgroundTaskSummary[]) =>
	$.classic.Stop({
		stop_hook_active: false,
		last_assistant_message: "## the side check",
		background_tasks: tasks,
	});

const MINUTE = 60_000;

const deny = ($: Engine) =>
	$.tool.check({ tool: "Bash", input: { command: "echo hi" } });

/** The reply of the stub model, in pieces that cut each line in two. */
let reply = "";

/** Stubs the model beneath the hooks: it streams `reply`. */
const stubModel = (on: On) =>
	on("turn.step", async function* (_$, e) {
		for (const text of reply.match(/[^\n]{1,4}\n?|\n/g) ?? []) {
			yield { kind: "text" as const, index: 0, text };
		}
		yield {
			kind: "stop" as const,
			stopReason: "end_turn" as const,
			usage: null,
		};
		return {
			turnId: e.turnId,
			index: e.index,
			answer: reply,
			toolUses: [],
			stopReason: "end_turn" as const,
			usage: null,
		};
	});

/** Streams `text` as a main reply, completes the turn, and gives the text that the hooks let through. */
const answer = async ($: Engine, text: string): Promise<string> => {
	reply = text;
	let shown = "";
	const step = { turnId: "t1", index: 0, model: "m", messageCount: 1 };
	for await (const c of $.turn.step(step)) {
		if (c.kind === "text") {
			shown += c.text;
		}
	}
	await $.turn.complete({
		answer: shown,
		reason: "answer",
		durationMs: 1,
		isAborted: false,
		turnId: "t1",
	});
	return shown;
};

test("Repeated Deny: the third deny of one rule shows a note that names the rule", async ($: Engine, on: On) => {
	stub(on);
	await deny($);
	await deny($);
	expect(await band($)).not.toContain("Bash(rm:*)");
	await deny($);
	const text = await band($);
	expect(text).toContain("Bash(rm:*)");
	expect(text).toMatch(THREE);
});

test("Learn Reply: a main reply that ends with a learn block shows the tag and the line", async ($: Engine, on: On) => {
	stub(on);
	await answer(
		$,
		"Done.\nlearn: IS_DEMO also skips the trust dialog.\ntag: Heads up",
	);
	expect(await band($)).toContain(
		"Heads up · IS_DEMO also skips the trust dialog.",
	);
});

test("Learn Hidden: the learn block is not shown or recorded, and a subagent reply stays whole", async ($: Engine, on: On) => {
	stub(on);
	expect(await answer($, "Done.\n\nlearn: x\ntag: Heads up\nexplain: y")).toBe(
		"Done.",
	);
	reply = "Done.\nlearn: x";
	let sub = "";
	const step = { turnId: "t1", index: 0, model: "m", messageCount: 1 };
	for await (const c of $.turn.step({ ...step, agentId: "a1" })) {
		if (c.kind === "text") {
			sub += c.text;
		}
	}
	expect(sub).toBe(reply);
});

test("Learn None: a reply with `learn: none` shows no note", async ($: Engine, on: On) => {
	stub(on);
	await answer($, "Done.\nlearn: none");
	expect(await band($)).not.toContain("·");
});

test("the learn block is not drawn in the reply", async ($: Engine, on: On) => {
	stub(on);
	const ui = await $.ui.mount({
		plugin: "claudetto",
		surface: "terminal",
		component: "AssistantMessage",
		props: { text: "Done.\nlearn: x\ntag: Heads up", isFirstOfReply: true },
	});
	const text = JSON.stringify(await ui.drawn());
	expect(text).toContain("Done.");
	expect(text).not.toContain("learn:");
	await ui.unmount();
});

test("Note into Prompt: the insert key puts the intro and the explanation in the prompt box", async ($: Engine, on: On) => {
	const fills: string[] = [];
	stub(on, fills);
	await answer(
		$,
		"Done.\nlearn: Line one.\ntag: Heads up\nexplain:\nThe long text.",
	);
	const ui = await $.ui.mount(BAND);
	await ui.press({ key: "insert" });
	expect(fills[0]).toContain("The long text.");
	await ui.unmount();
});

test("Notes Off: the off key hides the note, and the on key brings the keys back", async ($: Engine, on: On) => {
	stub(on);
	await answer($, "Done.\nlearn: Line one.\ntag: Heads up");
	const ui = await $.ui.mount(BAND);
	await ui.press({ key: "off" });
	await ui.unmount();
	expect(await band($)).not.toContain("Line one.");
	await answer($, "Done.\nlearn: Line two.\ntag: Heads up");
	expect(await band($)).not.toContain("Line two.");
});

test("Key Labels: each key shows its hotkey once", async ($: Engine, on: On) => {
	stub(on);
	await answer($, "Done.\nlearn: Line one.\ntag: Heads up");
	const shown = await band($);
	const ui = await $.ui.mount(BAND);
	await ui.press({ key: "off" });
	await ui.unmount();
	const off = await band($);

	expect(shown).toContain("Insert in prompt");
	expect(off).toContain("Turn notes on");
	for (const text of [shown, off]) {
		expect(text).not.toMatch(HOTKEY_IN_LABEL);
	}
});

test("One Note at a Time: a newer note replaces the older one", async ($: Engine, on: On) => {
	stub(on);
	await answer($, "x\nlearn: First.\ntag: A");
	await answer($, "x\nlearn: Second.\ntag: B");
	const text = await band($);
	expect(text).toContain("Second.");
	expect(text).not.toContain("First.");
});

test("Repeat Line: a line that was shown before shows no note", async ($: Engine, on: On) => {
	stub(on);
	await answer($, "x\nlearn: Same line.\ntag: A");
	await answer($, "x\nlearn: Other line.\ntag: A");
	await answer($, "x\nlearn: Same line.\ntag: A");
	expect(await band($)).toContain("Other line.");
});

test("Back-Off: after 3 ignored notes the next note is skipped", async ($: Engine, on: On) => {
	stub(on);
	await Array.fromAsync({ length: 3 }, async (_, i) => {
		await answer($, `x\nlearn: Note ${i}.\ntag: A`);
		await $.turn.start({ text: "go", turnId: "t" });
		await $.turn.start({ text: "go", turnId: "t" });
	});
	await answer($, "x\nlearn: Skipped one.\ntag: A");
	expect(await band($)).not.toContain("Skipped");
	await answer($, "x\nlearn: Shown two.\ntag: A");
	expect(await band($)).toContain("Shown two.");
});

test("Check Loop: the same check failing 3 times with the same test shows a note with the test and the count", async ($: Engine, on: On) => {
	stub(on);
	await Array.fromAsync({ length: 3 }, async (_, i) => {
		await $.classic.PostToolUseFailure({
			tool_name: "Bash",
			tool_input: { command: "just check" },
			tool_use_id: `t${i}`,
			error: "(fail) parses a goal [2ms]",
		});
	});
	const text = await band($);
	expect(text).toContain("just check");
	expect(text).toMatch(THREE);
	expect(text).toContain("parses a goal [2ms]");
});

test("Background Task: a task in flight for 30 minutes shows a note once", async ($: Engine, on: On) => {
	const world = stub(on);
	const task = { ...TASK, command: "bun run build" };
	await stop($, [task]);
	world.now = 29 * MINUTE;
	await stop($, [task]);
	expect(await band($)).not.toContain("bun run build");
	world.now = 31 * MINUTE;
	await stop($, [task]);
	const shown = await band($);
	expect(shown).toContain("bun run build");
	expect(shown).toContain("31 minutes");
	world.now = 45 * MINUTE;
	await stop($, [task]);
	expect(await band($)).not.toContain("45 minutes");
});

test("Background Task: a task that is gone leaves the record", async ($: Engine, on: On) => {
	const world = stub(on);
	await stop($, [TASK]);
	await stop($, []);
	world.now = 40 * MINUTE;
	await stop($, [TASK]);
	expect(await band($)).not.toContain("40 minutes");
});

const edit = ($: Engine) =>
	$.tool.check({
		tool: "Edit",
		input: { file_path: "/p/src/a.ts" },
	});

test("User Edit: an edit of a file with a change that no ledger line made shows a note", async ($: Engine, on: On) => {
	const world = stub(on);
	world.isAllowed = true;
	world.status = " M src/a.ts\0";
	world.file = "by the user";
	await edit($);
	expect(await band($)).toContain("src/a.ts");
});

test("User Edit: a file that a ledger line made with its hash shows no note", async ($: Engine, on: On) => {
	const world = stub(on);
	world.isAllowed = true;
	world.status = " M src/a.ts\0";
	world.file = "by claude";
	world.ledger = [
		{
			path: "/p/src/a.ts",
			hash: "baafca602d49bda6",
			session: "s",
			agent: "a",
			via: "edit",
		},
	];
	await edit($);
	expect(await band($)).not.toContain("src/a.ts");
});

test("User Edit: a file that git shows as unchanged shows no note", async ($: Engine, on: On) => {
	const world = stub(on);
	world.isAllowed = true;
	world.file = "x";
	await edit($);
	expect(await band($)).not.toContain("src/a.ts");
});

test("Three Stops: a plain stop runs the stop hooks of finish, guard, and notes", async ($: Engine, on: On) => {
	const world = stub(on);
	const out = await stop($, [TASK]);
	expect(out.block).toBeUndefined();
	expect(world.store.get("note")).toBeDefined();
	expect(world.store.has("watches")).toBe(true);
	const notes = world.store.get("notes");
	expect(isRecord(notes) ? notes["seen"] : undefined).toHaveProperty("b1");
});
