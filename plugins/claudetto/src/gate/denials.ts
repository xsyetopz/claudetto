// The auto mode denials of the session, kept for each call. Pure: no `$` is read here, so a test
// calls these with plain values (`design.md`, "Auto Mode", "Denial counting").

import { isRecord } from "./gate.ts";
import { DENY_GATED, DENY_REPEATED_CALL } from "./prompts.ts";

/** The denials of one call: how many, and the reason of the newest. */
export interface Denial {
	readonly count: number;
	readonly reason: string;
}

/** The denials of the session, keyed by the `signature` of the call, so a changed input of one tool counts apart. */
export type Denials = Readonly<Record<string, Denial>>;

/** The denials of one call at which `tool.check` refuses it. Auto mode pauses after 3 in a row, so 2 stops the call first (`specs/low-hitl/spec.md`). */
export const DENIALS_PER_CALL_MAX = 2;

/** The tries to write the denials when a parallel denial wrote first. */
export const DENIAL_WRITE_TRIES_MAX = 5;

/** The key of a call: the tool name and its serialized input, because `tool_use_id` is new for each call, so the same call is counted together and a changed input starts at zero. */
export const signature = (tool: string, input: unknown): string =>
	`${tool}\0${JSON.stringify(input) ?? ""}`;

/** The `permissions.allow` rule that would let the call through: the exact `Bash(command)` form, or the tool name alone. */
export const allowRule = (tool: string, input: unknown): string => {
	const command = isRecord(input) ? input["command"] : undefined;
	return tool === "Bash" && typeof command === "string"
		? `${tool}(${command})`
		: tool;
};

/** The denials with one more for `key`, and `reason` as the newest. */
export const withDenial = (
	held: Denials,
	key: string,
	reason: string,
): Denials => ({
	...held,
	[key]: { count: (held[key]?.count ?? 0) + 1, reason },
});

/** The deny text for a call that a rule of the gate denied: the reason of that rule and the order to stop and report. */
export const stoppedText = (reason: string | undefined): string =>
	DENY_GATED({ rule: reason ?? "" });

/** The deny text for a call that was already denied `DENIALS_PER_CALL_MAX` times, with the earlier reason, or `undefined` while the call is under the bound. */
export const repeatedText = (
	held: Denials | undefined,
	tool: string,
	input: unknown,
): string | undefined => {
	const seen = held?.[signature(tool, input)];
	return seen && seen.count >= DENIALS_PER_CALL_MAX
		? DENY_REPEATED_CALL({
				count: seen.count,
				reason: seen.reason,
				rule: allowRule(tool, input),
			})
		: undefined;
};
