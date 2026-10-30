// A rule with a `path` can never fire on a transcript, so it is dropped and recorded in `dropped`.

import { TOML } from "bun";
import type {
	Allow,
	Pattern,
	Rule,
	Rules,
} from "../../plugins/claudetto/src/shared/secrets/gitleaks/data.ts";
import { translate } from "./translate.ts";

type Drop = readonly [string, string];

const asText = (value: unknown): string | undefined =>
	typeof value === "string" ? value : undefined;

const asTexts = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];

const asNumber = (value: unknown): number | undefined =>
	typeof value === "number" ? value : undefined;

/** A map, not an object: the type check refuses a name read off an index signature. */
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

/** A pattern that will not compile is dropped and recorded: a lost one masks more than Gitleaks would. */
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

/** A repeating group captures a shape, not the secret, so the rule is masked whole. */
const repeats = (source: string): boolean => {
	const capturing: boolean[] = [];
	let inClass = false;
	let at = 0;
	while (at < source.length) {
		const char = source[at];
		at += 1;
		if (char === "\\") {
			at += 1;
			continue;
		}
		if (inClass) {
			inClass = char !== "]";
			continue;
		}
		switch (char) {
			case "[":
				inClass = true;
				break;
			case "(":
				capturing.push(source[at] !== "?");
				break;
			case ")": {
				const held = capturing.pop();
				const next = source[at];
				// `next` is tested for a value first, because every string holds the empty string.
				if (held === true && next !== undefined && "*+{".includes(next)) {
					return true;
				}
				break;
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
