import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const ACCOUNT = JSON.stringify({
	oauthAccount: { organizationRateLimitTier: "default_claude_max_5x" },
});

const lab = (on: On, login: string = ACCOUNT): string[] => {
	const lines: string[] = [];
	mock.clock(on, { now: 1000 });
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined,
	}));
	on("fs.read", () => ({ value: login }));
	on("store.get", () => ({ value: undefined }));
	on("store.set", () => ({ value: undefined }));
	on("ui.log", (_$, e) => {
		lines.push(e.text);
		return { value: undefined };
	});
	on("turn.start", (_$, e) => ({ turnId: e.turnId }));
	on("turn.complete", () => ({ text: "" }));
	return lines;
};

const complete = ($: Engine, model: string, turnId: string, agentId?: string) =>
	$.turn.complete({
		answer: "",
		durationMs: 1,
		isAborted: false,
		reason: "answer",
		turnId,
		...(agentId === undefined ? {} : { agentId }),
		usage: {
			input_tokens: 1,
			output_tokens: 1,
			cache_read_input_tokens: 0,
			cache_creation_input_tokens: 0,
			model,
		},
	});

test("a response that names `claude-opus-5` while the row names `claude-opus-5-5` shows one line naming both", async ($: Engine, on: On) => {
	const lines = lab(on);

	await complete($, "claude-opus-5", "t1");

	expect(lines).toHaveLength(1);
	expect(lines[0]).toContain("`claude-opus-5`");
	expect(lines[0]).toContain("`claude-opus-5-5`");
});

test("a response of the model the row names shows nothing", async ($: Engine, on: On) => {
	const lines = lab(on);

	await complete($, "claude-opus-5-5", "t1");
	await complete($, "claude-sonnet-5-5", "t2", "a1");
	await complete($, "claude-haiku-5-5", "t3", "a2");

	expect(lines).toEqual([]);
});

test("the same model off the row twice in one session shows the line once", async ($: Engine, on: On) => {
	const lines = lab(on);

	await complete($, "claude-opus-5", "t1");
	await complete($, "claude-opus-5", "t2");

	expect(lines).toHaveLength(1);
});

test("another model off the row shows its own line", async ($: Engine, on: On) => {
	const lines = lab(on);

	await complete($, "claude-opus-5", "t1");
	await complete($, "claude-sonnet-5", "t2", "a1");

	expect(lines).toHaveLength(2);
	expect(lines[1]).toContain("`claude-sonnet-5-5`");
});

test("a login with no tier row shows nothing, since no row names a model", async ($: Engine, on: On) => {
	const lines = lab(on, "{}");

	await complete($, "claude-opus-5", "t1");

	expect(lines).toEqual([]);
});
