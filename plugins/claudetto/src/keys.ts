// A row below records a key's name, where claudetto writes it, and the value it writes. The name is
// checked against the vendored settings schema (`tools/settings-schema.ts`), which is the published
// list of the keys Claude Code reads. A row carries no module and no offset: that pair says where a
// name sat in the bundle on the day somebody read it, it moves inside one version, and no check can
// tell a stale pair from a current one.

import {
	AUTOCOMPACT_PCT,
	autocompactPctText,
	CONTEXT_WINDOW,
	compactAt,
} from "./threshold.ts";

/** The key is an environment variable, which claudetto writes in the `env` block of the settings. */
export const ENV = "env";

/** The key is a settings key of its own, written beside the `env` block and not inside it. */
export const SETTING = "setting";

/** Where claudetto writes a key: in the `env` block of the settings, or as a settings key of its own. */
export type Kind = typeof ENV | typeof SETTING;

/** What a key may be set to, as the settings file stores it. */
export type Value = string | number | boolean;

/** A key of the harness: its name, where claudetto writes it, and the value claudetto writes for it if any. */
export interface KeyPin {
	readonly name: string;
	readonly kind: Kind;
	/** What claudetto writes, or none when it writes nothing. */
	readonly value?: Value;
}

/** A `KeyPin` that claudetto writes, so its `value` is never missing. */
export interface WrittenKey extends KeyPin {
	readonly value: Value;
}

/** The compaction keys read from the installed build, each with the value claudetto writes, or none for a key left to the harness default. */
export const COMPACTION_KEYS: readonly KeyPin[] = [
	// Written. It is the only key that moves the threshold without shortening the window, and the
	// threshold is worth −14.2% of the bill at 140,000 (`docs/evidence/compaction/threshold.md`).
	// Its first purpose, holding the harness's summary until the handoff was written, did lapse when
	// the handoff moved to `classic.PreCompact`, which the harness awaits; the priced one stands.
	{
		name: "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE",
		kind: ENV,
		value: autocompactPctText(),
	},
	// Written. It is the window the percentage applies to, so the pair is one lever and neither half
	// means anything alone.
	{ name: "autoCompactWindow", kind: SETTING, value: CONTEXT_WINDOW },
	// Written. An idle compaction is a model request nobody waits for, and the one thing it buys is a
	// small prompt after the cache expires. On this login 2 of 8,702 gaps between requests exceed the
	// `1h` cache lifetime, so it almost never buys that (`docs/evidence/compaction/threshold.md`).
	{ name: "idleCompaction", kind: SETTING, value: false },
	// Unset, same rows as `idleCompaction`: sleep compaction is the same bet on a return after the
	// cache lifetime, and these rows say the bet almost never pays here.
	{ name: "CLAUDE_CODE_SLEEP_COMPACT", kind: ENV },
	// Unset. It only moves the moment of a compaction that claudetto does not turn on.
	{ name: "CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS", kind: ENV },
	// Unset. It is the floor at which idle compaction applies, which is no lever while
	// `idleCompaction` is `false`.
	{ name: "CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS", kind: ENV },
	// Unset. It sets the window for every model at once, and the Haiku row needs its own window of
	// 200,000 beside the default 300,000, which only the per-model settings route gives.
	{ name: "CLAUDE_CODE_AUTO_COMPACT_WINDOW", kind: ENV },
	// Unset on purpose, and a dependency of the handoff rather than a lever: auto-compact is on by
	// default, and the handoff hangs off the compaction the harness runs. A user
	// who turned it off keeps that value.
	{ name: "autoCompactEnabled", kind: SETTING },
	// Unset, and open. It builds the summary ahead of time, which is an extra model request unless
	// the summary is used, and no reading prices it either way (`docs/levers.md`).
	{ name: "precomputeCompactionEnabled", kind: SETTING },
];

const isWritten = (row: KeyPin): row is WrittenKey => row.value !== undefined;

/** The keys claudetto writes, with the value it writes. */
export const writtenKeys = (): readonly WrittenKey[] =>
	COMPACTION_KEYS.filter(isWritten);

/** The keys claudetto reads but leaves to the harness's own default. */
export const unsetKeys = (): readonly KeyPin[] =>
	COMPACTION_KEYS.filter((row) => row.value === undefined);

/** The settings claudetto writes for compaction, split into the `env` block and the keys beside it. */
export interface Snippet {
	readonly env: Readonly<Record<string, string>>;
	readonly settings: Readonly<Record<string, Value>>;
}

/**
 * The compaction half of the settings claudetto writes, as one snippet, because a key of this set
 * read alone says nothing: the percentage needs the window, and the window needs the percentage.
 */
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

/** The threshold the shipped snippet puts the harness's compaction at, in prompt tokens. */
export const snippetTriggerTokens = (): number =>
	compactAt(CONTEXT_WINDOW, AUTOCOMPACT_PCT);
