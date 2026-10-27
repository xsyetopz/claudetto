// The mod handlers of the `handoff` slice: the handover (design D12, spec `handover`), a handoff file built in code, a `/clear`, and a resume prompt.
// The automatic compaction of Claude Code stays as the safety net. `classic.Stop` starts it at a quiet turn end, and `prompt.submit` offers it after a cold-cache pause.
// The steps run in a timer after the hook, because Claude Code refuses `$.command.run` and `$.prompt.submit` inside a hook that the turn waits on.
// Each path starts at the project root, because `$.fs` resolves a relative path against the folder of the shell (D23).

import type { EngineInterface, SessionMessage } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { pluginOptions } from "../../../../kernel/options.ts";
import { oneLine } from "../../../../kernel/text.ts";
import { noulOf, postJev } from "../../../jev/domain/jev.ts";
import { jevKey } from "../../../jev/domain/request.ts";
import { openChange, readChanges } from "../../../project/domain/change.ts";
import { passedChecks, taskLines } from "../../../project/domain/checks.ts";
import { CHANGES_DIR } from "../../../project/domain/paths.ts";
import { projectRoot, runningAgents } from "../../../project/domain/session.ts";
import {
	isBuiltInCompaction,
	isCodeCompaction,
} from "../../domain/compaction.ts";
import { sessionCost } from "../../domain/usage.ts";
import { isCold, offerAnswer, offerBody } from "../cold.ts";
import { handoffPath } from "../compact.ts";
import {
	caseOf,
	groupOf,
	handoffText,
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

const TRAILING_SLASHES = /\/+$/;

/** The project root with a final `/`, or `""` with no root (D23). */
const rootOf = async ($: EngineInterface): Promise<string> => {
	const root = await projectRoot({
		dir: () => $.env.get("CLAUDE_PROJECT_DIR"),
		root: () => $.session.root(),
	});
	return root === "" ? "" : `${root.replace(TRAILING_SLASHES, "")}/`;
};

/** The open change among the folders of `openspec/changes/` (not `archive`), with the task lines of its `tasks.md`. */
const openChangeOf = async ($: EngineInterface, root: string) => {
	const changes = await readChanges(`${root}${CHANGES_DIR}`, {
		list: (dir) => $.fs.list(dir),
		read: (file) => $.fs.read(file),
	});
	const change = openChange(changes);
	const tasks = changes.find((c) => c.name === change?.name)?.tasks ?? "";
	return { change, tasks, lines: taskLines(tasks) };
};

/** The size in bytes of the file after the write of `text` to `path`, or `0` when the write fails. */
const writtenSize = async ($: EngineInterface, path: string, text: string) => {
	try {
		await $.fs.write(path, text);
		return (await $.fs.stat(path)).size;
	} catch {
		return 0;
	}
};

/** The task group of the next open task of the open change, or `null` with no open change. */
const groupNow = async ($: EngineInterface): Promise<string | null> => {
	const { change } = await openChangeOf($, await rootOf($));
	return groupOf(change?.next ?? null);
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

/** The usage value that `prompt` keeps from `session.measure`, which holds the first share of each window. */
const usageRef = { plugin: "claudetto", key: "usage" } as const;

/** The cost report of the session: the cost, and the change of each share since the first reading. A fault gives `none`. */
const reportOf = ($: EngineInterface): Promise<string> =>
	sessionCost({
		usage: () => $.session.usage(),
		state: () => $.state.get(usageRef),
	});

/** Writes the handoff text to `.claude/claudetto/handoffs/`, or gives `null` when the file is empty or missing. */
const handoverOf = async (
	$: EngineInterface,
	messages: readonly SessionMessage[],
) => {
	const root = await rootOf($);
	const { change, tasks } = await openChangeOf($, root);
	const text = handoffText({
		messages,
		...(change === null ? {} : { name: change.name, tasks }),
		checks: passedChecks(messages),
		usage: await reportOf($),
		root,
	});
	return { root, text };
};

/** Runs `steps` in order, each after the one before ends. A failed step rejects, and the steps after it do not run. */
const runInOrder = async (
	steps: readonly (() => Promise<unknown>)[],
): Promise<void> => {
	const [first, ...rest] = steps;
	if (first === undefined) {
		return;
	}
	await first();
	await runInOrder(rest);
};

/** Queues the steps after the hook, each after the one before ends. A failed step ends the run. */
const queue = (
	$: EngineInterface,
	steps: readonly (() => Promise<unknown>)[],
): void => {
	isRunning = true;
	$.clock.after(0, async () => {
		try {
			await runInOrder(steps);
		} catch {
			// A refused command leaves the session as it is.
		} finally {
			isRunning = false;
		}
	});
};

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
	const { root, text } = await handoverOf($, messages);
	const file = handoffPath(new Date());
	if (steps.includes("write")) {
		if ((await writtenSize($, `${root}${file}`, text)) === 0) {
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
	const actions: Record<Exclude<Step, "write">, () => Promise<unknown>> = {
		clear: () => $.command.run({ command: "clear" }),
		compact: () =>
			$.command.run({ command: "compact", args: COMPACT_KEEP({ text }) }),
		resume: () => {
			coldModel = model;
			return $.prompt.submit({ text: resume });
		},
		held: () =>
			$.prompt.submit({ text: HANDOVER_HELD({ prompt: held ?? "" }) }),
	};
	queue(
		$,
		steps.flatMap((step) => (step === "write" ? [] : [actions[step]])),
	);
	return true;
};

/** `Yes` or `No` when Jev is sure about the offer, else `undefined`. It needs the option `decide` as `jev` and a key: the option, else the exported key. A failed call is `undefined`. */
const jevAnswer = async (
	$: EngineInterface,
	now: number,
): Promise<"Yes" | "No" | undefined> => {
	const key = await jevKey(pluginOptions(), () =>
		$.env.get("TYPESAFE_API_KEY"),
	);
	if (!key) {
		return undefined;
	}
	const tokens = (await $.session.usage()).context.tokens ?? 0;
	const { change, lines } = await openChangeOf($, await rootOf($));
	const task = lines.get(change?.next ?? "")?.line ?? "none";
	const idleMs = lastTurnAt === null ? null : now - lastTurnAt;
	const answers = await postJev(
		key,
		offerBody({ tokens, idleMs, task }),
		{ fetch: (address, request) => $.http.fetch(address, request) },
		{ sleep: (delay, stop) => $.clock.sleep(delay, stop) },
	).catch(() => undefined);
	return offerAnswer(noulOf(answers, "handover"));
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
		groupNow($),
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
		(await jevAnswer($, now)) ??
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
