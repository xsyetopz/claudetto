import type { EngineInterface, On } from "claude-code";

import { SPEC_CHANGE_HEAD, SPECS_DIR, STOP_BLOCK_HEAD } from "../texts";
import { newFindings, readBaseline, sinceStart } from "./baseline";
import { gather, LIST_ARGV } from "./gather";
import { type HardFinding, hardFindings } from "./hard";
import { parseSpec } from "./parse";
import { isSpecFile } from "./paths";
import { checkSpecs, type Report } from "./spec";

/** One line the agent acts on. */
function lineOf(f: HardFinding): string {
	if (f.kind === "tampered") {
		return `- ${f.message}; restore the staged test and report honestly why it cannot pass`;
	}
	return `- ${f.message}`;
}

/** The behaviour sentence `id` has in any spec file of `texts`. */
function wordingIn(
	texts: ReadonlyMap<string, string>,
	id: string
): string | undefined {
	for (const [file, text] of texts) {
		if (!isSpecFile(file)) {
			continue;
		}
		const wording = parseSpec(file, text).behaviours.get(id);
		if (wording !== undefined) {
			return wording;
		}
	}
	return undefined;
}

/** A requirement the session changed, as the person reads it, keyed by its current state. */
interface SpecChange {
	key: string;
	line: string;
}

/** One change per reworded or removed ID, with the wording it had before. */
function changesOf(
	report: Report,
	was: ReadonlyMap<string, string>,
	now: ReadonlyMap<string, string>
): SpecChange[] {
	const before = (id: string): string => {
		const wording = wordingIn(was, id);
		return wording === undefined ? "" : `; it read "${wording}"`;
	};
	return [
		...report.reworded.map((r) => ({
			key: `${r.id} ${wordingIn(now, r.id) ?? ""}`,
			line: `- \`${r.id}\` (\`${r.file}:${r.line}\`) reworded${before(r.id)}`
		})),
		...report.removedIds.map((r) => ({
			key: `${r.id} removed`,
			line: `- \`${r.id}\` removed from \`${r.file}\`${before(r.id)}`
		}))
	];
}

/** What a Stop check found: the block text, if any, and the spec changes to show. */
interface StopCheck {
	block: string | undefined;
	changes: SpecChange[];
}

const NOTHING: StopCheck = { block: undefined, changes: [] };

/**
 * Checks the repo at a Stop: the hard findings that block, and the requirements the
 * session reworded or removed, which the person is shown and which never block.
 *
 * A repo without `specs/` costs one `fs.exists` and no git run. A git failure finds
 * nothing, so the gate fails open. With a session-start baseline, only what the session
 * changed counts, so the user's own edits never do.
 */
async function checkAtStop($: EngineInterface): Promise<StopCheck> {
	if (!(await $.fs.exists(SPECS_DIR))) {
		return NOTHING;
	}
	const listed = await $.process.run(LIST_ARGV);
	if (listed.exitCode !== 0) {
		return NOTHING;
	}
	const base = await readBaseline($);
	const input = await gather($, listed.stdout);
	const compared = base === undefined ? input : sinceStart(input, base);
	const report = checkSpecs({ ...compared, path: undefined });
	const checked = hardFindings(report);
	const found =
		base === undefined ? checked : newFindings(checked, base, input.texts);
	return {
		block:
			found.length === 0
				? undefined
				: [STOP_BLOCK_HEAD, ...found.map((f) => lineOf(f))].join("\n"),
		changes: changesOf(report, compared.head ?? new Map(), input.texts)
	};
}

/**
 * Blocks the main agent's Stop once when `spec_check` has a hard finding the session
 * caused, and shows the person each requirement the session reworded or removed.
 *
 * `recordBaseline` at session start sets what counts as the session's own. `stop_hook_active` is true when a Stop hook
 * already blocked this turn, so the gate lets that Stop through and cannot loop. A
 * subagent's hook input carries `agent_id`, and a subagent is never blocked. A spec
 * change is shown once until its wording changes again. An error never blocks.
 *
 * @param on The engine's hook registrar.
 */
export function registerSpecStop(on: On): void {
	const shown = new Set<string>();
	on("classic.Stop", async ($, e, next) => {
		if (e.stop_hook_active || e.agent_id !== undefined) {
			return next(e);
		}
		const { block, changes } = await checkAtStop($);
		const fresh = changes.filter((c) => !shown.has(c.key));
		if (fresh.length > 0) {
			for (const c of fresh) {
				shown.add(c.key);
			}
			$.ui.log([SPEC_CHANGE_HEAD, ...fresh.map((c) => c.line)].join("\n"));
		}
		return block === undefined ? next(e) : { ...(await next(e)), block };
	}).catch(($, e, next) => {
		$.ui.log("`Stop` gate failed", { to: "debug" });
		return next(e);
	});
}
