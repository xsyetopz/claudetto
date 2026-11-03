// `paths` of an allowlist and `path` of a rule are dropped: a transcript has no file path. In Gitleaks v8.30.1 (`detect/detect.go`) a rule with `path` skips a fragment whose path does not match, and an allowlist is not read for a fragment with no path and no commit, so `gitleaksDropped` lists the rule that needs a path.

export interface Pattern {
	readonly source: string;
	readonly flags: string;
}

export interface Allow {
	readonly condition: "AND" | "OR";
	readonly target: "secret" | "match" | "line";
	readonly regexes: readonly Pattern[];
	readonly stopwords: readonly string[];
}

export interface Rule {
	readonly id: string;
	readonly pattern: Pattern;
	readonly keywords: readonly string[];
	readonly entropy?: number;
	readonly secretGroup?: number;
	/** Masks the whole match: a repeating capture group holds one part of a shape, not the secret. */
	readonly whole?: true;
	readonly allow: readonly Allow[];
}

export interface Rules {
	readonly ref: string;
	readonly sha256: string;
	readonly rules: readonly Rule[];
	readonly allow: readonly Allow[];
	readonly dropped: readonly (readonly [string, string])[];
}
