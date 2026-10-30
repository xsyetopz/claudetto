// The names a tier snippet sets, split by where Claude Code reads them. There is no second list of
// the keys a row may set: the snippet is the list, so a key added to it is checked without an edit
// here. `tests/claudetto/tier/keys.test.ts` checks a settings key against the vendored settings
// schema and an `env` name against the installed program.

import type { TierSnippet } from "./snippet.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** The settings keys a snippet sets, which is every top-level key but the `env` block. */
export const settingsKeyNames = (snippet: TierSnippet): readonly string[] =>
	Object.keys(snippet).filter((key) => key !== "env");

/** The environment variable names a snippet sets inside its `env` block. */
export const envKeyNames = (snippet: TierSnippet): readonly string[] => {
	const env = snippet["env"];
	return isRecord(env) ? Object.keys(env) : [];
};
