import type { EngineInterface, On } from "claude-code";

import type {
	CallAnswer,
	CallEvent,
	CallNext,
	CheckAnswer,
	CheckEvent,
	CheckNext,
} from "../../chain";
import { redactAll, redactWith, secretsIn, stringsIn } from "../../secrets";
import { GATE_READ_ONLY, gateRule } from "../../texts-gate";
import {
	type Denials,
	DENIALS_PER_CALL_MAX,
	NO_REASON,
	repeatedText,
	signature,
	withDenial,
} from "./denials";
import { hostOf, ownVerdict, type Walls } from "./own";
import { readOnly } from "./readonly";
import { recreates, saw } from "./recreate";
import { deny, fieldOf, type Verdict } from "./verdict";

const STRICTNESS = ["allow", "ask", "deny"];
const PERSON = /^(?:composer|bridge)$/u;

/** What the hooks keep between calls: the denials of this session so far. */
export interface Memory {
	denials: Denials;
}

/** What the gate guards share: the walls and the memory of one session. */
export interface GateState {
	walls: Walls;
	memory: Memory;
}

type Found = Awaited<ReturnType<EngineInterface["tool"]["check"]>>;

const isBareAsk = (found: Found): boolean =>
	found.decision === "ask" &&
	found.rule === undefined &&
	found.setting === undefined &&
	found.hook === undefined &&
	found.plugin === undefined;

// The engine's text for a rule denial does not name the rule, so a model reads it as unexplained.
const named = (found: Found): Found =>
	found.decision === "deny" && found.rule !== undefined
		? { ...found, reason: gateRule(found.reason, found.rule) }
		: found;

const settle = (
	engine: Found,
	own: Verdict | undefined,
	tool: string,
	input: unknown,
): Found => {
	if (
		own === undefined &&
		tool === "Bash" &&
		isBareAsk(engine) &&
		readOnly(fieldOf(input, "command") ?? "")
	) {
		return { decision: "allow", reason: GATE_READ_ONLY };
	}
	return own === undefined ||
		STRICTNESS.indexOf(engine.decision) >= STRICTNESS.indexOf(own.decision)
		? engine
		: own;
};

/** The gate only tightens, except that an `ask` no rule, option, hook, or plugin made, on a read-only command, becomes an `allow`. */
export async function gateCheck(
	$: EngineInterface,
	e: CheckEvent,
	next: CheckNext,
	state: GateState,
): Promise<Awaited<CheckAnswer>> {
	const { walls, memory } = state;
	const refused = repeatedText(
		memory.denials,
		signature(e.tool, e.input),
		fieldOf(e.input, "command") ?? `${e.tool} ${JSON.stringify(e.input)}`,
	);
	if (refused !== undefined) {
		return deny(refused);
	}
	// Computed before `next`, so a throw leaves `next` uncalled and the hook's fault handler asks in its place.
	const recreated = await recreates(hostOf($), walls.files, e.tool, e.input);
	const own = (await ownVerdict($, walls, e.tool, e.input)) ?? recreated;
	return settle(named(await next(e)), own, e.tool, e.input);
}

/** The permission and prompt events: a denial is remembered, and a new message from the person clears them. */
export const watchPermissionEvents = (
	on: On,
	walls: Walls,
	memory: Memory,
): void => {
	// `classic.PermissionRequest` does not fire in `-p`, so `tool.check` carries the same verdict.
	on("classic.PermissionRequest", async ($, e, next) => {
		const answer = await next(e);
		if (answer.decision !== undefined) {
			return answer;
		}
		const own = await ownVerdict($, walls, e.tool_name, e.tool_input);
		return own?.decision === "deny"
			? { ...answer, decision: { behavior: "deny", message: own.reason } }
			: answer;
	});

	on("classic.PermissionDenied", async (_$, e, next) => {
		const answer = await next(e);
		const key = signature(e.tool_name, e.tool_input);
		memory.denials = withDenial(memory.denials, key, e.reason);
		// A retry of a denial with no reason meets the same denial, so only a reasoned one is retried.
		return (memory.denials[key]?.count ?? 0) < DENIALS_PER_CALL_MAX &&
			!NO_REASON.test(e.reason)
			? { ...answer, retry: true }
			: answer;
	});

	// A new message from the person can carry the consent the earlier denials lacked.
	on("prompt.submit", { origin: { kind: PERSON } }, (_$, e, next) => {
		memory.denials = {};
		return next(e);
	});
};

/** Every result is scanned, so a secret any tool prints reaches the model as `[REDACTED]`. */
export async function gateCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	state: GateState,
): Promise<Awaited<CallAnswer>> {
	const answer = await next(e);
	if (answer.deny !== undefined) {
		return answer;
	}
	// Each string is scanned raw, because JSON would escape the line breaks a rule anchors on.
	const seen = answer.text ?? stringsIn(answer.result).join("\n");
	if (!answer.isError) {
		await saw(hostOf($), state.walls.files, e.tool, e, seen);
	}
	const secrets = await secretsIn(
		(argv, init) => $.process.run(argv, init),
		seen,
	);
	if (secrets.length === 0) {
		return answer;
	}
	// A hook's `{ result }` cannot carry an error, so an errored result reaches the model as a deny.
	return answer.isError
		? { deny: redactWith(seen, secrets) }
		: {
				result: redactAll(answer.result, secrets),
				...(answer.context && { context: answer.context }),
			};
}
