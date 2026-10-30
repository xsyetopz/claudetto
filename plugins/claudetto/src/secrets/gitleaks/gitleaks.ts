// The Gitleaks rules, run over a text. The data comes from `rules.ts`, which
// `just gitleaks-rules` generates from the upstream config, so nothing of a vendor's pattern is
// typed here and an update is a fetch.
//
// Each decision below is read from the Gitleaks source at the pinned ref, `detect/detect.go` and
// `config/allowlist.go` of `v8.30.1`, and not from the documentation:
//   - The secret of a hit is the group `secretGroup` names, else the first capture group that is
//     not empty, else the whole match (`detect.go:521`). The entropy gate and the allowlists read
//     that secret, and it is the part this file replaces.
//   - A rule with `entropy` keeps a hit only above the bound, never at it (`detect.go:547`).
//   - A global allowlist runs before a rule's own, and one hit on either drops the finding
//     (`detect.go:557`).
//   - An allowlist's `regexes` read the target its `regexTarget` names, and its `stopwords` always
//     read the secret (`detect.go:831` and `detect.go:845`).
//   - An empty target allows nothing (`allowlist.go`, `RegexAllowed` and `ContainsStopWord`).
//
// What this does not take from Gitleaks: the `gitleaks:allow` line signature, which turns a
// finding off. A transcript holds text that a model and a web page wrote, so a line that carries
// the signature would turn redaction off from inside the data. The keyword gate is kept, because
// it only decides which rule runs and cannot keep a secret in.

import { mask } from "../mask.ts";
import type { Allow, Rule, Rules } from "./data.ts";
import { GITLEAKS_RULES_JSON } from "./rules.ts";

const DATA: Rules = JSON.parse(GITLEAKS_RULES_JSON);

/** One allowlist with its patterns compiled. */
interface Allowed {
	readonly allow: Allow;
	readonly regexes: readonly RegExp[];
}

/** One rule with its pattern and its allowlists compiled. */
interface Compiled {
	readonly rule: Rule;
	readonly re: RegExp;
	readonly allows: readonly Allowed[];
}

const ESCAPE = /[.*+?^${}()|[\]\\-]/g;

const allowedOf = (allow: Allow): Allowed => ({
	allow,
	regexes: allow.regexes.map((p) => new RegExp(p.source, p.flags)),
});

const GLOBAL = DATA.allow.map(allowedOf);

/**
 * Every keyword of every rule, in one pattern, so that one pass over the text decides which rules
 * run. Gitleaks gates a rule the same way, on the words of its `keywords`.
 */
const KEYWORDS = new RegExp(
	[...new Set(DATA.rules.flatMap((rule) => rule.keywords))]
		.map((word) => word.replace(ESCAPE, "\\$&"))
		.join("|"),
	"gi",
);

const keywordsIn = (text: string): Set<string> => {
	const found = new Set<string>();
	for (const hit of text.matchAll(KEYWORDS)) {
		found.add(hit[0].toLowerCase());
	}
	return found;
};

const cache = new Map<string, Compiled | undefined>();

/**
 * The rule, compiled, or `undefined` when the engine of the running program refuses its pattern.
 * A refusal is held rather than thrown: the pattern of one vendor is not worth a failed handoff,
 * and `gitleaksSkipped` reports what the engine refused.
 */
const compiled = (rule: Rule): Compiled | undefined => {
	const held = cache.get(rule.id);
	if (held !== undefined || cache.has(rule.id)) {
		return held;
	}
	let made: Compiled | undefined;
	try {
		made = {
			rule,
			re: new RegExp(rule.pattern.source, `${rule.pattern.flags}g`),
			allows: rule.allow.map(allowedOf),
		};
	} catch {
		made = undefined;
	}
	cache.set(rule.id, made);
	return made;
};

/** `shannonEntropy`: the bits per character of `text`. */
const entropyOf = (text: string): number => {
	const counts = new Map<string, number>();
	for (const char of text) {
		counts.set(char, (counts.get(char) ?? 0) + 1);
	}
	let bits = 0;
	for (const count of counts.values()) {
		const share = count / text.length;
		bits -= share * Math.log2(share);
	}
	return bits;
};

/** The secret of a hit, which is what the gates read and what the mask replaces. */
const secretOf = (hit: RegExpMatchArray, rule: Rule): string => {
	const groups = hit.slice(1);
	if (groups.length === 0 || rule.whole === true) {
		return hit[0];
	}
	const named =
		rule.secretGroup === undefined ? undefined : hit[rule.secretGroup];
	return named ?? groups.find((group) => (group ?? "") !== "") ?? hit[0];
};

/** The whole lines that `hit` sits on, which is the `line` target of an allowlist. */
const lineOf = (text: string, hit: RegExpMatchArray): string => {
	const at = hit.index ?? 0;
	const start = text.lastIndexOf("\n", at) + 1;
	const stop = text.indexOf("\n", at + hit[0].length);
	return text.slice(start, stop === -1 ? text.length : stop);
};

const allowsHit = (
	allowed: Allowed,
	target: string,
	secret: string,
): boolean => {
	const checks: boolean[] = [];
	if (allowed.regexes.length > 0) {
		checks.push(target !== "" && allowed.regexes.some((re) => re.test(target)));
	}
	if (allowed.allow.stopwords.length > 0) {
		const low = secret.toLowerCase();
		checks.push(
			secret !== "" &&
				allowed.allow.stopwords.some((word) => low.includes(word)),
		);
	}
	return allowed.allow.condition === "AND"
		? checks.every(Boolean)
		: checks.some(Boolean);
};

/** What the `regexes` of the allowlist read, which its `regexTarget` names. */
const targetOf = (
	allow: Allow,
	text: string,
	hit: RegExpMatchArray,
	secret: string,
): string => {
	if (allow.target === "match") {
		return hit[0];
	}
	return allow.target === "line" ? lineOf(text, hit) : secret;
};

const dropped = (
	allows: readonly Allowed[],
	text: string,
	hit: RegExpMatchArray,
	secret: string,
): boolean =>
	allows.some((allowed) =>
		allowsHit(allowed, targetOf(allowed.allow, text, hit, secret), secret),
	);

const runRule = (text: string, rule: Compiled): string => {
	let out = "";
	let taken = 0;
	for (const hit of text.matchAll(rule.re)) {
		const at = hit.index ?? 0;
		if (hit[0] === "" || at < taken) {
			continue;
		}
		const secret = secretOf(hit, rule.rule);
		const bound = rule.rule.entropy;
		if (bound !== undefined && entropyOf(secret) <= bound) {
			continue;
		}
		if (
			dropped(GLOBAL, text, hit, secret) ||
			dropped(rule.allows, text, hit, secret)
		) {
			continue;
		}
		out += text.slice(taken, at) + mask(hit[0], secret);
		taken = at + hit[0].length;
	}
	return taken === 0 ? text : out + text.slice(taken);
};

/** `text` with every secret the Gitleaks rules find replaced. */
export const gitleaksRedact = (text: string): string => {
	const words = keywordsIn(text);
	let out = text;
	for (const rule of DATA.rules) {
		if (!rule.keywords.some((word) => words.has(word))) {
			continue;
		}
		const ready = compiled(rule);
		if (ready) {
			out = runRule(out, ready);
		}
	}
	return out;
};

/** The ref and the digest of the config the rules were generated from. */
export const gitleaksSource = (): { ref: string; sha256: string } => ({
	ref: DATA.ref,
	sha256: DATA.sha256,
});

/** The id of each rule that ships, so a test can list what runs. */
export const gitleaksIds = (): readonly string[] =>
	DATA.rules.map((rule) => rule.id);

/** Each rule the generation left out, with the reason. */
export const gitleaksDropped = (): readonly (readonly [string, string])[] =>
	DATA.dropped;

/** The id of each rule the engine of the running program refused, after a redaction ran. */
export const gitleaksSkipped = (): readonly string[] =>
	[...cache.entries()].flatMap(([id, made]) => (made ? [] : [id]));
