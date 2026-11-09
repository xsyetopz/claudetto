import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const lab = (
	on: On,
	files: [string, string][],
	asked: unknown[],
	theme: string | undefined,
) => {
	on("session.measure", (_$, e) => ({ changed: e.changed }));
	on("session.id", () => ({ value: "s-1" }));
	on("session.root", () => ({ value: "/work" }));
	on("session.usage", (_$, e) => {
		asked.push(e);
		return {
			value: {
				startedAt: 0,
				context: {
					window: 1_000_000,
					breakdown: { rawMaxTokens: 300_000 },
				},
				rateLimits: [],
			},
		} as never;
	});
	on("config.list", () => ({
		value: theme === undefined ? [] : ([{ key: "theme", value: theme }] as never),
	}));
	on("fs.write", (_$, e) => {
		files.push([e.path, e.text]);
		return { value: undefined };
	});
};

const measure = ($: Engine) =>
	$.session.measure({
		context: { window: 1_000_000 },
		rateLimits: [],
		changed: ["context"],
	});

test("each measured turn writes the compaction window and the theme for the status line, from the free summary", async ($: Engine, on: On) => {
	const files: [string, string][] = [];
	const asked: unknown[] = [];
	lab(on, files, asked, "light");
	await measure($);
	expect(files).toEqual([
		[
			"/work/.claude/claudetto/statusline/s-1.json",
			JSON.stringify({ window: 300_000, theme: "light" }),
		],
	]);
	expect(asked).toEqual([{ breakdown: "summary" }]);
});

test("a session with no theme row writes the window alone", async ($: Engine, on: On) => {
	const files: [string, string][] = [];
	lab(on, files, [], undefined);
	await measure($);
	expect(files[0]?.[1]).toBe(JSON.stringify({ window: 300_000 }));
});
