// The mod handlers of the `guard` slice: the permission gate of spec `permission-gate` (D1).
// `tool.check` gives `deny`, `ask`, or `allow`; `classic.PermissionRequest` runs the same gate when Claude Code would show a prompt.
// An `ask` of the gate goes to the classifier stage of `classifier.ts`: Jev when the `decide` option is `jev` and `TYPESAFE_API_KEY` is set, then a small model, unless the `classifier` option is `off`.
// Each `ask` goes to a log of the session (task 5.2), and a log that cannot be written changes no verdict.
// A hook `allow` does not clear an `ask` or `deny` rule (`research/claude-code.md` of change `0-3-0`).
// A hook that throws is skipped, so `onCheckFail` asks a person (fail closed).

import type { CatchHandler, EngineInterface, MatchedHook } from "claude-code";
import type { Handler } from "../../../kernel/hooks.ts";
import {
	type Facts,
	gate,
	gated,
	isRecord,
	type Verdict,
} from "../domain/gate.ts";
import { fixTitles } from "../domain/ghtitle.ts";
import {
	keepWatches,
	monitorIds,
	runningTask,
	withWatch,
} from "../domain/monitors.ts";
import { BASH_TIMEOUT_DEFAULT_MS, BASH_WAIT_MAX_MS } from "../limits.ts";
import {
	CHECK_FAIL,
	DENY_LONG_WAIT,
	DENY_MONITOR_DUPLICATE,
	TITLE_FIXED,
} from "../prompts.ts";
import { askAtRed, type RedIo, wrongCall } from "./call-verdicts.ts";
import { type ClassifierIo, settle } from "./classifier.ts";
import { countCall } from "./env-scan.ts";
import { factsFrom } from "./facts.ts";
import { type LogIo, log } from "./gate-log.ts";
import { updateWatches, type WatchIo, withWatches } from "./watches.ts";

type Check = Handler<"tool.check">;

const ALLOW: Verdict = { decision: "allow" };

/** The facts of the session. The env values are read here with a literal name, and the rest is a port of closures over `$`, so no helper takes `$`. */
const factsOf = async ($: EngineInterface): Promise<Facts> => {
	const [cwd, home, tmp, claudeTmp, xdg] = await Promise.all([
		$.session.cwd(),
		$.env.get("HOME"),
		$.env.get("TMPDIR"),
		$.env.get("CLAUDE_CODE_TMPDIR"),
		$.env.get("XDG_CONFIG_HOME"),
	]);
	return factsFrom(
		{ cwd, home, tmp, claudeTmp, xdg },
		{
			run: (argv, timeoutMs) => $.process.run(argv, { timeoutMs }),
			stat: (path) => $.fs.stat(path),
			read: (path) => $.fs.read(path),
			exists: (path) => $.fs.exists(path),
			now: () => $.clock.now(),
			realPath: async (path) =>
				(await $.fs.stat(path, { resolve: true }).catch(() => undefined))
					?.realPath,
			projectDir: () => $.env.get("CLAUDE_PROJECT_DIR"),
			ledger: (key) => $.store.get(key),
			root: () => $.session.root(),
		},
	);
};

const redIo = ($: EngineInterface): RedIo => ({
	usage: () => $.session.usage(),
	agents: () => $.agent.list(),
});

const logIo = ($: EngineInterface): LogIo => ({
	id: () => $.session.id(),
	now: () => $.clock.now(),
	exists: (path) => $.fs.exists(path),
	read: (path) => $.fs.read(path),
	write: (path, text) => $.fs.write(path, text),
});

const classifierIo = ($: EngineInterface): ClassifierIo => ({
	session: () => $.session.id(),
	now: () => $.clock.now(),
	messages: () => $.session.messages(),
	jevKey: () => $.env.get("TYPESAFE_API_KEY"),
	fetch: (to, body) => $.http.fetch(to, body),
	sleep: (wait, abort) => $.clock.sleep(wait, abort),
	complete: (request) => $.model.complete(request),
});

/** The running `Monitor` tasks are one value of `$.state`, so the main loop and each subagent see the same set (task 10.4). */
const watchRef = { plugin: "claudetto", key: "watches" } as const;

const watchIo = ($: EngineInterface): WatchIo => ({
	held: async () => (await $.state.get(watchRef)).value,
	now: () => $.clock.now(),
	save: (held) => $.state.set(watchRef, held),
});

/** The verdict of the gate. A `deny` of the engine stays, and an `ask` of the gate goes to the classifier stage, which leaves it to a person when it cannot settle it. */
export const onCheck: Check = async ($, e, next) => {
	countCall(e.tool);
	const facts = gated(e.input) ? await factsOf($) : undefined;
	const [engine, own, red] = await Promise.all([
		next(e),
		facts ? gate(e, facts) : ALLOW,
		askAtRed(redIo($), e),
	]);
	const stop = wrongCall(e, engine);
	if (stop) {
		return stop;
	}
	if (!facts || own.decision !== "ask") {
		if (!red || own.decision !== "allow") {
			return own;
		}
		const { tmp } = facts ?? (await factsOf($));
		await log(logIo($), tmp, e, red.reason ?? "", "person");
		return { ...red, decider: "person" };
	}
	const settled = await settle(classifierIo($), {
		tool: e.tool,
		input: e.input,
		own,
	});
	await log(
		logIo($),
		facts.tmp,
		e,
		own.reason ?? "",
		settled?.decider ?? "person",
	);
	if (settled) {
		const { decider: _, ...verdict } = settled;
		return verdict;
	}
	// An `ask` has `decider: "person"`, so the dialog has no "always allow" row.
	return { ...own, decider: "person" };
};

/** `classic.PermissionRequest`: `allow` when no gate matches, the verdict of the classifier stage for an `ask` of the gate, else the answer of the hooks below, so a person sees the prompt. */
export const onPermission: Handler<"classic.PermissionRequest"> = async (
	$,
	e,
	next,
) => {
	const answer = await next(e);
	if (answer.decision) {
		return answer;
	}
	const call = { tool: e.tool_name, input: e.tool_input };
	const own = gated(e.tool_input)
		? await gate({ ...call, agentId: e.agent_id }, await factsOf($))
		: ALLOW;
	const settled =
		own.decision === "ask"
			? await settle(classifierIo($), { ...call, own })
			: own;
	if (settled?.decision === "allow") {
		return { ...answer, decision: { behavior: "allow" } };
	}
	return settled?.decision === "deny"
		? {
				...answer,
				decision: { behavior: "deny", message: settled.reason ?? "" },
			}
		: answer;
};
type MonitorHook = MatchedHook<
	"tool.call",
	{ readonly tool: readonly ["Monitor", "TaskStop"] }
>;

/** `tool.call` on `Monitor` and `TaskStop`: a `Monitor` with the command of a running one gets a refusal that names the task (X8), a `Monitor` that runs joins the state, and a `TaskStop` leaves it. */
export const onMonitor: MonitorHook = async ($, e, next) => {
	const command = e.tool === "Monitor" ? e.command : undefined;
	const id =
		typeof command === "string"
			? await withWatches(watchIo($), (held, now) =>
					runningTask(held, command, now),
				)
			: undefined;
	if (id !== undefined) {
		return { deny: DENY_MONITOR_DUPLICATE({ id }) };
	}
	const answer = await next(e);
	if (answer.deny !== undefined || answer.isError) {
		return answer;
	}
	if (e.tool === "TaskStop") {
		const task = e.task_id ?? e.shell_id;
		await updateWatches(watchIo($), (held) =>
			keepWatches(held, (watchId) => watchId !== task),
		);
	} else if (typeof command === "string") {
		const result: Record<string, unknown> = isRecord(answer.result)
			? answer.result
			: {};
		const { taskId, timeoutMs } = result;
		if (typeof taskId === "string") {
			await updateWatches(watchIo($), (held, now) =>
				withWatch(
					held,
					command,
					taskId,
					now,
					typeof timeoutMs === "number" ? timeoutMs : 0,
				),
			);
		}
	}
	return answer;
};

type TitleHook = MatchedHook<
	"tool.call",
	{ readonly tool: readonly ["Bash"]; readonly command: RegExp }
>;

/** `tool.call` on `gh pr create` and `gh issue create`: the `--title` and `-t` value runs in Chicago Title Case, and the result tells the model. */
export const onTitle: TitleHook = async (_$, e, next) => {
	const fixed = fixTitles(e.command);
	if (fixed === undefined) {
		return next(e);
	}
	const answer = await next({ ...e, command: fixed });
	return answer.deny === undefined
		? { ...answer, context: [...(answer.context ?? []), TITLE_FIXED] }
		: answer;
};

type WaitHook = MatchedHook<"tool.call", { readonly tool: readonly ["Bash"] }>;

/** True when the cache TTL of subagents is `1h`, by the env or by the settings. */
// A subagent TTL that is set wins, and `ENABLE_PROMPT_CACHING_1H` asks for `1h` in both groups (docs page "Request and Cache").
const longTtl = async ($: EngineInterface): Promise<boolean> => {
	const set =
		(await $.env.get("CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL")) ??
		(await $.settings.read({ key: "subagentPromptCacheTtl" }));
	return set === undefined
		? (await $.env.get("ENABLE_PROMPT_CACHING_1H")) === "1"
		: set === "1h";
};

/** `tool.call` on `Bash`: a foreground call of a subagent whose effective `timeout` is over `BASH_WAIT_MAX_MS` is denied, and the reason points to `run_in_background` and `Monitor`. The main thread has no `agentId`, and a `1h` TTL turns the rule off. */
export const onWait: WaitHook = async ($, e, next) => {
	if (e.agentId === undefined || e.run_in_background === true) {
		return next(e);
	}
	const set = e.timeout ?? Number(await $.env.get("BASH_DEFAULT_TIMEOUT_MS"));
	const timeout = set > 0 ? set : BASH_TIMEOUT_DEFAULT_MS;
	if (timeout <= BASH_WAIT_MAX_MS || (await longTtl($))) {
		return next(e);
	}
	return {
		deny: DENY_LONG_WAIT({
			seconds: timeout / 1000,
			max: BASH_WAIT_MAX_MS / 1000,
		}),
	};
};

/** `classic.Stop`: the running set becomes the `monitor` tasks of `background_tasks`, so a task that ended on its own leaves the state. */
export const onStop: Handler<"classic.Stop"> = async ($, e, next) => {
	const answer = await next(e);
	if (e.background_tasks) {
		const live = monitorIds(e.background_tasks);
		await updateWatches(watchIo($), (held) =>
			keepWatches(held, (id) => live.has(id)),
		);
	}
	return answer;
};

/** A gate that throws asks a person, and the dialog names the gate. */
export const onCheckFail: CatchHandler<Check> = () => ({
	decision: "ask",
	decider: "person",
	reason: CHECK_FAIL,
});
