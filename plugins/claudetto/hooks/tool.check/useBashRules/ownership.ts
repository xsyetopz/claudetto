import type { EngineInterface } from "claude-code";

import { GATE_SYSTEM_WRITE } from "../../texts-gate.ts";
import { isPersonMessage } from "../../verify.ts";
import { askedToDelete } from "./asked.ts";
import { POLICY_FILES } from "./packages.ts";
import { forceDeleted, ownsOf } from "./processes.ts";
import { judge, systemPath } from "./rules.ts";
import { parse } from "./shell-words.ts";
import { deny, type Verdict } from "./verdict.ts";

// Only a command that could need the transcript reads it.
const OWNED = /\b(?:kill|worktree|branch|update-ref)\b/u;

const kept = async (
	names: readonly string[],
	has: (name: string) => Promise<boolean>,
) => {
	const found = await Promise.all(
		names.map(async (n) => ((await has(n)) ? n : undefined)),
	);
	return new Set(found.filter((n) => n !== undefined));
};

/** What this session owns, read from its transcript when `command` needs it, with the foreign branches the person asked to delete. */
async function ownershipOf(
	$: EngineInterface,
	command: string,
	worktrees: ReadonlySet<string>,
) {
	const messages = OWNED.test(command) ? await $.session.messages() : [];
	const own = ownsOf(
		messages.flatMap((m) => m.toolUses),
		worktrees,
	);
	const said = messages
		.filter((item) => isPersonMessage(item))
		.map((m) => m.text);
	const foreign = parse(command)
		.commands.flatMap((c) => forceDeleted(c) ?? [])
		.filter((b) => !own.branch(b));
	const asked = await kept([...new Set(foreign)], (branch) =>
		askedToDelete($, said, branch),
	);
	return { ...own, asked: (name: string) => asked.has(name) };
}

async function presentFiles($: EngineInterface): Promise<Set<string>> {
	const cwd = await $.session.cwd();
	const found = await Promise.all(
		POLICY_FILES.map(async (f) =>
			(await $.fs.exists(`${cwd}/${f}`)) ? f : undefined,
		),
	);
	return new Set(found.filter((f) => f !== undefined));
}

/** The verdict `judge` gives a command, with the command named in its reason. */
export async function commandVerdict(
	$: EngineInterface,
	command: string,
	worktrees: ReadonlySet<string>,
): Promise<Verdict | undefined> {
	const present = await presentFiles($);
	const own = judge(
		command,
		(f) => present.has(f),
		await ownershipOf($, command, worktrees),
	);
	return own === undefined
		? undefined
		: { ...own, reason: `${own.reason} (\`${command}\`)` };
}

/** The verdict on a file write to `path`. */
export const writeVerdict = (path: string): Verdict | undefined =>
	systemPath(path) ? deny(GATE_SYSTEM_WRITE) : undefined;
