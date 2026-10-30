// The `gitleaks:allow` signature is ignored: transcript text could switch redaction off.

import { mask } from "../mask.ts";
import type { Allow, Rule, Rules } from "./data.ts";
import { GITLEAKS_RULES_JSON } from "./rules.ts";

const DATA: Rules = JSON.parse(GITLEAKS_RULES_JSON);

interface Allowed {
	readonly allow: Allow;
	readonly regexes: readonly RegExp[];
}

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

/** A refusal is held, not thrown: one vendor's pattern is not worth a failed handoff. */
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

const secretOf = (hit: RegExpMatchArray, rule: Rule): string => {
	const groups = hit.slice(1);
	if (groups.length === 0 || rule.whole === true) {
		return hit[0];
	}
	const named =
		rule.secretGroup === undefined ? undefined : hit[rule.secretGroup];
	return named ?? groups.find((group) => (group ?? "") !== "") ?? hit[0];
};

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

export const gitleaksSource = (): { ref: string; sha256: string } => ({
	ref: DATA.ref,
	sha256: DATA.sha256,
});

export const gitleaksIds = (): readonly string[] =>
	DATA.rules.map((rule) => rule.id);

export const gitleaksDropped = (): readonly (readonly [string, string])[] =>
	DATA.dropped;

export const gitleaksSkipped = (): readonly string[] =>
	[...cache.entries()].flatMap(([id, made]) => (made ? [] : [id]));
