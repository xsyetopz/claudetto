// The names a tier snippet sets, split by where Claude Code reads them. There is no second list of
// the keys a row may set: the snippet is the list, so a key added to it is checked without an edit
// here. `tests/claudetto/tier/keys.test.ts` checks a settings key against the vendored settings
// schema and an `env` name against the installed program.

import { refusedNames } from "../refused.ts";
import type { TierSnippet } from "./snippet.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const ENV_PREFIX = /^env\./;

/** The settings keys a snippet sets, which is every top-level key but the `env` block. */
export const settingsKeyNames = (snippet: TierSnippet): readonly string[] =>
	Object.keys(snippet).filter((key) => key !== "env");

/** The environment variable names a snippet sets inside its `env` block. */
export const envKeyNames = (snippet: TierSnippet): readonly string[] => {
	const env = snippet["env"];
	return isRecord(env) ? Object.keys(env) : [];
};

/**
 * The paths of `snippet`, written with dots, that name a key of `../refused.ts` at the top level or
 * inside `env`. Both halves are searched, because a settings key written into the `env` block is
 * still a key the harness reads. It lives here rather than beside `applyTier` so that the hook of
 * `hooks.ts` can reach it: `setup.ts` imports `node:fs/promises`, which a hooks module has not got.
 */
export const refusedPaths = (snippet: TierSnippet): readonly string[] =>
	[
		...Object.keys(snippet),
		...envKeyNames(snippet).map((name) => `env.${name}`),
	].filter((path) => refusedNames().includes(path.replace(ENV_PREFIX, "")));
