// The finding of an `Edit` or `Write` of a file that runs code, sets a permission, or holds a secret, such as a `git` hook or a workflow.

import * as T from "../prompts.ts";
import { verdict } from "./finding.ts";
import type { Verdict } from "./gate.ts";
import { ENV_FILE } from "./paths.ts";

const PROTECTED_PATHS = [
	/\/\.git\/hooks\//,
	/\/\.husky\//,
	/\/\.github\/workflows\//,
	/\/\.claude\/settings[\w.-]*\.json$/,
];
const MANIFEST = /\/package\.json$/;
/** A script key of `package.json` that a package manager runs on install. */
const INSTALL_SCRIPT = /"(?:pre|post)?install"\s*:|"prepare"\s*:/;
const TEXT_KEYS = ["new_string", "content", "new_source", "edits"];

/** The text that a call writes: each text field of the input, with `edits` of `MultiEdit` as JSON. */
const written = (input: Record<string, unknown>): string =>
	TEXT_KEYS.map((k) =>
		typeof input[k] === "string" ? input[k] : JSON.stringify(input[k] ?? ""),
	).join("\n");

/** An `ask` for a write to a `git` hook, a workflow, a settings file of Claude Code, an env file, or an install script of `package.json`. */
export const protectedFinding = (
	path: string | null,
	input: Record<string, unknown>,
): Verdict | undefined => {
	if (path === null) {
		return undefined;
	}
	const hit =
		PROTECTED_PATHS.some((re) => re.test(path)) ||
		ENV_FILE.test(path.slice(path.lastIndexOf("/") + 1)) ||
		(MANIFEST.test(path) && INSTALL_SCRIPT.test(written(input)));
	return hit ? verdict("ask", T.ASK_PROTECTED({ path })) : undefined;
};
