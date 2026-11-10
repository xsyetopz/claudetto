import type { EngineInterface } from "claude-code";

import { isPersonMessage } from "../verify.ts";
import { POLICY_FILES } from "./packages.ts";
import { MARKER, ownsOf, tmpTops } from "./processes.ts";
import { judge } from "./rules.ts";
import type { Verdict } from "./verdict.ts";

// Only a command that could need the transcript or a marker file reads them.
const OWNED = /\b(?:kill|worktree|branch|update-ref)\b/u;
const TMP_TOUCH = /\b(?:rm|mkdir|mktemp)\b/u;

/** Tells whether the /tmp folder holds this session's marker. */
export async function isMarked(
	$: EngineInterface,
	top: string,
): Promise<boolean> {
	if (!(await $.fs.exists(`${top}/${MARKER}`))) {
		return false;
	}
	const held = await $.fs.read(`${top}/${MARKER}`);
	return held.trim() === (await $.session.id());
}

/** What this session owns, read from its transcript and the marker files, for the parts of `command` that need them. */
async function ownershipOf($: EngineInterface, command: string) {
	const tops = TMP_TOUCH.test(command) ? tmpTops(command) : [];
	const kept = async (has: (top: string) => Promise<boolean>) => {
		const found = await Promise.all(
			tops.map(async (t) => ((await has(t)) ? t : undefined)),
		);
		return new Set(found.filter((t) => t !== undefined));
	};
	const messages = OWNED.test(command) ? await $.session.messages() : [];
	return ownsOf(
		messages.flatMap((m) => m.toolUses),
		await kept((top) => isMarked($, top)),
		await kept((top) => $.fs.exists(top)),
		messages.filter((item) => isPersonMessage(item)).map((m) => m.text),
	);
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
): Promise<Verdict | undefined> {
	const present = await presentFiles($);
	const own = judge(
		command,
		(f) => present.has(f),
		await ownershipOf($, command),
	);
	return own === undefined
		? undefined
		: { ...own, reason: `${own.reason} (\`${command}\`)` };
}
