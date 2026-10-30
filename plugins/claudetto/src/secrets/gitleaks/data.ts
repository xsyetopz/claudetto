// The shape of the generated rule data, read by the runtime of `gitleaks.ts` and written by
// `tools/gitleaks/build.ts`, so that one file holds the contract between the generator and the mod.
//
// A field is named for the Gitleaks field it carries, except where a transcript has no counterpart
// for it. The `paths` criterion of an allowlist and the `path` field of a rule are gone, because a
// handoff reads a transcript and never a file of the tree, so neither can ever match.

/** A pattern as JavaScript takes it: the source, and the flags that the generator lifted out of it. */
export interface Pattern {
	readonly source: string;
	readonly flags: string;
}

/**
 * One allowlist of a rule, or one of the config's global allowlists. A hit on it drops the finding.
 *
 * `target` is the Gitleaks `regexTarget`: `secret` is the value the entropy gate reads, `match` is
 * the whole match, and `line` is the line the match sits on.
 */
export interface Allow {
	readonly condition: "AND" | "OR";
	readonly target: "secret" | "match" | "line";
	readonly regexes: readonly Pattern[];
	readonly stopwords: readonly string[];
}

/** One rule of the Gitleaks config, translated for JavaScript. */
export interface Rule {
	readonly id: string;
	readonly pattern: Pattern;
	/** The literal words Gitleaks requires in the text before it runs the pattern. */
	readonly keywords: readonly string[];
	/** The least Shannon entropy of the secret, when the rule sets one. */
	readonly entropy?: number;
	/** The capture group that holds the secret, when the rule names one. */
	readonly secretGroup?: number;
	/**
	 * The mask replaces the whole match, because a capture group of this rule repeats and so holds
	 * one part of a shape rather than the secret. `tools/gitleaks/build.ts` decides it.
	 */
	readonly whole?: true;
	readonly allow: readonly Allow[];
}

/** The generated data: the rules, the global allowlists, and what the generation left out. */
export interface Rules {
	/** The Git ref of the Gitleaks repository the rules came from. */
	readonly ref: string;
	/** The SHA-256 of the `config/gitleaks.toml` the rules came from. */
	readonly sha256: string;
	readonly rules: readonly Rule[];
	readonly allow: readonly Allow[];
	/** Each rule or allowlist pattern the generation left out, as the id and the reason. */
	readonly dropped: readonly (readonly [string, string])[];
}
