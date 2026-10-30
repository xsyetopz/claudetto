import { isRecord } from "./gate.ts";
import { DENY_GATED, DENY_REPEATED_CALL } from "./prompts.ts";

export interface Denial {
	readonly count: number;
	readonly reason: string;
}

export type Denials = Readonly<Record<string, Denial>>;

export const DENIALS_PER_CALL_MAX = 2;

export const DENIAL_WRITE_TRIES_MAX = 5;

export const signature = (tool: string, input: unknown): string =>
	`${tool}\0${JSON.stringify(input) ?? ""}`;

export const allowRule = (tool: string, input: unknown): string => {
	const command = isRecord(input) ? input["command"] : undefined;
	return tool === "Bash" && typeof command === "string"
		? `${tool}(${command})`
		: tool;
};

export const withDenial = (
	held: Denials,
	key: string,
	reason: string,
): Denials => ({
	...held,
	[key]: { count: (held[key]?.count ?? 0) + 1, reason },
});

export const stoppedText = (reason: string | undefined): string =>
	DENY_GATED({ rule: reason ?? "" });

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
