import type { EngineInterface } from "claude-code";
import { expect, test } from "claude-code/testing";

import { RESPOND_BLOCKED, RESPOND_NOT_FILLED } from "./draft";
import { newCtx } from "./context";
import { actionsFor } from "./view/actions";

const LINE = "Tests run in order.";

/**
 * The test kit hands a plugin only a hook's refusal, which carries no cause (PromptFilled in the
 * claude-code types), so the dialog and no_composer branches are driven through a stand-in engine.
 */
const engine = (fill: { isFilled: boolean; refusal?: string }) => {
	const kept = new Map<string, unknown>();
	const seen = { toasts: [] as string[], submitted: [] as string[], fills: [] as string[] };
	const $ = {
		store: {
			get: async (key: string) => kept.get(key),
			set: async (key: string, value: unknown) => void kept.set(key, value),
		},
		ui: { toast: (text: string) => void seen.toasts.push(text), invalidate: () => undefined },
		prompt: {
			read: async () => ({ text: "", cursor: 0 }),
			fill: async (input: { text: string }) => {
				seen.fills.push(input.text);
				return fill;
			},
			submit: async (input: { text: string }) => void seen.submitted.push(input.text),
		},
		env: { get: async () => undefined },
	} as unknown as EngineInterface;
	return { $, kept, seen };
};

const card = { title: "TITLE", lead: "LEAD", sketch: [], caption: "" };

test("Chat refused under a dialog toasts the dialog text, keeps the card and submits nothing (REQ-055)", async () => {
	// Arrange
	const { $, kept, seen } = engine({ isFilled: false, refusal: "dialog" });
	const actions = actionsFor($, "s1", newCtx());
	await actions.setView({ kind: "explained", line: LINE, text: "x", iteration: 1, shownAt: 1 });

	// Act
	await actions.respond(LINE, [card], "Heads up");

	// Assert
	expect(seen.toasts).toEqual([RESPOND_BLOCKED]);
	expect(seen.submitted).toEqual([]);
	expect((kept.get("sessions") as { view?: { kind: string } }[])[0]?.view?.kind).toBe("explained");
});

test("Chat refused for another reason toasts the not-filled text (REQ-055)", async () => {
	// Arrange
	const { $, seen } = engine({ isFilled: false });

	// Act
	await actionsFor($, "s1", newCtx()).respond(LINE, [card], "Heads up");

	// Assert
	expect(seen.toasts).toEqual([RESPOND_NOT_FILLED]);
	expect(seen.submitted).toEqual([]);
});

test("Chat with no composer remembers the line, clears the card and submits the draft without its trailing blank lines (REQ-055)", async () => {
	// Arrange
	const { $, kept, seen } = engine({ isFilled: false, refusal: "no_composer" });
	const actions = actionsFor($, "s1", newCtx());
	await actions.setView({ kind: "explained", line: LINE, text: "x", iteration: 1, shownAt: 1 });

	// Act
	await actions.respond(LINE, [card], "Heads up");

	// Assert
	expect(seen.toasts).toEqual([]);
	expect(seen.submitted).toHaveLength(1);
	expect(seen.submitted[0]).toContain(LINE);
	expect(seen.submitted[0]?.endsWith("\n")).toBe(false);
	expect(seen.fills[0]?.endsWith("\n\n")).toBe(true);
	expect(kept.get("known")).toEqual([LINE]);
	expect((kept.get("sessions") as { view?: unknown }[])[0]?.view).toBeUndefined();
});
