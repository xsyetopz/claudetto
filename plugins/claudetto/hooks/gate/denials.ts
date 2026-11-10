import { gateRepeated, gateRepeatedUnexplained } from "../texts-gate.ts";

interface Denial {
	count: number;
	reason: string;
}

export type Denials = Readonly<Record<string, Denial>>;

export const DENIALS_PER_CALL_MAX = 2;

export const signature = (tool: string, input?: unknown): string =>
	`${tool}\0${JSON.stringify(input) ?? ""}`;

export const withDenial = (
	held: Denials,
	key: string,
	reason: string,
): Denials => ({
	...held,
	[key]: { count: (held[key]?.count ?? 0) + 1, reason },
});

export const NO_REASON = /\(it gave no explanation\)|^\s*$/iu;

export const repeatedText = (
	held: Denials,
	key: string,
	call: string,
): string | undefined => {
	const seen = held[key];
	if (!seen || seen.count < DENIALS_PER_CALL_MAX) {
		return undefined;
	}
	return NO_REASON.test(seen.reason)
		? gateRepeatedUnexplained(seen.count, call)
		: gateRepeated(seen.count, seen.reason);
};
