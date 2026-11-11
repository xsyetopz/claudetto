import type { CatchHandler, HookFor, On, PluginOptions } from "claude-code";

import { ASK, questionsOf, READERS } from "./calls.ts";
import {
	closed,
	isRepeat,
	LIMITS,
	logEntry,
	parseReply,
	remember,
} from "./note.ts";
import { press } from "./press.ts";
import { type Settings, settingsOf } from "./settings.ts";
import {
	countIgnored,
	type Engine,
	loadCount,
	loadLines,
	loadRow,
	saveBackoff,
	saveRow,
	STORE,
} from "./store.ts";
import { CHECK_INSTRUCTIONS, checkBody, stopFor } from "./texts.ts";
import { drawView } from "./view.ts";

interface Memory {
	readonly typedPast: Map<string, number>;
	readonly ended: Set<string>;
	readonly inFlight: Map<string, Promise<string | undefined>>;
	readonly turns: Map<string, string>;
	log: readonly string[];
	earlier: readonly string[];
}

interface Turn {
	readonly id: string;
	readonly turnId: string;
}

const settleTyped = async (
	$: Engine,
	mem: Memory,
	id: string,
): Promise<void> => {
	const row = await loadRow($, id);
	if (row.view === null) {
		mem.typedPast.delete(id);
		return;
	}
	if (
		row.view.kind !== "offer" ||
		(mem.typedPast.get(id) ?? 0) < LIMITS.clearAfterPrompts
	) {
		return;
	}
	mem.typedPast.delete(id);
	await saveRow($, closed(row));
	await countIgnored($);
	$.ui.invalidate("ui.render");
};

const showReply = async (
	$: Engine,
	mem: Memory,
	at: Turn,
	text: string,
): Promise<string | undefined> => {
	const row = await loadRow($, at.id);
	const offer = parseReply(text);
	if (
		offer === undefined ||
		mem.ended.has(at.id) ||
		row.askedTurn !== at.turnId ||
		row.view !== null
	) {
		return undefined;
	}
	const shown = await loadLines($, STORE.shown);
	const known = await loadLines($, STORE.known);
	if (isRepeat(offer.line, shown, known)) {
		return undefined;
	}
	await $.store.set(STORE.shown, remember(shown, offer.line));
	await saveRow($, {
		...row,
		view: { kind: "offer", ...offer, shownAt: Date.now() },
		tag: offer.tag,
		offeredTurn: at.turnId,
	});
	mem.typedPast.delete(at.id);
	$.ui.invalidate("ui.render");
	return offer.line;
};

const runCheck = async (
	$: Engine,
	mem: Memory,
	settings: Settings,
	at: Turn,
): Promise<string | undefined> => {
	const body = checkBody({
		shown: await loadLines($, STORE.shown),
		known: await loadLines($, STORE.known),
		log: mem.log,
		earlier: mem.earlier,
	});
	const result = await $.model.complete({
		...settings,
		maxTokens: LIMITS.maxTokens,
		prompt: [{ text: CHECK_INSTRUCTIONS, cache: true }, { text: body }],
	});
	return result.isAnswered ? showReply($, mem, at, result.text) : undefined;
};

const startCheck = async (
	$: Engine,
	mem: Memory,
	settings: Settings,
	at: Turn,
): Promise<string | undefined> => {
	const surfaces = await $.session.surfaces();
	const row = await loadRow($, at.id);
	if (row.view?.kind === "offer" && row.offeredTurn === at.turnId) {
		return row.view.line;
	}
	if (
		!(surfaces.includes("terminal") || surfaces.includes("desktop")) ||
		row.view !== null ||
		row.offeredTurn === at.turnId
	) {
		return undefined;
	}
	const skips = await loadCount($, STORE.skips);
	if (skips > 0) {
		await saveBackoff($, await loadCount($, STORE.ignored), skips - 1);
		return undefined;
	}
	await saveRow($, { ...row, askedTurn: at.turnId });
	return runCheck($, mem, settings, at);
};

// Calls the model sends in one response arrive together, so they share the check already running.
const checkBefore = (
	$: Engine,
	mem: Memory,
	settings: Settings,
	at: Turn,
): Promise<string | undefined> => {
	const running = mem.inFlight.get(at.id);
	if (running !== undefined) {
		return running;
	}
	const check = startCheck($, mem, settings, at)
		.catch((error: unknown): undefined => {
			$.ui.log(`The side check failed (${String(error)})`);
		})
		.finally(() => {
			mem.inFlight.delete(at.id);
		});
	mem.inFlight.set(at.id, check);
	return check;
};

const onStep = async (
	$: Engine,
	mem: Memory,
	e: { index: number; turnId: string },
): Promise<void> => {
	const id = await $.session.id();
	mem.turns.set(id, e.turnId);
	if (e.index === 0) {
		await settleTyped($, mem, id);
	}
};

// A burst of tool calls pushes the person's request out of the log, and a check without it reads the asked-for action as unasked.
const addToLog = (mem: Memory, entry: string): void => {
	const log = [...mem.log, entry];
	const dropped = log
		.slice(0, -LIMITS.logEntries)
		.filter((e) => e.startsWith("person: "))
		.map((e) => e.slice(0, LIMITS.askChars));
	mem.earlier = [...mem.earlier, ...dropped].slice(-LIMITS.earlierAsks);
	mem.log = log.slice(-LIMITS.logEntries);
};

const logHooks = (on: On, mem: Memory): void => {
	on("turn.step", async function* ($, e, next) {
		if (e.agentId !== undefined) {
			return yield* next(e);
		}
		await onStep($, mem, e).catch((error: unknown) => {
			$.ui.log(`The step record failed (${String(error)})`);
		});
		const result = yield* next(e);
		if (result.answer.trim() !== "") {
			addToLog(mem, logEntry("assistant", result.answer));
		}
		return result;
	});
	on("prompt.submit", async ($, e, next) => {
		if (e.origin.kind === "composer" || e.origin.kind === "bridge") {
			addToLog(mem, logEntry("person", e.text));
			const id = await $.session.id().catch((error: unknown) => {
				$.ui.log(`The session id was not read (${String(error)})`);
			});
			if (id !== undefined) {
				mem.typedPast.set(id, (mem.typedPast.get(id) ?? 0) + 1);
			}
		}
		return next(e);
	});
};

const viewHooks = (on: On, mem: Memory): void => {
	on("session.end", async ($, e, next) => {
		mem.ended.add(e.sessionId);
		mem.typedPast.delete(e.sessionId);
		mem.inFlight.delete(e.sessionId);
		mem.turns.delete(e.sessionId);
		const row = await loadRow($, e.sessionId).catch((error: unknown) => {
			$.ui.log(`The session row was not loaded (${String(error)})`);
		});
		if (row !== undefined && row.view !== null) {
			await saveRow($, closed(row)).catch((error: unknown) => {
				$.ui.log(`The session row was not closed (${String(error)})`);
			});
		}
		return next(e);
	});
	on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
		if (e.props.hasSurvey) {
			return next(e);
		}
		const id = await $.session.id();
		const row = await loadRow($, id);
		if (row.view === null) {
			return next(e);
		}
		return drawView($.ui.resolve(e), {
			surface: e.surface,
			view: row.view,
			tag: row.tag,
			press: (key) => {
				press($, id, key).catch((error: unknown) => {
					$.ui.log(`The key press was not handled (${String(error)})`);
				});
			},
		});
	});
};

type CallCatch = CatchHandler<HookFor<"tool.call">>;

// The engine hands a `.catch` handler `$` first, which the lint's catch-name rule takes for an error.
function sideCheckFault(
	$: Parameters<CallCatch>[0],
	e: Parameters<CallCatch>[1],
	next: Parameters<CallCatch>[2],
): ReturnType<CallCatch> {
	$.ui.log(`The side check failed (${next.error.message ?? next.error.kind})`);
	return next(e);
}

export const register = (on: On, options: PluginOptions): void => {
	if (options["sideCheckEnabled"] !== true) {
		return;
	}
	const settings = settingsOf(options);
	const mem: Memory = {
		typedPast: new Map(),
		ended: new Set(),
		inFlight: new Map(),
		turns: new Map(),
		log: [],
		earlier: [],
	};
	logHooks(on, mem);
	viewHooks(on, mem);
	on("tool.call", async ($, e, next) => {
		if (ASK.test(e.tool)) {
			for (const q of questionsOf(e)) {
				addToLog(mem, logEntry("assistant", `asked the person: ${q}`));
			}
			return next(e);
		}
		if (e.agentId !== undefined || READERS.has(e.tool)) {
			return next(e);
		}
		addToLog(mem, logEntry("assistant", `about to call ${JSON.stringify(e)}`));
		const id = await $.session.id();
		const line = await checkBefore($, mem, settings, {
			id,
			turnId: mem.turns.get(id) ?? "",
		});
		return line === undefined ? next(e) : { deny: stopFor(line) };
	}).catch(sideCheckFault);
};
