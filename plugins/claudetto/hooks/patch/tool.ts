import type { EngineInterface, On } from "claude-code";

import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";
import { applyOps } from "./apply";
import { instructionsFor, resetShown } from "./instructions";
import { parsePatch } from "./parse";
import { absolute, pathsOf, placePaths } from "./paths";
import {
	PATCH_DESCRIPTION,
	TOOL_DESCRIPTION,
	TOOL_FULL_NAME,
	TOOL_NAME
} from "./texts";

/** The `patch` registration: in front of the model (not deferred), one `patch` string. */
export const PATCH_TOOL = {
	name: TOOL_NAME,
	description: TOOL_DESCRIPTION,
	inputSchema: {
		type: "object",
		properties: { patch: { type: "string", description: PATCH_DESCRIPTION } },
		required: ["patch"]
	},
	isDeferred: false
};

type Verdict = "allow" | "ask" | "deny";
const RANK: Record<Verdict, number> = { allow: 0, ask: 1, deny: 2 };

/**
 * The strictest verdict the engine gives the Edit and Write tools for each
 * path, so a deny or ask rule written for them (`Edit(**\/.env)`,
 * `Write(~/.claude/settings.json)`) holds through `patch` too.
 */
async function editVerdict(
	$: EngineInterface,
	paths: readonly string[]
): Promise<{ decision: Verdict; reason?: string }> {
	const answers = await Promise.all(
		paths.flatMap((file_path) => [
			$.tool
				.check({
					tool: "Edit",
					input: { file_path, old_string: "", new_string: "" }
				})
				.then((a) => ({ file_path, a })),
			$.tool
				.check({ tool: "Write", input: { file_path, content: "" } })
				.then((a) => ({ file_path, a }))
		])
	);
	let worst: { decision: Verdict; reason?: string } = { decision: "allow" };
	for (const { file_path, a } of answers) {
		if (RANK[a.decision] > RANK[worst.decision]) {
			worst = {
				decision: a.decision,
				reason: a.reason ?? `Edit and Write rules cover ${file_path}`
			};
		}
	}
	return worst;
}

/** The paths a patch's operations touch, absolute, or none when the patch does not parse. */
async function touched(
	$: EngineInterface,
	patch: string
): Promise<{ cwd: string; paths: string[] } | undefined> {
	const parsed = parsePatch(patch);
	if ("error" in parsed) {
		return undefined;
	}
	const cwd = await $.session.cwd();
	return { cwd, paths: pathsOf(parsed.ops).map((p) => absolute(cwd, p)) };
}

/**
 * Applies a patch: every file's new content is computed first, so a refusal
 * anywhere writes nothing.
 *
 * @param $ The engine.
 * @param patch The patch text.
 * @returns The reply (one line per file, then each newly shown instruction text), or the refusal.
 */
export async function runPatch(
	$: EngineInterface,
	patch: string
): Promise<{ deny: string } | { text: string }> {
	const parsed = parsePatch(patch);
	if ("error" in parsed) {
		return { deny: `patch refused, nothing written: ${parsed.error}` };
	}
	const cwd = await $.session.cwd();
	const placed = await placePaths($, cwd, pathsOf(parsed.ops));
	const plan = await applyOps(parsed.ops, {
		resolve: (path) => placed.get(path) ?? { error: "path not placed" },
		read: async (abs) => ((await $.fs.exists(abs)) ? $.fs.read(abs) : undefined)
	});
	if ("error" in plan) {
		return { deny: `patch refused, nothing written: ${plan.error}` };
	}
	// Writes go first so a failed delete never leaves a move without its new file.
	const writes = [...plan.changes].filter(([, text]) => text !== null);
	const deletes = [...plan.changes].filter(([, text]) => text === null);
	await Promise.all(writes.map(([abs, text]) => $.fs.write(abs, text ?? "")));
	const removed = await Promise.all(
		deletes.map(async ([abs]) => ({
			abs,
			rm: await $.process.run(["rm", "-f", "--", abs])
		}))
	);
	const failed = removed.find((r) => r.rm.exitCode !== 0);
	if (failed !== undefined) {
		return {
			deny: `patch partly applied: could not delete ${failed.abs}: ${failed.rm.stderr.trim()}`
		};
	}
	const context = await instructionsFor(
		$,
		cwd,
		[...plan.changes].filter(([, text]) => text !== null).map(([abs]) => abs)
	);
	return {
		text: [plan.summary.join("\n"), ...context].join("\n\n")
	};
}

/**
 * Declares `patch` and forgets the instruction files already shown. Core allows
 * one unmatched `session.start` registration per plugin, so settings/start.ts
 * calls this from its hook.
 */
export async function startPatch($: EngineInterface): Promise<void> {
	resetShown();
	try {
		await $.tool.register(PATCH_TOOL);
	} catch (error) {
		fault($, "patch registration", error);
	}
}

/** Serves its calls, and gives it the Edit and Write verdicts. */
export function registerPatch(on: On): void {
	on("tool.run", { tool: TOOL_FULL_NAME }, async ($, e) => {
		const out = await runPatch($, e.patch);
		return "deny" in out ? out : { result: out.text };
	}).catch(($) => {
		$.ui.log("claudetto patch failed", { to: "debug" });
		return { deny: "patch failed, nothing more written; see the debug log" };
	});
	on("tool.check", { tool: TOOL_FULL_NAME }, async ($, e, next) => {
		const verdict = await next(e);
		const patch = fieldOf(e.input, "patch");
		const files =
			typeof patch === "string" ? await touched($, patch) : undefined;
		if (verdict.decision === "deny" || files === undefined) {
			return verdict;
		}
		const edit = await editVerdict($, files.paths);
		if (edit.decision !== "allow") {
			return edit;
		}
		// A rule written for `patch` itself keeps its ask; the engine's default ask for an MCP tool gives way to the Edit verdict.
		return verdict.rule === undefined ? { decision: "allow" } : verdict;
	}).catch(($, _e, next) => {
		fault($, "patch check", next.error);
		return { decision: "ask", reason: "patch could not check its paths" };
	});
}
