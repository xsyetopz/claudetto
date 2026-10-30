// The redaction pass, transcribed from Claude Code `2.1.312`, module `chunk-45pm9m17.js`: the
// compiler `be` at 59,327, the replacer `Fe` at 59,737, the private-key readers `gt` and `Xls` at
// 57,535, the prefilter gate `lt` of `chunk-7gjh0jc7.js` at 73,895, and the order of
// `redactContext` and `redactTokens` at 61,928. The whole table is reached, because this is the
// compiler the program's own redaction uses.
//
// What the program has and this does not: the tracked-URL path of `redactWithUrlRanges`, which
// keeps the shape of a URL while it masks the credential inside it. Without it a URL is masked by
// the plain entries alone, which takes more of the line and never less, and a handoff can carry a
// shorter URL but not a secret. The scan path, the display path, and the finding labels are not
// here either, because nothing in a handoff reports a finding.
//
// Why no model call and no `$`: a handoff is written inside the bound of `session.end`, so every
// value this touches is read and masked in process.

import { gitleaksRedact } from "./gitleaks/gitleaks.ts";
import { mask, REDACTED } from "./mask.ts";
import { BOUND, type Entry } from "./parts.ts";
import { HIGH_ENTRIES } from "./tables/high.ts";
import { LOW_ENTRIES } from "./tables/low.ts";

/** One compiled row, as `be(true)` returns it. */
interface Rule {
	readonly id: string;
	readonly confidence: "low" | "high";
	readonly prefilter?: RegExp;
	readonly re: RegExp;
}

/** `Jn`: a high source without the boundary group it ends with. */
const stripBound = (source: string): string =>
	source.endsWith(BOUND) ? source.slice(0, -BOUND.length) : source;

/** `be(true)`: the row compiled for a replacement, so every pattern is global. */
const compile = (entry: Entry): Rule => {
	const flags = (entry.flags ?? "").replace("g", "");
	const run = entry.run;
	if (run === undefined) {
		// The prefilter is spread only when the row carries one, as the program spreads it, because a
		// row with the key set to `undefined` would pass a gate it never meant to pass.
		return {
			id: entry.id,
			confidence: entry.confidence,
			...(entry.prefilter !== undefined && { prefilter: entry.prefilter }),
			re: new RegExp(entry.source, `${flags}g`),
		};
	}
	// The run keeps a longer token from being matched from its middle, and the escaped break lets a
	// token that follows a literal `\n` of a quoted line still start a match.
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

/** `gt`: the start and the end of a private key block, with the gap `Ji` of 64 characters. */
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

/**
 * `Xls`: each private key block, from its `BEGIN` line through its `END` line, replaced whole. The
 * program's index pre-scan `jn` is left out, because it only finds the first `BEGIN` faster.
 */
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

/** `lt` with `includeRedactOnly` set: the prefilter decides, and no row is held back. */
const wanted = (rule: Rule, text: string): boolean =>
	rule.prefilter === undefined || rule.prefilter.test(text);

/**
 * `text` with each secret the table of the program finds replaced by `REDACTED`.
 *
 * The order is the program's: the private key blocks, then the `low` rows, then the `high` ones.
 * Three `low` rows read a `[REDACTED]` that an earlier row wrote, so the order is part of the
 * behavior and not a preference. The `redactOnly` rows are kept, as `redactWithUrlRanges` keeps
 * them, because a handoff only ever redacts.
 */
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

/**
 * `text` with every secret replaced: what the table of the program finds, then what the rules of
 * the Gitleaks config find.
 *
 * The Gitleaks rules run last and over text the table already masked. They name vendors the table
 * does not, so they add and never undo: `[REDACTED]` carries no vendor prefix, holds no entropy,
 * and sits in no assignment they read.
 */
export const redact = (text: string): string =>
	gitleaksRedact(redactTable(text));

/** The id of each row the redaction runs, in order, so a test can list what ships. */
export const redactIds = (): readonly string[] => [
	...LOW_RULES.map((rule) => rule.id),
	...HIGH_RULES.map((rule) => rule.id),
];
