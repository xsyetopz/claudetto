import type {
	EngineInterface,
	On,
	RenderElement,
	RenderInput
} from "claude-code";

import { fault } from "../../shared/fault";
import type { Live } from "../live";
import { contextLines } from "./context";
import { limitLines } from "./limit";
import { registerLimitNote } from "./note";
import { type Line, type Run, type Tab, TABS } from "./runs";

/** The pane's id, and the slash command that opens it (`/usage` is a built-in name, which registration refuses). */
const PANE = "breakdown";
const TITLE = "Usage breakdown";
/** The most cells a pane bar takes, so a wide terminal keeps it readable. */
const PANE_CELLS = 60;

/** Matches every value of a string field; see `ANY` in `../live`. */
const ANY = /^/u;

type Surface = ReturnType<EngineInterface["ui"]["resolve"]>;

/** The view the pane shows; one per registration, as a hook instance is one session's. */
interface View {
	tab: Tab;
}

/** A run as a Text element in its theme key. */
const textOf = ({ Text }: Surface, item: Run): RenderElement =>
	Text({
		...(item.color === undefined ? {} : { color: item.color }),
		...(item.dim === undefined ? {} : { dimColor: true }),
		children: item.text
	});

/** One line of runs as one Text. */
const lineOf = (surface: Surface, line: Line): RenderElement =>
	surface.Text({ children: line.map((item) => textOf(surface, item)) });

/** Sets the view and opens the pane on it. */
async function show($: EngineInterface, view: View, tab: Tab): Promise<void> {
	view.tab = tab;
	await $.ui.open({ id: PANE, title: TITLE, focus: true, closeOnEscape: true });
	$.ui.invalidate("ui.render");
}

/** The context view: /context's local estimate, free of API calls. */
async function contextBody($: EngineInterface, cells: number): Promise<Line[]> {
	const usage = await $.session.usage({ breakdown: "summary" });
	const { breakdown } = usage.context;
	return breakdown === undefined
		? [
				[
					{
						text: "No breakdown yet: it shows after the first response.",
						dim: true
					}
				]
			]
		: contextLines(breakdown, cells);
}

/** The pane body for `tab`. */
async function bodyOf(
	$: EngineInterface,
	live: Live,
	tab: Tab,
	cells: number
): Promise<Line[]> {
	if (tab === "ctx") {
		return contextBody($, cells);
	}
	const usage = await $.session.usage();
	const now = await $.clock.now();
	return limitLines(
		tab,
		usage.rateLimits.find((item) => item.kind === tab),
		live.state.limits?.find((item) => item.kind === tab),
		now,
		cells
	);
}

/** `/breakdown [ctx|5h|7d]`, which opens the pane on the named view or the last one. */
function registerCommand(on: On, view: View): void {
	// A refused registration is logged here rather than thrown: the
	// session.start hooks upstream would otherwise report it as their own failure.
	on("session.start", { cwd: ANY }, async ($, e, next) => {
		try {
			await $.command.register({
				name: PANE,
				description:
					"Show the context window by category and the 5h and 7d limits by pace",
				argumentHint: "[ctx|5h|7d]",
				immediate: true
			});
		} catch (error) {
			fault($, "usage command register", error);
		}
		return next(e);
	});

	on("command.run", { command: PANE }, async ($, e) => {
		const asked = TABS.find((item) => item.label === e.args.trim());
		await show($, view, asked?.tab ?? view.tab);
		return { text: `${TITLE} opened.` };
	}).catch(($, _e, next) => {
		fault($, "usage pane open", next.error);
		return { text: `${TITLE} could not open; the debug log names the cause.` };
	});
}

/** The pane: a tab row, then the chosen view's lines. */
function registerPane(on: On, live: Live, view: View): void {
	on(
		"ui.render",
		{ component: "Pane", requestId: PANE },
		async ($, e: RenderInput) => {
			const surface = $.ui.resolve(e);
			const { Box, Button } = surface;
			const cells = Math.max(
				10,
				Math.min(PANE_CELLS, (e.viewport?.columns ?? 80) - 6)
			);
			const { tab } = view;
			const lines = await bodyOf($, live, tab, cells);
			const tabs = TABS.map((item) =>
				Button({
					key: `tab-${item.tab}`,
					label: item.label,
					hotkey: item.hotkey,
					...(item.tab === tab ? { variant: "primary" as const } : {}),
					onPress: () => {
						view.tab = item.tab;
						$.ui.invalidate("ui.render");
					}
				})
			);
			return Box({
				flexDirection: "column",
				children: [
					Box({ gap: 1, children: tabs }),
					...lines.map((line) => lineOf(surface, line))
				]
			});
		}
	);
}

/**
 * The usage pane (ADR-0201), opened by `/breakdown` on the context window or
 * the 5h or 7d window. It draws no band above the prompt, since the status
 * line already shows those readings. The pane shows with /context's rows in /context's colours, or the window's use
 * before and since the session's first reading and CodexBar's pace.
 */
export function registerUsage(on: On, live: Live): void {
	const view: View = { tab: "ctx" };
	registerCommand(on, view);
	registerPane(on, live, view);
	registerLimitNote(on);
}
