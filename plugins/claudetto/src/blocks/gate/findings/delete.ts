import type { Facts, Verdict } from "../gate.ts";
import { isDbFile } from "../loss.ts";
import { inTmp, pathOf, userFile } from "../paths.ts";
import * as T from "../prompts.ts";
import { atRoot, verdict } from "./finding.ts";

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
