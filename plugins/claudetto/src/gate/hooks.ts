// The two hooks of the gate, and the one place where the gate meets `$`. The rules themselves stay
// pure, so a test calls `gate()` with a stub `Facts` and makes no `$` call.
//
// `tool.check` carries the gate. `classic.PermissionRequest` is the dialog path only: it does not
// fire in `claude -p` at all, and in auto mode only when auto mode falls back to a dialog
// (`design.md`, "Permission Policy").
//
// Both hooks live in this one file with the facts they read, and `register.ts` registers them by
// reference: the engine's loader follows `$` into another file only through a `function` declaration,
// which the lint rules forbid, so `$` may not be handed to an imported arrow (the loader says so by
// name). That is also why the two hooks share a file rather than a helper.

import type { CatchHandler, EngineInterface, HookFor } from "claude-code";
import { keptOptions } from "../jev/options.ts";
import { admitCall } from "../run-limits/calls.ts";
import { failedText } from "../run-limits/failures.ts";
import { changeLedger } from "../run-limits/ledger.ts";
import { limitsOf } from "../run-limits/settings.ts";
import { type Denials, repeatedText } from "./denials.ts";
import { factsFrom } from "./facts.ts";
import { type Facts, gate, gated, stricter } from "./gate.ts";
import { CHECK_FAIL } from "./prompts.ts";

/**
 * The facts of the session. Each env value is read here with a literal name, and the rest are
 * closures over `$`, so no helper of `facts.ts` takes `$` and the rules stay testable without one.
 */
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
			realPath: async (path) => {
				const stat = await $.fs
					.stat(path, { resolve: true })
					.catch(() => undefined);
				return stat?.realPath;
			},
			projectDir: () => $.env.get("CLAUDE_PROJECT_DIR"),
			ledger: (key) => $.store.get(key),
			root: () => $.session.root(),
		},
	);
};

/** The auto mode denials of this session, which `gate/denied.ts` writes and this file only reads. */
const denialRef = { plugin: "claudetto", key: "denials" } as const;

/** The denials held, or none when the state faults, which counts as no denial and refuses nothing. */
const denialsOf = async ($: EngineInterface): Promise<Denials | undefined> => {
	try {
		return (await $.state.get(denialRef)).value;
	} catch {
		return undefined;
	}
};

const callsRef = { plugin: "claudetto", key: "calls" } as const;

const failuresRef = { plugin: "claudetto", key: "failures" } as const;

/** The input tokens of the last response, or none when the session cannot say. */
const contextTokens = async (
	$: EngineInterface,
): Promise<number | undefined> => {
	try {
		return (await $.session.usage()).context.tokens;
	} catch {
		return undefined;
	}
};

/**
 * The reason to hold a call for the run limits, or `undefined` to let it on. An identical retry of a
 * call that failed `failLimit` times is refused with the earlier error. Otherwise a real call
 * (a query has no `tool_use_id` and is no call) is counted into the period at heavy context, and held
 * once the period holds `callCap`. A fault of the state lets the call on: these are limits on spend,
 * and the `.catch` of the gate would otherwise ask a person about every call.
 */
const heldByLimits = async (
	$: EngineInterface,
	e: Parameters<HookFor<"tool.check">>[1],
): Promise<string | undefined> => {
	try {
		const limits = limitsOf(keptOptions(), undefined);
		const now = await $.clock.now();
		const failed = failedText(
			(await $.state.get(failuresRef)).value,
			{ tool: e.tool, input: e.input },
			now,
			limits,
		);
		if (failed !== undefined || e.tool_use_id === undefined) {
			return failed;
		}
		const tokens = await contextTokens($);
		return await changeLedger(
			{
				held: () => $.state.get(callsRef),
				save: async (calls, version) =>
					(await $.state.set(callsRef, calls, { ifVersion: version })).isSet,
			},
			(held) => admitCall(held, now, tokens, limits),
		);
	} catch {
		return undefined;
	}
};

/**
 * The verdict of `tool.check`, which is the path that carries the gate: `PermissionRequest` does not
 * fire in `-p` and fires in auto mode only on the fallback to a dialog, and this registration is the
 * one that carries a `.catch` (`design.md`, "Permission Policy" and "Auto Mode"). Protected paths
 * are a rule of the gate answered here and not a second hook, because a second
 * registration would mean two deny paths with one of them fail-open.
 *
 * It answers in three steps. A call that auto mode already denied `DENIALS_PER_CALL_MAX` times is
 * refused with the earlier reason, before the gate runs, so the model is told to stop rather than
 * tripping the harness's circuit breaker. Otherwise our rules run only on an input that
 * holds a key they read, and the answer is the stricter of the engine's verdict and ours.
 *
 * Only tightening is deliberate: a bare `allow` of ours for a call whose input no rule read would
 * approve `WebFetch` on any URL and every MCP tool with no prompt, and would undo a deny rule or a
 * mode the user set. The purpose of `specs/permission-policy/spec.md` holds for both paths: a
 * request that no rule settles goes to a person and is never approved by default.
 */
export const onCheck: HookFor<"tool.check"> = async ($, e, next) => {
	const refused = repeatedText(await denialsOf($), e.tool, e.input);
	if (refused !== undefined) {
		return { decision: "deny", reason: refused };
	}
	const held = await heldByLimits($, e);
	if (held !== undefined) {
		return { decision: "deny", reason: held };
	}
	// Our own rules run before `next`, so a throw of theirs leaves `next` uncalled and the `.catch`
	// refuses in their place. The two do not run in parallel, because the lint rules keep `.then` out
	// and the gate's own reads are a few milliseconds of `git` and `fs` either way.
	const own = gated(e.input)
		? await gate(
				{ tool: e.tool, input: e.input, agentId: e.agentId },
				await factsOf($),
			)
		: undefined;
	const engine = await next(e);
	if (own === undefined) {
		return engine;
	}
	const decision = stricter(engine.decision, own.decision);
	if (decision === engine.decision) {
		return engine;
	}
	// The reason is left out rather than passed as `undefined`, which the engine's type refuses.
	return own.reason === undefined
		? { decision }
		: { decision, reason: own.reason };
};

/**
 * A gate that throws or overruns asks a person. Without a `.catch` a failed hook is simply absent,
 * so the call would go on unjudged: "a guard fails open unless its registration carries a `.catch`
 * that refuses in its place" (`clawdipedia` `extend/mod-api/hooks`, "Failure Behavior").
 *
 * The verdict is `ask` and carries no `decider`: a `decider` is not in
 * `ToolCheckResult` of `2.1.312`. The engine sets `plugin` on an ask a hook made and pins it, and
 * such an ask is a person's by the type's own contract, so no classifier allow settles it and where
 * nobody can be asked it is a deny.
 */
export const onCheckFail: CatchHandler<HookFor<"tool.check">> = () => ({
	decision: "ask",
	reason: CHECK_FAIL,
});

/**
 * Answers the permission dialog, and only for a request whose input holds a key the gate reads. An
 * input with no gated key is passed on with no `allow`, because no rule of ours read it, so the
 * person sees Claude Code's own dialog and decides: the requirement `Fail Closed` of
 * `specs/permission-policy/spec.md`, which holds that a request no rule
 * settles shows the person a dialog and is not answered for them. An `ask` of our own rules is passed on for
 * the same reason, since the dialog is already the question.
 *
 * It needs no `.catch`: a hook that sends no output leaves the normal dialog, so a throw here still
 * puts the call to the person (`design.md`, "Permission Policy").
 */
export const onPermission: HookFor<"classic.PermissionRequest"> = async (
	$,
	e,
	next,
) => {
	const answer = await next(e);
	if (answer.decision !== undefined || !gated(e.tool_input)) {
		return answer;
	}
	const verdict = await gate(
		{ tool: e.tool_name, input: e.tool_input, agentId: e.agent_id },
		await factsOf($),
	);
	if (verdict.decision === "allow") {
		return { ...answer, decision: { behavior: "allow" } };
	}
	return verdict.decision === "deny"
		? {
				...answer,
				decision: { behavior: "deny", message: verdict.reason ?? "" },
			}
		: answer;
};
