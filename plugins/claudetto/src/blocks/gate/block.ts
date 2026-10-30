import type {
	CatchHandler,
	EngineInterface,
	HookFor,
	On,
	PluginOptions,
} from "claude-code";
import type { Block, BlockContext, WithOptions } from "../block.ts";
import { admitCall } from "../run-limits/calls.ts";
import { failedText } from "../run-limits/failures.ts";
import { changeLedger } from "../run-limits/ledger.ts";
import { limitsOf } from "../run-limits/settings.ts";
import { type Denials, repeatedText, stoppedText } from "./denials.ts";
import { onDenied } from "./denied.ts";
import { factsFrom } from "./facts.ts";
import { type Facts, gate, gated, stricter } from "./gate.ts";
import { CHECK_FAIL } from "./prompts.ts";

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

const denialRef = { plugin: "claudetto", key: "denials" } as const;

const denialsOf = async ($: EngineInterface): Promise<Denials | undefined> => {
	try {
		return (await $.state.get(denialRef)).value;
	} catch {
		return undefined;
	}
};

const callsRef = { plugin: "claudetto", key: "calls" } as const;

const failuresRef = { plugin: "claudetto", key: "failures" } as const;

const contextTokens = async (
	$: EngineInterface,
): Promise<number | undefined> => {
	try {
		return (await $.session.usage()).context.tokens;
	} catch {
		return undefined;
	}
};

/** A state fault lets the call on: these limits guard spend, and the `.catch` would otherwise ask a person about every call. */
const heldByLimits = async (
	$: EngineInterface,
	e: Parameters<HookFor<"tool.check">>[1],
	options: PluginOptions,
): Promise<string | undefined> => {
	try {
		const limits = limitsOf(options, undefined);
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
 * Only tightens the engine's verdict: a bare `allow` for an input no rule read would approve `WebFetch`
 * and every MCP tool unprompted, and would undo a deny rule the user set. Protected paths are answered
 * here, not in a second hook, because a second deny path would be fail-open.
 */
export const onCheck: WithOptions<HookFor<"tool.check">> = async (
	$,
	e,
	next,
	options,
) => {
	const refused = repeatedText(await denialsOf($), e.tool, e.input);
	if (refused !== undefined) {
		return { decision: "deny", reason: refused };
	}
	const held = await heldByLimits($, e, options);
	if (held !== undefined) {
		return { decision: "deny", reason: held };
	}
	// Before `next`, so a throw here leaves `next` uncalled and the `.catch` refuses in its place.
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
	switch (decision) {
		case engine.decision:
			return engine;
		case "deny":
			return { decision, reason: stoppedText(own.reason) };
		default:
			// The reason is left out rather than passed as `undefined`, which the engine's type refuses.
			return own.reason === undefined
				? { decision }
				: { decision, reason: own.reason };
	}
};

/** `ask` with no `decider`: an ask a hook made belongs to a person, and where nobody can be asked it is a deny. */
export const onCheckFail: CatchHandler<HookFor<"tool.check">> = () => ({
	decision: "ask",
	reason: CHECK_FAIL,
});

/**
 * Passes on an input no rule reads, and an `ask` of ours, because the dialog already puts it to the
 * person. No `.catch`: a throw leaves the normal dialog in place.
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
				decision: {
					behavior: "deny",
					message: stoppedText(verdict.reason),
				},
			}
		: answer;
};

export const gateBlock: Block = {
	id: "gate",
	kind: "policy",
	routes: [
		"tool.check",
		"classic.PermissionDenied",
		"classic.PermissionRequest",
	],
	needs: "2.1.314",
};

export const attachGate = (on: On, context: BlockContext): void => {
	// The `.catch` is needed: a failed hook is absent, so the call would go on unjudged.
	on("tool.check", ($, e, next) => onCheck($, e, next, context.options)).catch(
		onCheckFail,
	);
	// Only counts; the reason reaches the model from `onCheck`.
	on("classic.PermissionDenied", onDenied);
	on("classic.PermissionRequest", onPermission);
};
