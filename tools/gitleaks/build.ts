// The Gitleaks config, read as data and turned into the rules the mod runs. Nothing here is typed
// by hand from the config: `Bun.TOML.parse` reads it, so a rule the upstream adds arrives with the
// next fetch and no edit.
//
// What this leaves out, and why a transcript gives it no meaning:
//   - A rule with a `path`, such as `nuget-config-password`, which Gitleaks fires only on a file
//     whose name matches. A handoff reads a transcript, so the name never exists and the rule can
//     never fire. Each one is recorded in `dropped`.
//   - The `paths` criterion of an allowlist, for the same reason. An allowlist of `condition = "AND"`
//     that carries one can never be satisfied, so the whole allowlist goes; in an `OR` allowlist the
//     criterion alone goes, because the others still decide.
//   - `commits`, which belongs to a Git scan.
//
// `entropy`, `keywords`, `secretGroup`, `regexes`, `stopwords`, `regexTarget`, and `condition` are
// all kept, and `plugins/claudetto/src/secrets/gitleaks/gitleaks.ts` runs them.

import { TOML } from "bun";
import type {
	Allow,
	Pattern,
	Rule,
	Rules,
} from "../../plugins/claudetto/src/secrets/gitleaks/data.ts";
import { translate } from "./translate.ts";

/** A reason a rule or a pattern was left out, paired with the id it belongs to. */
type Drop = readonly [string, string];

const asText = (value: unknown): string | undefined =>
	typeof value === "string" ? value : undefined;

const asTexts = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];

const asNumber = (value: unknown): number | undefined =>
	typeof value === "number" ? value : undefined;

/**
 * A TOML table as a map, which is how every read below names a field. A map and not an object,
 * because the type check of this tree refuses a field read off an index signature by its name, and
 * a lint rule of this tree refuses the bracket that would satisfy it.
 */
const asTable = (value: unknown): Map<string, unknown> =>
	new Map(
		typeof value === "object" && value !== null ? Object.entries(value) : [],
	);

const asTables = (value: unknown): Map<string, unknown>[] =>
	Array.isArray(value) ? value.map(asTable) : [];

/** The `regexTarget` of an allowlist. Gitleaks reads the secret when the field is absent. */
const targetOf = (value: unknown): Allow["target"] => {
	const target = asText(value);
	if (target === "match") {
		return "match";
	}
	return target === "line" ? "line" : "secret";
};

/**
 * One allowlist, or `undefined` when nothing of it can be checked against a transcript.
 *
 * A pattern that will not compile is dropped and recorded, never silently kept: a lost allowlist
 * pattern masks more text than Gitleaks would, which a reader of `dropped` can see and weigh.
 */
const allowOf = (
	raw: Map<string, unknown>,
	id: string,
	drops: Drop[],
): Allow | undefined => {
	const condition =
		asText(raw.get("condition"))?.toUpperCase() === "AND" ? "AND" : "OR";
	const paths = asTexts(raw.get("paths")).length > 0;
	if (condition === "AND" && paths) {
		drops.push([id, "allowlist needs a file path, which a transcript has not"]);
		return undefined;
	}
	const regexes: Pattern[] = [];
	for (const source of asTexts(raw.get("regexes"))) {
		const pattern = translate(source);
		if (pattern === undefined) {
			drops.push([id, `allowlist pattern will not compile: ${source}`]);
		} else {
			regexes.push(pattern);
		}
	}
	const stopwords = asTexts(raw.get("stopwords")).map((word) =>
		word.toLowerCase(),
	);
	if (regexes.length === 0 && stopwords.length === 0) {
		return undefined;
	}
	return {
		condition,
		target: targetOf(raw.get("regexTarget")),
		regexes,
		stopwords,
	};
};

/** Every allowlist of a table, which Gitleaks spells `allowlist` for one and `allowlists` for many. */
const allowsOf = (
	raw: Map<string, unknown>,
	id: string,
	drops: Drop[],
): Allow[] => {
	const tables = [...asTables(raw.get("allowlists"))];
	if (raw.get("allowlist") !== undefined) {
		tables.push(asTable(raw.get("allowlist")));
	}
	return tables.flatMap((table) => allowOf(table, id, drops) ?? []);
};

/**
 * Whether a capture group of `source` repeats, which makes its groups parts of a shape rather than
 * the secret inside it. `microsoft-teams-webhook` reads a whole webhook URL and captures
 * `([a-z0-9]{4}-){3}`, one chunk of a UUID in it, so the mask of that chunk alone would leave the
 * URL working. A rule like it is masked whole.
 *
 * Gitleaks reports the chunk as the secret of the finding and the URL as its match, which costs it
 * nothing, because it reports and does not rewrite.
 */
const repeats = (source: string): boolean => {
	const capturing: boolean[] = [];
	let inClass = false;
	let at = 0;
	while (at < source.length) {
		const char = source[at];
		at += 1;
		if (char === "\\") {
			at += 1;
		} else if (inClass) {
			inClass = char !== "]";
		} else if (char === "[") {
			inClass = true;
		} else if (char === "(") {
			capturing.push(source[at] !== "?");
		} else if (char === ")") {
			const held = capturing.pop();
			const next = source[at];
			// `next` is tested for a value first, because every string holds the empty string.
			if (held === true && next !== undefined && "*+{".includes(next)) {
				return true;
			}
		}
	}
	return false;
};

const ruleOf = (raw: Map<string, unknown>, drops: Drop[]): Rule | undefined => {
	const id = asText(raw.get("id"));
	if (id === undefined) {
		return undefined;
	}
	const regex = asText(raw.get("regex"));
	if (regex === undefined) {
		drops.push([id, "the rule carries no pattern, only a file name"]);
		return undefined;
	}
	if (asText(raw.get("path")) !== undefined) {
		drops.push([id, "the rule needs a file path, which a transcript has not"]);
		return undefined;
	}
	const pattern = translate(regex);
	if (pattern === undefined) {
		drops.push([id, "the pattern will not compile as JavaScript"]);
		return undefined;
	}
	const keywords = asTexts(raw.get("keywords")).map((word) =>
		word.toLowerCase(),
	);
	if (keywords.length === 0) {
		drops.push([id, "the rule carries no keyword to gate it"]);
		return undefined;
	}
	const entropy = asNumber(raw.get("entropy"));
	const secretGroup = asNumber(raw.get("secretGroup"));
	return {
		id,
		pattern,
		keywords,
		...(entropy !== undefined && entropy > 0 && { entropy }),
		...(secretGroup !== undefined && secretGroup > 0 && { secretGroup }),
		...(secretGroup === undefined &&
			repeats(pattern.source) && { whole: true }),
		allow: allowsOf(raw, id, drops),
	};
};

/** The rules of the Gitleaks config `toml`, with the ref and the digest it was fetched under. */
export const build = (toml: string, ref: string, sha256: string): Rules => {
	const config = asTable(TOML.parse(toml));
	const drops: Drop[] = [];
	const rules = asTables(config.get("rules")).flatMap(
		(raw) => ruleOf(raw, drops) ?? [],
	);
	return {
		ref,
		sha256,
		rules,
		allow: allowsOf(config, "<global>", drops),
		dropped: drops,
	};
};
