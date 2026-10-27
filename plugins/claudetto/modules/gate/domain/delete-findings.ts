// The findings of a delete or a move: a target that the gate cannot read, the root or home folder, and a database file.

import * as T from "../prompts.ts";
import { atRoot, verdict } from "./finding.ts";
import type { Facts, Verdict } from "./gate.ts";
import { isDbFile } from "./loss.ts";
import { inTmp, pathOf, userFile } from "./paths.ts";

/** A delete asks when the gate cannot read its target or removes a database file outside the temp folder, and it is denied for the root or the home folder (D1). */
export const deleteFindings = (
	targets: string[],
	dir: string | null,
	f: Facts,
): Verdict[] =>
	targets.flatMap((target) => {
		const path = dir === null ? null : pathOf(dir, target, f);
		if (path === null) {
			return [verdict("ask", T.ASK_DELETE_UNREAD({ target }))];
		}
		if (atRoot(path, f)) {
			return [verdict("deny", T.DENY_ROOT({ target }))];
		}
		if (userFile(path, f)) {
			return [verdict("ask", T.ASK_USER_FILES({ target }))];
		}
		return isDbFile(path) && !inTmp(path, f)
			? [verdict("ask", T.ASK_DB_LOSS)]
			: [];
	});

/** A move asks when a source is a file of the user outside the project (\`mv ~/Documents/* /tmp\`), because the source leaves its place. A source that the gate cannot read is allowed. */
export const moveFindings = (
	sources: string[],
	dir: string | null,
	f: Facts,
): Verdict[] =>
	sources.flatMap((target) => {
		const path = dir === null ? null : pathOf(dir, target, f);
		return path !== null && userFile(path, f)
			? [verdict("ask", T.ASK_USER_FILES({ target }))]
			: [];
	});
