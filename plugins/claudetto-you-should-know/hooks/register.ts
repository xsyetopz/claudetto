import type {
	EngineInterface,
	ModelEffort,
	On,
	PluginOptions,
} from "claude-code";

import {
	blankRow,
	closed,
	countOf,
	draftFor,
	fillOutcome,
	isCheckStep,
	isRepeat,
	LIMITS,
	linesOf,
	logEntry,
	parseReply,
	remember,
	type Row,
	rowsOf,
	skipsAfter,
	type View,
	withRow,
} from "./note.ts";
import { CHECK_INSTRUCTIONS, checkBody, TOAST_BOX_HAS_TEXT } from "./texts.ts";
import { type ButtonKey, drawView, hasCards } from "./view.ts";

type Engine = EngineInterface;

interface Memory {
	readonly typedPast: Map<string, number>;
	readonly ended: Set<string>;
	readonly inFlight: Set<string>;
	log: readonly string[];
}

interface Settings {
	readonly model: string;
	readonly effort: ModelEffort;
}

interface Turn {
	readonly id: string;
	readonly turnId: string;
}

const STORE = {
	sessions: "sessions",
	shown: "shown",
	known: "known",
	ignored: "ignored",
	skips: "skips",
} as const;

const EFFORTS: readonly ModelEffort[] = [
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
];

const settingsOf = (options: PluginOptions): Settings => {
	const model = options["sideCheckModel"];
	return {
		model:
			typeof model === "string" && model !== "" ? model : "claude-haiku-5-5",
		effort:
			EFFORTS.find((e) => e === options["sideCheckEffortLevel"]) ?? "high",
	};
};

const loadRow = async ($: Engine, id: string): Promise<Row> =>
	rowsOf(await $.store.get(STORE.sessions)).find((r) => r.id === id) ??
	blankRow(id);

const saveRow = async ($: Engine, row: Row): Promise<void> => {
	const rows = rowsOf(await $.store.get(STORE.sessions));
	await $.store.set(STORE.sessions, withRow(rows, row));
};

const loadLines = async ($: Engine, key: string): Promise<readonly string[]> =>
	linesOf(await $.store.get(key));

const loadCount = async ($: Engine, key: string): Promise<number> =>
	countOf(await $.store.get(key));

const saveBackoff = async (
	$: Engine,
	ignored: number,
	skips: number,
): Promise<void> => {
	await $.store.set(STORE.ignored, ignored);
	await $.store.set(STORE.skips, skips);
};

const countIgnored = async ($: Engine): Promise<void> => {
	const ignored = (await loadCount($, STORE.ignored)) + 1;
	await saveBackoff($, ignored, skipsAfter(ignored));
};

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
): Promise<void> => {
	const row = await loadRow($, at.id);
	const offer = parseReply(text);
	if (
		offer === undefined ||
		mem.ended.has(at.id) ||
		row.askedTurn !== at.turnId ||
		row.view !== null
	) {
		return;
	}
	const shown = await loadLines($, STORE.shown);
	const known = await loadLines($, STORE.known);
	if (isRepeat(offer.line, shown, known)) {
		return;
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
};

const runCheck = async (
	$: Engine,
	mem: Memory,
	settings: Settings,
	at: Turn,
): Promise<void> => {
	try {
		const body = checkBody({
			shown: await loadLines($, STORE.shown),
			known: await loadLines($, STORE.known),
			log: mem.log,
		});
		const result = await $.model.complete({
			...settings,
			maxTokens: LIMITS.maxTokens,
			prompt: [{ text: CHECK_INSTRUCTIONS, cache: true }, { text: body }],
		});
		if (result.isAnswered) {
			await showReply($, mem, at, result.text);
		}
	} finally {
		mem.inFlight.delete(at.id);
	}
};

const considerCheck = async (
	$: Engine,
	mem: Memory,
	settings: Settings,
	at: Turn,
): Promise<void> => {
	const surfaces = await $.session.surfaces();
	const row = await loadRow($, at.id);
	if (
		!(surfaces.includes("terminal") || surfaces.includes("desktop")) ||
		row.view !== null ||
		row.offeredTurn === at.turnId ||
		mem.inFlight.has(at.id)
	) {
		return;
	}
	const skips = await loadCount($, STORE.skips);
	if (skips > 0) {
		await saveBackoff($, await loadCount($, STORE.ignored), skips - 1);
		return;
	}
	await saveRow($, { ...row, askedTurn: at.turnId });
	mem.inFlight.add(at.id);
	$.clock.after(0, () => {
		runCheck($, mem, settings, at).catch(() => {});
	});
};

const learn = async ($: Engine, line: string): Promise<void> => {
	await $.store.set(
		STORE.known,
		remember(await loadLines($, STORE.known), line),
	);
};

const expire = async (
	$: Engine,
	id: string,
	shownAt: number,
): Promise<void> => {
	const row = await loadRow($, id);
	if (row.view?.kind === "asked" && row.view.shownAt === shownAt) {
		await saveRow($, closed(row));
		$.ui.invalidate("ui.render");
	}
};

const knowAndClose = async ($: Engine, row: Row, view: View): Promise<void> => {
	await saveBackoff($, 0, 0);
	await learn($, view.line);
	await saveRow($, closed(row));
};

const chat = async ($: Engine, row: Row, view: View): Promise<void> => {
	if ((await $.prompt.read()).text.trim() !== "") {
		$.ui.toast(TOAST_BOX_HAS_TEXT);
		return;
	}
	const draft = draftFor(row.tag, view);
	const filled = await $.prompt.fill({ text: `${draft}\n\n`, mode: "replace" });
	const outcome = fillOutcome(filled);
	if (outcome.next === "toast") {
		$.ui.toast(outcome.text);
		return;
	}
	await knowAndClose($, row, view);
	if (outcome.next === "submit") {
		await $.prompt.submit({ text: draft });
	}
};

const askWhy = async ($: Engine, row: Row, view: View): Promise<void> => {
	const shownAt = Date.now();
	await saveRow($, { ...row, view: { ...view, kind: "asked", shownAt } });
	$.clock.after(LIMITS.askedMs, () => {
		expire($, row.id, shownAt).catch(() => {});
	});
};

const answer = async (
	$: Engine,
	row: Row,
	view: View,
	key: ButtonKey,
): Promise<void> => {
	switch (key) {
		case "learn": {
			if (hasCards(view)) {
				await saveRow($, { ...row, view: { ...view, kind: "explained" } });
			}
			break;
		}
		case "dismiss": {
			await askWhy($, row, view);
			break;
		}
		case "know":
		case "helpful":
		case "understood": {
			await learn($, view.line);
			await saveRow($, closed(row));
			break;
		}
		case "not-relevant":
		case "not-understood": {
			await saveRow($, closed(row));
			break;
		}
		default: {
			break;
		}
	}
};

const press = async ($: Engine, id: string, key: ButtonKey): Promise<void> => {
	const row = await loadRow($, id);
	const { view } = row;
	if (view === null) {
		return;
	}
	if (key === "respond") {
		await chat($, row, view);
	} else if (key === "dismiss" && view.kind === "asked") {
		await saveRow($, closed(row));
	} else {
		await saveBackoff($, 0, 0);
		await answer($, row, view, key);
	}
	$.ui.invalidate("ui.render");
};

const onStep = async (
	$: Engine,
	mem: Memory,
	settings: Settings,
	e: { index: number; turnId: string },
): Promise<void> => {
	const id = await $.session.id();
	if (e.index === 0) {
		await settleTyped($, mem, id);
	} else if (isCheckStep(e.index)) {
		await considerCheck($, mem, settings, { id, turnId: e.turnId });
	}
};

const addToLog = (mem: Memory, entry: string): void => {
	mem.log = [...mem.log, entry].slice(-LIMITS.logEntries);
};

const ASK = /^(?:AskUserQuestion|mcp__claudetto__ask-user-question)$/;

const questionOf = (x: unknown): string[] =>
	typeof x === "object" &&
	x !== null &&
	"question" in x &&
	typeof x.question === "string"
		? [x.question]
		: [];

// claudetto's ask tool takes one `question`; the built-in takes a `questions` list.
const questionsOf = (input: unknown): string[] =>
	typeof input === "object" &&
	input !== null &&
	"questions" in input &&
	Array.isArray(input.questions)
		? input.questions.flatMap(questionOf)
		: questionOf(input);

export const register = (on: On, options: PluginOptions): void => {
	const settings = settingsOf(options);
	const enabled = options["sideCheckEnabled"] === true;
	const mem: Memory = {
		typedPast: new Map(),
		ended: new Set(),
		inFlight: new Set(),
		log: [],
	};

	on("turn.step", async function* ($, e, next) {
		if (!enabled || e.agentId !== undefined) {
			return yield* next(e);
		}
		await onStep($, mem, settings, e).catch(() => {});
		const result = yield* next(e);
		if (result.answer.trim() !== "") {
			addToLog(mem, logEntry("assistant", result.answer));
		}
		return result;
	});

	on("prompt.submit", async ($, e, next) => {
		if (
			enabled &&
			(e.origin.kind === "composer" || e.origin.kind === "bridge")
		) {
			addToLog(mem, logEntry("person", e.text));
			const id = await $.session.id().catch(() => {});
			if (id !== undefined) {
				mem.typedPast.set(id, (mem.typedPast.get(id) ?? 0) + 1);
			}
		}
		return next(e);
	});

	on("tool.call", { tool: ASK }, (_$, e, next) => {
		if (enabled) {
			for (const q of questionsOf(e)) {
				addToLog(mem, logEntry("assistant", `asked the person: ${q}`));
			}
		}
		return next(e);
	});

	on("session.end", async ($, e, next) => {
		if (enabled) {
			mem.ended.add(e.sessionId);
			mem.typedPast.delete(e.sessionId);
			mem.inFlight.delete(e.sessionId);
			const row = await loadRow($, e.sessionId).catch(() => {});
			if (row?.view != null) {
				await saveRow($, closed(row)).catch(() => {});
			}
		}
		return next(e);
	});

	on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
		if (!enabled || e.props.hasSurvey) {
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
				press($, id, key).catch(() => {});
			},
		});
	});
};
