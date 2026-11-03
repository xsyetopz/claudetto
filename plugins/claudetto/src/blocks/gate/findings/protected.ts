import type { Verdict } from "../gate.ts";
import { ENV_FILE } from "../paths.ts";
import * as T from "../prompts.ts";
import { verdict } from "./finding.ts";

// A choice of the author: the paths of files that run code or set a permission, so a change to one asks.
const PROTECTED_PATHS = [
	/\/\.git\/hooks\//,
	/\/\.husky\//,
	/\/\.github\/workflows\//,
	/\/\.claude\/settings[\w.-]*\.json$/,
];
const MANIFEST = /\/package\.json$/;
// A choice of the author: the script names of `package.json` that the gate takes to run on an install, so a change to one asks.
const INSTALL_SCRIPT = /"(?:pre|post)?install"\s*:|"prepare"\s*:/;
const TEXT_KEYS = ["new_string", "content", "new_source", "edits"];

const written = (input: Record<string, unknown>): string =>
	TEXT_KEYS.map((k) =>
		typeof input[k] === "string" ? input[k] : JSON.stringify(input[k] ?? ""),
	).join("\n");

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
