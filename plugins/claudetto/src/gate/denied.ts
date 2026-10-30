// The counting half of the denial counter: the one hook that writes it, and the one place where it
// meets `$.state`. The count is in `$.state` and not `$.store`: the breaker's pause belongs to the
// running session, and a count carried into a later session would deny a call the user has since
// allowed with a rule.
//
// The handler lives here with its helpers, and `register.ts` registers it by reference: the engine's
// loader follows `$` into another file only through a `function` declaration, which the lint rules
// forbid.

import type { HookFor } from "claude-code";
import {
	DENIAL_WRITE_TRIES_MAX,
	DENIALS_PER_CALL_MAX,
	type Denials,
	signature,
	withDenial,
} from "./denials.ts";

/** What the count needs: the held value with its version, and a write that lands only while the version is still the held one. Each handler builds it from `$`. */
interface DenialIo {
	held: () => Promise<{ value: Denials | undefined; version: number }>;
	save: (denials: Denials, version: number) => Promise<boolean>;
}

/** The denials are one value of `$.state`, so the main loop and each subagent see the same count. */
const denialRef = { plugin: "claudetto", key: "denials" } as const;

/** Adds one denial of `key` with up to `tries` tries, and gives the count after the write, or `undefined` when no try landed. */
const countDenial = async (
	io: DenialIo,
	key: string,
	reason: string,
	tries: number,
): Promise<number | undefined> => {
	if (tries <= 0) {
		return undefined;
	}
	const { value, version } = await io.held();
	const next = withDenial(value ?? {}, key, reason);
	return (await io.save(next, version))
		? next[key]?.count
		: countDenial(io, key, reason, tries - 1);
};

/**
 * `classic.PermissionDenied` fires only when auto mode denies a call. It records the denial, and its
 * only output is `retry: true` while the call is under the bound: the denial stands either way, and
 * the event cannot carry our reason, which reaches the model from `onCheck` of `gate/hooks.ts`. A fault of the state
 * counts nothing and adds no output.
 */
export const onDenied: HookFor<"classic.PermissionDenied"> = async (
	$,
	e,
	next,
) => {
	const answer = await next(e);
	try {
		const count = await countDenial(
			{
				held: () => $.state.get(denialRef),
				save: async (denials, version) =>
					(await $.state.set(denialRef, denials, { ifVersion: version })).isSet,
			},
			signature(e.tool_name, e.tool_input),
			e.reason,
			DENIAL_WRITE_TRIES_MAX,
		);
		return count !== undefined && count < DENIALS_PER_CALL_MAX
			? { ...answer, retry: true }
			: answer;
	} catch {
		return answer;
	}
};

// The refusal of the second identical call is in `onCheck` of `gate/hooks.ts`, because `tool.check`
// takes one handler and that one carries the gate (`design.md`, "Protected paths").
