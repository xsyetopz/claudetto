// The logic takes a `Ports` object: the loader follows `$` across files only into a function declaration.

import type { EngineInterface, HookFor, MatchedHook } from "claude-code";
import { press } from "./answer.ts";
import { isCheckStep, isSubAgent } from "./cadence.ts";
import { considerCheck, settleTyped } from "./check.ts";
import { entryOf, withEntry } from "./digest.ts";
import { drawView } from "./draw.ts";
import { ended, inFlight, typedPast, work } from "./memory.ts";
import { keptSettings } from "./options.ts";
import { loadRow, type Ports, saveRow } from "./ports.ts";

const portsOf = ($: EngineInterface): Ports => ({
	read: (key) => $.store.get(key),
	write: (key, value) => $.store.set(key, value),
	surfaces: () => $.session.surfaces(),
	ask: async (request) => {
		const result = await $.model.complete(request);
		return result.isAnswered ? result.text : undefined;
	},
	refresh: () => $.ui.invalidate("ui.render"),
	later: (ms, run) => {
		$.clock.after(ms, run);
	},
	now: () => Date.now(),
	box: async () => (await $.prompt.read()).text,
	fill: (text) => $.prompt.fill({ text, mode: "replace" }),
	submit: async (text) => {
		await $.prompt.submit({ text });
	},
	toast: (text) => {
		$.ui.toast(text);
	},
});

const PERSONS = ["composer", "bridge"];

/** The step is never held: the work is done before `next`, and a fault in it is swallowed. */
export const onStep: HookFor<"turn.step"> = async function* ($, e, next) {
	if (!keptSettings().enabled) {
		return yield* next(e);
	}
	const settle = async (): Promise<void> => {
		if (isSubAgent(e.agentId)) {
			return;
		}
		const p = portsOf($);
		const id = await $.session.id();
		if (e.index === 0) {
			await settleTyped(p, id);
		} else if (isCheckStep(e.index)) {
			await considerCheck(p, keptSettings(), { id, turnId: e.turnId });
		}
	};
	await settle().catch(() => undefined);
	const result = yield* next(e);
	if (!isSubAgent(e.agentId) && result.answer.trim() !== "") {
		work.entries = withEntry(work.entries, entryOf("assistant", result.answer));
	}
	return result;
};

export const onSubmit: HookFor<"prompt.submit"> = async ($, e, next) => {
	if (keptSettings().enabled && PERSONS.includes(e.origin.kind)) {
		work.entries = withEntry(work.entries, entryOf("person", e.text));
		const id = await $.session.id().catch(() => undefined);
		if (id !== undefined) {
			typedPast.set(id, (typedPast.get(id) ?? 0) + 1);
		}
	}
	return next(e);
};

export const onEnd: HookFor<"session.end"> = async ($, e, next) => {
	if (keptSettings().enabled) {
		ended.add(e.sessionId);
		typedPast.delete(e.sessionId);
		inFlight.delete(e.sessionId);
		const p = portsOf($);
		const row = await loadRow(p, e.sessionId).catch(() => undefined);
		if (row?.view != null) {
			await saveRow(p, { ...row, view: null }).catch(() => undefined);
		}
	}
	return next(e);
};

export const RENDER_MATCH = { component: "AbovePrompt" } as const;

/** `$.ui.resolve` is how a render hook gets the elements of its surface. */
export const onRender: MatchedHook<"ui.render", typeof RENDER_MATCH> = async (
	$,
	e,
	next,
) => {
	if (!keptSettings().enabled || e.props.hasSurvey) {
		return next(e);
	}
	const p = portsOf($);
	const id = await $.session.id();
	const row = await loadRow(p, id);
	if (row.view === null) {
		return next(e);
	}
	return drawView($.ui.resolve(e), {
		surface: e.surface,
		view: row.view,
		tag: row.tag,
		press: (key) => {
			press(p, id, key).catch(() => undefined);
		},
	});
};
