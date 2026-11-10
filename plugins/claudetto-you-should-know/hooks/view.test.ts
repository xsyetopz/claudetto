import type { On, RenderSurface } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { blankRow, type Row } from "./note.ts";

const PLUGIN = "claudetto-you-should-know";
const LINE = "Tests run in order.";
const CARDS = [1, 2, 3, 4, 5]
	.map(
		(n) =>
			`**Card ${n}**\nLead ${n}.\n\`\`\`\nsketch ${n}\n\`\`\`\nCaption ${n}.`,
	)
	.join("\n");

const row = (kind: "offer" | "asked" | "explained", explanation = ""): Row => ({
	...blankRow("s1"),
	view: { kind, line: LINE, explanation, shownAt: 1000 },
});

const mount = ($: Engine, surface: RenderSurface) =>
	$.ui.mount({
		plugin: PLUGIN,
		surface,
		component: "AbovePrompt",
		props: {
			hasSurvey: false,
			isCollapsed: false,
			isWorking: false,
			maxRows: 12,
			bodyColumns: 80,
			scroll: { offset: 0, bodyRows: 12 },
			view: {},
		},
	});

const open = (on: On, held: Row) => {
	on("store.get", (_$, e) => ({
		value: e.key === "sessions" ? [held] : undefined,
	}));
	on("session.id", () => ({ value: "s1" }));
	on("ui.invalidate", () => ({ value: undefined }));
	on("ui.render", () => ({ type: "Box" }));
};

for (const surface of ["terminal", "desktop"] as const) {
	test(
		`the explained view on ${surface} draws four cards and the three buttons`,
		{ options: { sideCheckEnabled: true } },
		async ($: Engine, on: On) => {
			open(on, row("explained", CARDS));

			const band = await mount($, surface);

			const awaited = await band.findAll({ type: "Text" });
			const titles = awaited
				.map((text) => text.text)
				.filter((text) => text?.startsWith("Card "));
			expect(titles).toEqual(["Card 1", "Card 2", "Card 3", "Card 4"]);
			const awaited2 = await band.findAll({ type: "Button" });
			const buttons = awaited2.map((button) => button.props["label"]);
			expect(buttons).toEqual([
				"Understood",
				"Chat in main session",
				"Dismiss",
			]);
		},
	);
}
