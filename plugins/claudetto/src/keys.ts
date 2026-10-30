// Rows carry no module or offset: that pair moves inside one version and no check can find it stale.

import {
	AUTOCOMPACT_PCT,
	autocompactPctText,
	CONTEXT_WINDOW,
	compactAt,
} from "./threshold.ts";

export const ENV = "env";

/** The `env` name of the compaction threshold, in percent of the window. */
export const AUTOCOMPACT_PCT_ENV = "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE";

export const SETTING = "setting";

export type Kind = typeof ENV | typeof SETTING;

export type Value = string | number | boolean;

export interface KeyPin {
	readonly name: string;
	readonly kind: Kind;
	readonly value?: Value;
}

export interface WrittenKey extends KeyPin {
	readonly value: Value;
}

export const COMPACTION_KEYS: readonly KeyPin[] = [
	// The only key that moves the threshold without shortening the window.
	{
		name: AUTOCOMPACT_PCT_ENV,
		kind: ENV,
		value: autocompactPctText(),
	},
	// The window the percentage applies to, so the pair is one lever.
	{ name: "autoCompactWindow", kind: SETTING, value: CONTEXT_WINDOW },
	// An idle compaction is a request nobody waits for, and almost never buys a small prompt.
	{ name: "idleCompaction", kind: SETTING, value: false },
	// Sleep compaction is the same bet as `idleCompaction`.
	{ name: "CLAUDE_CODE_SLEEP_COMPACT", kind: ENV },
	// Only moves the moment of a compaction that claudetto does not turn on.
	{ name: "CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS", kind: ENV },
	// The floor for idle compaction, no lever while `idleCompaction` is `false`.
	{ name: "CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS", kind: ENV },
	// Sets the window for every model at once; Haiku needs its own 200,000 via the per-model route.
	{ name: "CLAUDE_CODE_AUTO_COMPACT_WINDOW", kind: ENV },
	// A dependency of the handoff, not a lever: the handoff hangs off the compaction the harness runs.
	{ name: "autoCompactEnabled", kind: SETTING },
	// Builds the summary ahead of time, an extra request unless used; no reading prices it.
	{ name: "precomputeCompactionEnabled", kind: SETTING },
];

const isWritten = (row: KeyPin): row is WrittenKey => row.value !== undefined;

export const writtenKeys = (): readonly WrittenKey[] =>
	COMPACTION_KEYS.filter(isWritten);

export const unsetKeys = (): readonly KeyPin[] =>
	COMPACTION_KEYS.filter((row) => row.value === undefined);

export interface Snippet {
	readonly env: Readonly<Record<string, string>>;
	readonly settings: Readonly<Record<string, Value>>;
}

/** One snippet: the percentage needs the window, and the window needs the percentage. */
export const compactionSnippet = (): Snippet => {
	const env: Record<string, string> = {};
	const settings: Record<string, Value> = {};
	for (const row of writtenKeys()) {
		if (row.kind === ENV) {
			env[row.name] = String(row.value);
		} else {
			settings[row.name] = row.value;
		}
	}
	return { env, settings };
};

export const snippetTriggerTokens = (): number =>
	compactAt(CONTEXT_WINDOW, AUTOCOMPACT_PCT);
