// Runs in process, no model call and no `$`: a handoff is written within the `session.end` bound.

import { gitleaksRedact } from "./gitleaks/gitleaks.ts";
import { mask, REDACTED } from "./mask.ts";
import { BOUND, type Entry } from "./parts.ts";
import { HIGH_ENTRIES } from "./tables/high.ts";
import { LOW_ENTRIES } from "./tables/low.ts";

interface Rule {
	readonly id: string;
	readonly confidence: "low" | "high";
	readonly prefilter?: RegExp;
	readonly re: RegExp;
}

const stripBound = (source: string): string =>
	source.endsWith(BOUND) ? source.slice(0, -BOUND.length) : source;

const compile = (entry: Entry): Rule => {
	const flags = (entry.flags ?? "").replace("g", "");
	const run = entry.run;
	if (run === undefined) {
		// Spread only when set: a key holding `undefined` would pass a gate it never meant to.
		return {
			id: entry.id,
			confidence: entry.confidence,
			...(entry.prefilter !== undefined && { prefilter: entry.prefilter }),
			re: new RegExp(entry.source, `${flags}g`),
		};
	}
	// The run keeps a longer token from being matched from its middle.
	return {
		id: entry.id,
		confidence: entry.confidence,
		prefilter: new RegExp(stripBound(entry.source), flags),
		re: new RegExp(
			`(?:(?<!${run})|(?<=\\\\[nr]))(?=${run}+${BOUND})${run}*?${entry.source}`,
			`${flags}g`,
		),
	};
};

const BEGIN_KEY = /-----BEGIN[ A-Z0-9_-]{0,100}?PRIVATE KEY(?: BLOCK)?-----/gi;
const END_KEY = /-----END[ A-Z0-9_-]{0,100}?PRIVATE KEY(?: BLOCK)?-----/gi;
const KEY_GAP = 64;

interface Block {
	readonly start: number;
	readonly end: number;
}

const blockFrom = (text: string, from: number): Block | undefined => {
	BEGIN_KEY.lastIndex = from;
	const begin = BEGIN_KEY.exec(text);
	if (!begin) {
		return undefined;
	}
	END_KEY.lastIndex = begin.index + begin[0].length + KEY_GAP;
	const end = END_KEY.exec(text);
	return end
		? { start: begin.index, end: end.index + end[0].length }
		: undefined;
};

const redactKeyBlocks = (text: string): string => {
	let out = "";
	let taken = 0;
	for (
		let block = blockFrom(text, 0);
		block;
		block = blockFrom(text, block.end)
	) {
		out += text.slice(taken, block.start) + REDACTED;
		taken = block.end;
	}
	return out + text.slice(taken);
};

const LOW_RULES = LOW_ENTRIES.map(compile);
const HIGH_RULES = HIGH_ENTRIES.map(compile);

const wanted = (rule: Rule, text: string): boolean =>
	rule.prefilter === undefined || rule.prefilter.test(text);

/** The order is part of the behavior: three `low` rows read a `[REDACTED]` an earlier row wrote. */
export const redactTable = (text: string): string => {
	let out = redactKeyBlocks(text);
	for (const rule of LOW_RULES) {
		if (wanted(rule, out)) {
			out = out.replace(rule.re, mask);
		}
	}
	for (const rule of HIGH_RULES) {
		if (wanted(rule, out)) {
			out = out.replace(rule.re, mask);
		}
	}
	return out;
};

/** Gitleaks runs last over masked text and only adds, since `[REDACTED]` matches none of its rules. */
export const redact = (text: string): string =>
	gitleaksRedact(redactTable(text));

export const redactIds = (): readonly string[] => [
	...LOW_RULES.map((rule) => rule.id),
	...HIGH_RULES.map((rule) => rule.id),
];
