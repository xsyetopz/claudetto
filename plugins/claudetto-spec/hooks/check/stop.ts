import type { EngineInterface, On } from "claude-code";

import { AMEND_RULE, SPECS_DIR, STOP_BLOCK_HEAD } from "../texts";
import { type HardFinding, hardFindings } from "./hard";
import { checkSpecs } from "./spec";
import { gather, LIST_ARGV } from "./tool";

/** One line the agent acts on: a changed requirement needs the user's explicit word. */
function lineOf(f: HardFinding): string {
	if (f.kind === "reworded" || f.kind === "removedId") {
		return `- ${f.subject} changed since HEAD (${f.message}); ${AMEND_RULE}. Unless the request cites ${f.subject} or the spec, restore the spec, the tests citing it and the code, then report the conflict naming ${f.subject} and change nothing else; otherwise quote the request's words that name it`;
	}
	if (f.kind === "tampered") {
		return `- ${f.message}; restore the staged test and report honestly why it cannot pass`;
	}
	return `- ${f.message}`;
}

/**
 * The reason to block a Stop, or `undefined` when nothing blocks.
 *
 * A repo without `specs/` costs one `fs.exists` and no git run. A git failure yields
 * `undefined`, so the gate fails open. Advice findings never block.
 *
 * @param $ The engine interface.
 * @returns The block text listing each hard finding, or `undefined`.
 */
export async function stopReason(
	$: EngineInterface
): Promise<string | undefined> {
	if (!(await $.fs.exists(SPECS_DIR))) {
		return undefined;
	}
	const listed = await $.process.run(LIST_ARGV);
	if (listed.exitCode !== 0) {
		return undefined;
	}
	const input = await gather($, listed.stdout);
	const found = hardFindings(checkSpecs({ ...input, path: undefined }));
	if (found.length === 0) {
		return undefined;
	}
	return [STOP_BLOCK_HEAD, ...found.map((f) => lineOf(f))].join("\n");
}

/**
 * Blocks the main agent's Stop once when `spec_check` has a hard finding.
 *
 * `stop_hook_active` is true when a Stop hook already blocked this turn, so the
 * gate lets that Stop through and cannot loop. A subagent's hook input carries
 * `agent_id`, and a subagent is never blocked. An error never blocks.
 *
 * @param on The engine's hook registrar.
 */
export function registerSpecStop(on: On): void {
	on("classic.Stop", async ($, e, next) => {
		if (e.stop_hook_active || e.agent_id !== undefined) {
			return next(e);
		}
		const block = await stopReason($);
		return block === undefined ? next(e) : { ...(await next(e)), block };
	}).catch(($, e, next) => {
		$.ui.log("claudetto-spec: Stop gate failed", { to: "debug" });
		return next(e);
	});
}
