import type { EngineInterface, On } from "claude-code";

import { redactAll, redactWith, secretsIn } from "../secrets.ts";
import { GATE_CHECK_FAILED, GATE_READ_ONLY, gateRule } from "../texts-gate.ts";
import {
	type Denials,
	DENIALS_PER_CALL_MAX,
	NO_REASON,
	repeatedText,
	signature,
	withDenial,
} from "./denials.ts";
import { log } from "./log.ts";
import { hostOf, ownVerdict, type Walls } from "./own.ts";
import { readOnly } from "./readonly.ts";
import { recreates, saw } from "./recreate.ts";
import { deny, fieldOf, type Verdict } from "./verdict.ts";

const STRICTNESS = ["allow", "ask", "deny"];
const PERSON = /^(?:composer|bridge)$/u;
// Another feature owns the unmatched `tool.check`; this pattern matches every tool name.
const ANY_TOOL = /^/u;

/** What the hooks keep between calls: the denials of this session so far. */
export interface Memory {
	denials: Denials;
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
export const watchTools = (on: On, walls: Walls, memory: Memory): void => {
	on("tool.check", { tool: ANY_TOOL }, async ($, e, next) => {
		const refused = repeatedText(
			memory.denials,
			signature(e.tool, e.input),
			fieldOf(e.input, "command") ?? `${e.tool} ${JSON.stringify(e.input)}`,
		);
		if (refused !== undefined) {
			const verdict = deny(refused);
			await log($, e, verdict);
			return verdict;
		}
		// Computed before `next`, so a throw leaves `next` uncalled and the `.catch` asks in its place.
		const recreated = await recreates(hostOf($), walls.files, e.tool, e.input);
		const own = (await ownVerdict($, walls, e.tool, e.input)) ?? recreated;
		const verdict = settle(named(await next(e)), own, e.tool, e.input);
		await log($, e, verdict);
		return verdict;
	}).catch((_error, _e, next) => ({
		decision: "ask",
		reason: GATE_CHECK_FAILED(next.error.message ?? next.error.kind),
	}));
};

/** The permission and prompt events: a denial is remembered, and a new message from the person clears them. */
export const watchDenials = (on: On, walls: Walls, memory: Memory): void => {
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
export const watchResults = (on: On, walls: Walls): void => {
	on("tool.call", { tool: ANY_TOOL }, async ($, e, next) => {
		const answer = await next(e);
		if (answer.deny !== undefined) {
			return answer;
		}
		const seen =
			answer.text ??
			(typeof answer.result === "string"
				? answer.result
				: (JSON.stringify(answer.result) ?? ""));
		if (!answer.isError) {
			await saw(hostOf($), walls.files, e.tool, e, seen);
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
	}).catch(async (_error, e, next) => {
		// The replay rethrows what failed beneath, so only a failed scan withholds the result.
		await next(e);
		return {
			deny: next.error.message ?? `The secret scan ${next.error.kind}.`,
		};
	});
};
