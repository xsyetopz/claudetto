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
import { nameOf } from "../shell/shellkinds.ts";
import { type Finding, verdict } from "./finding.ts";
import { pushHostFinding } from "./push.ts";

const FORCE_FLAG = /^-[A-Za-z]*f/;

export const gitFinding = (
	argv: string[],
	f: Facts,
	dir: string | null,
): Finding | undefined => {
	const call = gitCall(argv);
	if (call === undefined) {
		return undefined;
	}
	const at = dir === null ? null : pathOf(dir, call.dir ?? ".", f);
	const rewrite = remoteRewrite(call) ? verdict("ask", T.ASK_PUSH) : undefined;
	const host = pushHostFinding(call, f, at ?? f.cwd);
	if (host !== undefined) {
		return async () => (await host()) ?? rewrite;
	}
	if (rewrite !== undefined) {
		return rewrite;
	}
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
