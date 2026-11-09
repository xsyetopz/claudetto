import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const REPLY_TEXT = "First point.\nstill first.\n\nSecond point.\n\nThird point.";

const lab = (on: On, selected?: string) => {
	const filled: string[] = [];
	on("ui.selection", () => ({
		value: selected === undefined ? undefined : { text: selected },
	}));
	on("session.messages", () => ({
		value: [
			{ role: "user", text: "q", toolUses: [] },
			{ role: "assistant", text: REPLY_TEXT, toolUses: [] },
			{ role: "assistant", text: "", toolUses: [] },
		] as SessionMessage[],
	}));
	on("prompt.fill", (_$, e) => {
		filled.push(`${e.mode}:${e.text}`);
		return { isFilled: true };
	});
	return filled;
};
const reply = ($: Engine, args = "") =>
	$.command.run({
		command: "reply",
		args,
		origin: { kind: "composer" },
		presentation: { isFullscreen: true, columns: 80 },
	});

test("a mouse selection is quoted into the prompt as a Re: block", async ($: Engine, on: On) => {
	const filled = lab(on, "Second point.");
	await reply($);
	expect(filled).toEqual(["append:Re:\n> Second point.\n\n"]);
});

test("/reply N quotes paragraph N of the last reply, every line prefixed", async ($: Engine, on: On) => {
	const filled = lab(on);
	await reply($, "1");
	expect(filled).toEqual(["append:Re:\n> First point.\n> still first.\n\n"]);
});

test("bare /reply with no selection lists the paragraphs and fills nothing", async ($: Engine, on: On) => {
	const filled = lab(on);
	const out = await reply($);
	expect(filled).toEqual([]);
	expect(out.text).toContain("2. Second point.");
});

test("a number past the last paragraph fills nothing", async ($: Engine, on: On) => {
	const filled = lab(on);
	await reply($, "9");
	expect(filled).toEqual([]);
});

test("session.start registers /reply", async ($: Engine, on: On) => {
	const names: string[] = [];
	on("session.start", () => ({ cwd: "/repo" }));
	on("tool.register", (_$, e) => ({ value: { tool: `mcp__claudetto__${e.name}` } }));
	on("command.register", (_$, e) => {
		names.push(e.name);
		return { value: { command: e.name } };
	});
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: true });
	expect(names).toContain("reply");
});
