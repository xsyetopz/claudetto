// `paths` and `path` are dropped: a transcript is not a file, so neither can match.

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
