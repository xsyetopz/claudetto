// The four hooks, and the one place where the plugin meets `$`. The logic is in the modules beside
// it and takes a `Ports` object, because the engine's loader follows `$` across a file boundary only
// into a function declaration, which the lint rules forbid. Every hook reads `enabled` first, so a
// plugin left off passes straight through and touches nothing
// (`docs/keep/plugins/you-should-know-design.txt:74`).

import type { EngineInterface, HookFor, MatchedHook } from "claude-code";
import { press } from "./answer.ts";
import { isCheckStep, isSubAgent } from "./cadence.ts";
import { considerCheck, settleTyped } from "./check.ts";
import { entryOf, withEntry } from "./digest.ts";
import { drawView } from "./draw.ts";
import { ended, inFlight, typedPast, work } from "./memory.ts";
import { keptSettings } from "./options.ts";
import { loadRow, type Ports, saveRow } from "./ports.ts";

/** The closures over `$` that the logic modules may use, and no other call on it. */
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
});

/** A prompt is a person's when it came from the composer or the bridge (design line 81). */
const PERSONS = ["composer", "bridge"];

/**
 * `turn.step`: a sub-agent step passes through, step 0 settles the prompts typed past a view, and a
 * check step is held back or scheduled. The step itself is never held: the work is done before
 * `next`, and a fault in it is swallowed so the session goes on.
 */
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

/**
 * `prompt.submit`: a person's prompt goes into the digest, and counts as typed past whatever view is
 * open, which is what drives the back-off.
 */
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

/** `session.end`: the session is remembered as ended, so a check still in flight turns stale, and an open view closes. */
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

/** The band above the prompt, the one component the plugin draws in (design line 74). */
export const RENDER_MATCH = { component: "AbovePrompt" } as const;

/**
 * `ui.render` for `AbovePrompt`: draws the open view of the session, or passes. It yields to a survey
 * that holds the band, as the host asks (`hasSurvey`). `$.ui.resolve` is how a render hook gets the
 * elements of the surface it draws on, so it is a call of the rebuild although the original's
 * manifest scan lists it among the calls left out of the count.
 */
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
