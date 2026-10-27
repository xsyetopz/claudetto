// The mod handlers of the `handoff` slice: the handover (design D12, spec `handover`), a handoff file built in code, a `/clear`, and a resume prompt.
// The automatic compaction of Claude Code stays as the safety net. `classic.Stop` starts it at a quiet turn end, and `prompt.submit` offers it after a cold-cache pause.
// The steps run in a timer after the hook, because Claude Code refuses `$.command.run` and `$.prompt.submit` inside a hook that the turn waits on.
// The `/clear` is not awaited, because its `$.command.run` promise may never settle. The resume prompt waits in `$.state`, and `onClear` of the new session submits it.
// Each path starts at the project root, because `$.fs` resolves a relative path against the folder of the shell (D23).

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { pluginOptions } from "../../../../kernel/options.ts";
import { oneLine } from "../../../../kernel/text.ts";
import { runningAgents } from "../../../project/domain/session.ts";
import {
	isBuiltInCompaction,
	isCodeCompaction,
} from "../../domain/compaction.ts";
import { isCold } from "../cold.ts";
import { handoffPath } from "../compact.ts";
import {
	caseOf,
	modelOf,
	optionOf,
	pathOf,
	type Step,
	stepsOf,
} from "../handover.ts";
import type { Case, Path } from "../limits.ts";
import { CACHE_TTL_MS } from "../limits.ts";
import {
	COMPACT_KEEP,
	HANDOVER_HELD,
	HANDOVER_HELD_NOTICE,
	HANDOVER_NOTICE,
	HANDOVER_OFFER,
	HANDOVER_OFFER_RESUMED,
	HANDOVER_RESUME,
} from "../prompts.ts";
import { jevAnswer } from "./jev.ts";
import { groupNow, handoverOf, type Port, writtenSize } from "./project.ts";
import { queue } from "./queue.ts";

/** The usage value that `prompt` keeps from `session.measure`, which holds the first share of each window. */
const usageRef = { plugin: "claudetto", key: "usage" } as const;

/** The resume prompt of a handover, and the model of its first step, that wait for the `/clear`. */
const resumeRef = { plugin: "claudetto", key: "resume" } as const;

/** The calls of the engine that the project reads use. They take no `$`, so that `claude plugin validate` follows `$` in this file alone. */
const portOf = ($: EngineInterface): Port => ({
	projectDir: () => $.env.get("CLAUDE_PROJECT_DIR"),
	root: () => $.session.root(),
	list: (dir) => $.fs.list(dir),
	read: (file) => $.fs.read(file),
	write: (path, text) => $.fs.write(path, text),
	size: async (path) => (await $.fs.stat(path)).size,
	cost: {
		usage: () => $.session.usage(),
		state: () => $.state.get(usageRef),
	},
});

/** True when the option leaves compaction to Claude Code (`built-in`) or to the hook of code compaction (`code`), so no handover starts. */
const isOff = (): boolean =>
	isBuiltInCompaction(pluginOptions()) || isCodeCompaction(pluginOptions());

/** The time of the last request of the main thread, or `null` before the first turn of this process. */
let lastTurnAt: number | null = null;

/** Notes that the main thread, with no `agentId`, used the prompt cache just now (D47). */
const noteCache = async ($: EngineInterface, agentId: string | undefined) => {
	if (agentId === undefined) {
		lastTurnAt = await $.clock.now().catch(() => lastTurnAt);
	}
};

/** On a resume or a fork, takes the last answer of the transcript as the last request, so a short pause gets no offer. */
export const onResume: Handler<"classic.SessionStart"> = async ($, e, next) => {
	const seconds = e.seconds_since_last_response;
	if (seconds !== undefined) {
		try {
			lastTurnAt = (await $.clock.now()) - seconds * 1000;
		} catch {
			// The clock failed, so the last request stays as it was.
		}
	}
	return next(e);
};

/** `classic.SessionStart` with `source` `clear`: the new session submits the resume prompt that the handover left in `$.state`. A timer runs it, because Claude Code refuses `$.prompt.submit` inside this hook. */
export const onClear: Handler<"classic.SessionStart"> = async ($, e, next) => {
	const held = await $.state.get(resumeRef).catch(() => undefined);
	const value = held?.value;
	if (value === null || value === undefined) {
		return next(e);
	}
	await $.state.set(resumeRef, null).catch(() => undefined);
	coldModel = value.model;
	$.clock.after(0, () =>
		$.prompt
			.submit({ text: value.text })
			.catch(() => undefined)
			.finally(() => {
				isRunning = false;
			}),
	);
	return next(e);
};

export const onTurnComplete: Handler<"turn.complete"> = async ($, e, next) => {
	await noteCache($, e.agentId);
	return next(e);
};

/** The model of the first step after the resume of a handover, or `null` for the session model. */
let coldModel: string | null = null;

/** `turn.step`: notes each request of the main thread, and names the model of the table on the first step after a handover. */
export const onTurnStep: Handler<"turn.step"> = async function* ($, e, next) {
	await noteCache($, e.agentId);
	if (e.agentId !== undefined || coldModel === null) {
		return yield* next(e);
	}
	const model = coldModel;
	coldModel = null;
	return yield* next({ ...e, model });
};

/** True when an agent of the session runs, or a background task is in flight. */
const isBusy = async ($: EngineInterface, tasks: readonly unknown[] = []) =>
	tasks.length > 0 ||
	// The handover waits for a `pending` or `running` agent, and not for a `waiting` one.
	runningAgents(await $.agent.list().catch(() => [])).some(
		(agent) => agent.status !== "waiting",
	);

/** The task group at the last quiet turn end, or `null` before the first one. */
let lastGroup: string | null = null;

/** True while a path runs, so a second trigger cannot start a second path. */
let isRunning = false;

/** Starts `path` with the `held` prompt after it. A file that is missing or empty stops the path. True when it started. */
const begin = async (
	$: EngineInterface,
	path: Path,
	held: string | null,
	model: string | null,
): Promise<boolean> => {
	const messages = await $.session.messages();
	if (!Array.isArray(messages) || isRunning) {
		return false;
	}
	const steps = stepsOf(path, held !== null);
	const { root, text } = await handoverOf(portOf($), messages);
	const file = handoffPath(new Date());
	if (steps.includes("write")) {
		if ((await writtenSize(portOf($), `${root}${file}`, text)) === 0) {
			return false;
		}
		$.ui.log(oneLine(HANDOVER_NOTICE({ file })));
	}
	const resume = [
		HANDOVER_RESUME({ path: file }),
		"",
		text,
		...(held === null ? [] : ["", HANDOVER_HELD({ prompt: held })]),
	].join("\n");
	const release = () => {
		isRunning = false;
	};
	const actions: Record<
		Exclude<Step, "write" | "resume">,
		() => Promise<unknown>
	> = {
		// A refused `/clear` ends the run. One that is not refused ends it at the `classic.SessionStart` of the new session.
		clear: () => {
			$.command
				.run({ command: "clear" })
				.catch(() => {
					release();
					return $.state.set(resumeRef, null);
				})
				.catch(() => undefined);
			return Promise.resolve();
		},
		compact: () =>
			$.command.run({ command: "compact", args: COMPACT_KEEP({ text }) }),
		held: () =>
			$.prompt.submit({ text: HANDOVER_HELD({ prompt: held ?? "" }) }),
	};
	const isWaiting = steps.includes("resume");
	isRunning = true;
	if (isWaiting) {
		await $.state.set(resumeRef, { text: resume, model });
	}
	const names = steps.filter((s) => s !== "write" && s !== "resume");
	// A resume prompt that no new session took in time is dropped, and the run ends.
	const expire = async () => {
		if ((await $.state.get(resumeRef)).value) {
			release();
			await $.state.set(resumeRef, null);
		}
	};
	queue(
		(ms, run) => $.clock.after(ms, run),
		names.map((name) => actions[name]),
		{ isWaiting, expire },
		release,
	);
	return true;
};

/** Starts the path that the option and the table choose for `kind`. */
const startCase = async (
	$: EngineInterface,
	kind: Case,
	tokens: number,
	held: string | null,
): Promise<boolean> => {
	const path = pathOf(kind, tokens, optionOf(pluginOptions()));
	return path === null ? false : begin($, path, held, modelOf(kind, tokens));
};

/** `classic.Stop`: at a quiet turn end, starts a handover for the triggers 1 and 3 of D12. The stop goes on as it is. */
export const onStop: Handler<"classic.Stop"> = async ($, e, next) => {
	const result = await next(e);
	if (isOff() || isRunning) {
		return result;
	}
	if (await isBusy($, e.background_tasks)) {
		return result;
	}
	const [usage, now, group] = await Promise.all([
		$.session.usage(),
		$.clock.now(),
		groupNow(portOf($)),
	]);
	const kind = caseOf({
		tokens: usage.context.tokens ?? 0,
		startedAt: usage.startedAt,
		now,
		group,
		before: lastGroup,
	});
	lastGroup = group;
	if (kind !== null) {
		await startCase($, kind, usage.context.tokens ?? 0, null);
	}
	return result;
};

/** `prompt.submit`: offers the handover after a pause over the cache TTL. With a Jev key, Jev answers when it is sure, and the dialog shows when it is not. On the yes, the prompt is held and runs after the resume. */
export const onPrompt: Handler<"prompt.submit"> = async ($, e, next) => {
	if (
		isOff() ||
		isRunning ||
		e.origin.kind !== "composer" ||
		e.command !== undefined ||
		e.isMeta ||
		e.turnId !== undefined
	) {
		return next(e);
	}
	const now = await $.clock.now();
	if (!isCold(now, lastTurnAt) || (await $.session.turns()) === 0) {
		return next(e);
	}
	if (await isBusy($)) {
		return next(e);
	}
	const answer =
		(await jevAnswer(
			{
				key: () => $.env.get("TYPESAFE_API_KEY"),
				tokens: async () => (await $.session.usage()).context.tokens ?? 0,
				http: { fetch: (address, request) => $.http.fetch(address, request) },
				clock: { sleep: (delay, stop) => $.clock.sleep(delay, stop) },
			},
			portOf($),
			now,
			lastTurnAt,
		)) ??
		(await $.ui
			.ask(
				lastTurnAt === null
					? HANDOVER_OFFER_RESUMED
					: HANDOVER_OFFER({ minutes: String(CACHE_TTL_MS / 60_000) }),
				["Yes", "No"],
			)
			.catch(() => "No"));
	if (answer !== "Yes") {
		return next(e);
	}
	const tokens = (await $.session.usage()).context.tokens ?? 0;
	const isStarted = await startCase($, "idle", tokens, e.text);
	return isStarted ? { drop: HANDOVER_HELD_NOTICE } : next(e);
};
