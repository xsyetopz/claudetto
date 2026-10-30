// The findings of a `git` call that loses work or rewrites the remote, and of a shared-state change from a subagent.

import { nameOf } from "../../shell/shellkinds.ts";
import type { Facts, Verdict } from "../gate.ts";
import {
	bulkStage,
	gitCall,
	localLoss,
	remoteRewrite,
	wholeTree,
} from "../loss.ts";
import { pathOf } from "../paths.ts";
import * as T from "../prompts.ts";
import { type Finding, verdict } from "./finding.ts";

const FORCE_FLAG = /^-[A-Za-z]*f/;

/** The finding of a `git` call: a push that rewrites the remote, or a local command that can lose work. */
export const gitFinding = (
	argv: string[],
	f: Facts,
	dir: string | null,
): Finding | undefined => {
	const call = gitCall(argv);
	if (call === undefined) {
		return undefined;
	}
	if (remoteRewrite(call)) {
		return verdict("ask", T.ASK_PUSH);
	}
	const at = dir === null ? null : pathOf(dir, call.dir ?? ".", f);
	const bulk = bulkStage(call);
	if (bulk || wholeTree(call)) {
		return async () => {
			const files = await f.userEdits(at ?? f.cwd);
			const list = files.map((p) => `\`${p}\``).join(", ");
			return files.length > 0
				? verdict(
						"ask",
						bulk
							? T.ASK_BULK_STAGE({ files: list })
							: T.ASK_WHOLE_TREE({ verb: call.verb, files: list }),
					)
				: undefined;
		};
	}
	const loss = localLoss(call);
	if (loss === undefined) {
		return undefined;
	}
	const found = verdict("ask", T.ASK_GIT_LOSS({ verb: call.verb }));
	if (loss === "always" || at === null) {
		return found;
	}
	return async () =>
		(await f.git(loss.scope, at, loss.paths)) === "dirty" ? found : undefined;
};

/** A `git stash` (except `list` and `show`) or a `pkill -f` from a subagent, which changes the state of the main agent (X4). */
export const sharedFinding = (
	argv: string[],
	rest: string[],
): Verdict | undefined => {
	const call = gitCall(argv);
	const stash =
		call?.verb === "stash" && !["list", "show"].includes(call.args[0] ?? "");
	const pkill =
		nameOf(rest) === "pkill" &&
		rest.some((w) => w === "--full" || FORCE_FLAG.test(w));
	return stash || pkill ? verdict("ask", T.ASK_SHARED_TREE) : undefined;
};
