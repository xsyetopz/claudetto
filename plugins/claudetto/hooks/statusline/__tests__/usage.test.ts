import type { On, SessionUsage } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

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

/** Serves the engine calls the usage hooks make; returns the opened panes. */
const serve = (on: On, usage: SessionUsage | (() => SessionUsage)) => {
	const opened: string[] = [];
	on("env.get", (_$, e) => ({
		value: e.name === "CLAUDE_CONFIG_DIR" ? "/cfg" : undefined
	}));
	on("session.id", () => ({ value: "s1" }));
	on("clock.now", () => ({ value: NOW }));
	on("fs.write", () => ({ value: undefined }));
	on("session.usage", () => ({
		value: typeof usage === "function" ? usage() : usage
	}));
	on("session.measure", (_$, e) => ({ changed: e.changed }));
	on("ui.open", (_$, e) => {
		opened.push(e.id);
		return { value: { isPlaced: true } };
	});
	return { opened };
};

describe("usage band and pane", () => {
	test("the 5h pane shows the use since the session's first reading, not the window's whole use", async ($, on) => {
		// Arrange
		let usage = USAGE;
		const { opened } = serve(on, () => usage);
		await $.session.measure({
			context: USAGE.context,
			rateLimits: USAGE.rateLimits,
			changed: ["rateLimits"]
		});
		usage = {
			...USAGE,
			rateLimits: [{ kind: "five_hour", percentUsed: 45, resetsAt: RESET }]
		};

		// Act
		await $.command.run({
			command: "breakdown",
			args: "5h",
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
		expect(opened).toEqual(["breakdown"]);
		expect(await pane.find({ text: /since then \+15%/u })).toBeDefined();
	});

	test("/breakdown ctx lists the context rows with their share", async ($, on) => {
		// Arrange
		serve(on, {
			...USAGE,
			context: {
				...USAGE.context,
				breakdown: {
					categories: [
						{
							name: "Messages",
							tokens: 60_000,
							color: "purple_FOR_SUBAGENTS_ONLY",
							isDeferred: false,
							kind: "used"
						}
					],
					totalTokens: 80_000,
					maxTokens: 200_000,
					rawMaxTokens: 200_000,
					autocompactSource: "model-default",
					percentage: 40,
					gridRows: [],
					model: "claude-opus-5-5",
					memoryFiles: [],
					mcpTools: [],
					agents: [],
					isAutoCompactEnabled: true,
					apiUsage: null
				}
			}
		});

		// Act
		await $.command.run({
			command: "breakdown",
			args: "ctx",
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
		expect(await pane.find({ text: /Messages\s+60k\s+30\.0%/u })).toBeDefined();
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
