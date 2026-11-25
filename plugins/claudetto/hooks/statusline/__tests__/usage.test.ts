import type { On, SessionUsage } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { readState } from "../line/state";

const NOW = Date.UTC(2026, 10, 25, 12, 0, 0);
const RESET = new Date(NOW + 9_000_000).toISOString();

const USAGE: SessionUsage = {
	startedAt: NOW,
	context: { window: 200_000, tokens: 80_000, percent: 40 },
	rateLimits: [{ kind: "five_hour", percentUsed: 30, resetsAt: RESET }]
};

const SCROLL = { offset: 0, bodyRows: 10 };
const BAND = {
	hasSurvey: false,
	isCollapsed: false,
	isWorking: false,
	maxRows: 3,
	bodyColumns: 100,
	scroll: SCROLL,
	view: {}
};
const PANE = {
	title: "Usage breakdown",
	isFocused: true,
	bodyColumns: 80,
	placement: "dock" as const,
	scroll: SCROLL,
	view: {}
};

/** Serves the engine calls the usage hooks make; returns the opened panes and a reader of the state file. */
const serve = (on: On, usage: SessionUsage) => {
	const files = new Map<string, string>();
	const opened: string[] = [];
	on("env.get", (_$, e) => ({
		value: e.name === "CLAUDE_CONFIG_DIR" ? "/cfg" : undefined
	}));
	on("session.id", () => ({ value: "s1" }));
	on("clock.now", () => ({ value: NOW }));
	on("fs.write", (_$, e) => {
		files.set(e.path, e.text);
		return { value: undefined };
	});
	on("session.usage", () => ({ value: usage }));
	on("session.measure", (_$, e) => ({ changed: e.changed }));
	on("ui.open", (_$, e) => {
		opened.push(e.id);
		return { value: { isPlaced: true } };
	});
	return {
		opened,
		state: () => readState(files.get("/cfg/claudetto/status/s1.json"))
	};
};

describe("usage band and pane", () => {
	test("a measure records the window baseline the band then splits its chip at", async ($, on) => {
		// Arrange
		const { state } = serve(on, USAGE);

		// Act
		await $.session.measure({
			context: USAGE.context,
			rateLimits: USAGE.rateLimits,
			changed: ["rateLimits"]
		});

		// Assert
		expect(state()?.limits).toEqual([
			{
				kind: "five_hour",
				before: 30,
				since: NOW,
				resetsAt: Date.parse(RESET) / 1000
			}
		]);
	});

	test("the band draws a chip per reading, and pressing one opens the pane on that window", async ($, on) => {
		// Arrange
		const { opened } = serve(on, USAGE);
		const band = await $.ui.mount({
			plugin: "claudetto",
			surface: "terminal",
			component: "AbovePrompt",
			props: BAND
		});

		// Act
		const chips = await band.findAll({ type: "Button" });
		await band.press({ key: "five_hour" });
		const pane = await $.ui.mount({
			plugin: "claudetto",
			surface: "terminal",
			component: "Pane",
			requestId: "breakdown",
			props: PANE
		});

		// Assert
		const heading = await pane.find({ type: "Text", text: /^5-hour window/u });
		expect(chips.map((chip) => chip.key)).toEqual(["ctx", "five_hour"]);
		expect(opened).toEqual(["breakdown"]);
		expect(heading?.text).toBe("5-hour window 30% used");
	});

	test("/breakdown 7d opens the pane on the 7-day window", async ($, on) => {
		// Arrange
		const { opened } = serve(on, USAGE);

		// Act
		const out = await $.command.run({
			command: "breakdown",
			args: "7d",
			origin: { kind: "composer" },
			presentation: { isFullscreen: false, columns: 80 }
		});
		const pane = await $.ui.mount({
			plugin: "claudetto",
			surface: "terminal",
			component: "Pane",
			requestId: "breakdown",
			props: PANE
		});

		// Assert
		expect(out.text).toBe("Usage breakdown opened.");
		expect(opened).toEqual(["breakdown"]);
		expect(await pane.find({ text: /No reading yet/u })).toBeDefined();
	});
});
