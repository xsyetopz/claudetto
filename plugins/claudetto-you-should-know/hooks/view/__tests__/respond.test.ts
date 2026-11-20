import type { EngineInterface, On } from "claude-code";
import type { Engine } from "claude-code/testing";
import { expect, test } from "claude-code/testing";

import { rowsOf } from "../../session/rows";
import { newCtx } from "../../shared/context";
import { actionsFor } from "../actions";
import {
	RESPOND_BLOCKED,
	RESPOND_MAYBE_FILLED,
	RESPOND_NOT_FILLED
} from "../draft";

const LINE = "Tests run in order.";

/** An environment with nothing set. */
const NO_ENV: Record<string, string> = {};

/** Hands back the engine a hook receives, which the tests then override piece by piece. */
const hookEngine = async ($: Engine, on: On): Promise<EngineInterface> => {
	const seen: EngineInterface[] = [];
	on("prompt.submit", (engine, e) => {
		seen.push(engine);
		return { ...e };
	});
	await $.prompt.submit({
		text: "probe",
		origin: { kind: "composer" },
		wait: false
	});
	const [engine] = seen;
	if (engine === undefined) {
		throw new Error("the log hook did not run");
	}
	return engine;
};

/**
 * The test kit hands a plugin only a hook's refusal, which carries no cause (PromptFilled in the
 * claude-code types), so the dialog and no_composer branches are driven through a stand-in engine
 * that keeps the real one's other parts.
 */
const engine = async (
	$: Engine,
	on: On,
	fill: { isFilled: boolean; refusal?: "dialog" | "no_composer" | "unanswered" }
) => {
	const real = await hookEngine($, on);
	const kept = new Map<string, unknown>();
	const seen = {
		toasts: new Array<string>(),
		submitted: new Array<string>(),
		fills: new Array<string>()
	};
	const stand: EngineInterface = {
		...real,
		store: {
			...real.store,
			get: (key) => Promise.resolve(kept.get(key)),
			set: (key, value) => {
				kept.set(key, value);
				return Promise.resolve();
			}
		},
		ui: {
			...real.ui,
			toast: (text) => {
				seen.toasts.push(text);
			},
			invalidate: () => {
				// nothing is drawn in this stand-in
			}
		},
		prompt: {
			...real.prompt,
			read: () => Promise.resolve({ text: "", cursor: 0 }),
			fill: (input) => {
				seen.fills.push(input.text);
				return Promise.resolve({ ...fill, text: "", cursor: 0 });
			},
			submit: (input) => {
				seen.submitted.push(input.text);
				return Promise.resolve({ text: input.text });
			}
		},
		env: { ...real.env, get: (name) => Promise.resolve(NO_ENV[name]) }
	};
	return { $: stand, kept, seen };
};

const card = { title: "TITLE", lead: "LEAD", sketch: [], caption: "" };

test("Chat refused under a dialog toasts the dialog text, keeps the card and submits nothing (REQ-055)", async ($$, on) => {
	// Arrange
	const { $, kept, seen } = await engine($$, on, {
		isFilled: false,
		refusal: "dialog"
	});
	const actions = actionsFor($, "s1", newCtx());
	await actions.setView({
		kind: "explained",
		line: LINE,
		text: "x",
		iteration: 1,
		shownAt: 1
	});

	// Act
	await actions.respond(LINE, [card], "Heads up");

	// Assert
	expect(seen.toasts).toEqual([RESPOND_BLOCKED]);
	expect(seen.submitted).toEqual([]);
	expect(rowsOf(kept.get("sessions"))[0]?.view?.kind).toBe("explained");
});

test("Chat refused for another reason toasts the not-filled text (REQ-055)", async ($$, on) => {
	// Arrange
	const { $, seen } = await engine($$, on, { isFilled: false });

	// Act
	await actionsFor($, "s1", newCtx()).respond(LINE, [card], "Heads up");

	// Assert
	expect(seen.toasts).toEqual([RESPOND_NOT_FILLED]);
	expect(seen.submitted).toEqual([]);
});

test("Chat refused with no app answering toasts that the note may be in the box and submits nothing (REQ-055)", async ($$, on) => {
	// Arrange
	const { $, seen } = await engine($$, on, {
		isFilled: false,
		refusal: "unanswered"
	});

	// Act
	await actionsFor($, "s1", newCtx()).respond(LINE, [card], "Heads up");

	// Assert
	expect(seen.toasts).toEqual([RESPOND_MAYBE_FILLED]);
	expect(seen.submitted).toEqual([]);
});

test("Chat with no composer remembers the line, clears the card and submits the draft without its trailing blank lines (REQ-055)", async ($$, on) => {
	// Arrange
	const { $, kept, seen } = await engine($$, on, {
		isFilled: false,
		refusal: "no_composer"
	});
	const actions = actionsFor($, "s1", newCtx());
	await actions.setView({
		kind: "explained",
		line: LINE,
		text: "x",
		iteration: 1,
		shownAt: 1
	});

	// Act
	await actions.respond(LINE, [card], "Heads up");

	// Assert
	expect(seen.toasts).toEqual([]);
	expect(seen.submitted).toHaveLength(1);
	expect(seen.submitted[0]).toContain(LINE);
	expect(seen.submitted[0]?.endsWith("\n")).toBe(false);
	expect(seen.fills[0]?.endsWith("\n\n")).toBe(true);
	expect(kept.get("known")).toEqual([LINE]);
	expect(rowsOf(kept.get("sessions"))[0]?.view).toBeUndefined();
});
