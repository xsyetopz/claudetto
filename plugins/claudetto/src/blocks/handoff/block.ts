import type { EngineInterface, On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { declareAfterStart, type ToolSpec } from "../declare-after-start.ts";
import { handOff, holdTurn, type Session } from "./call.ts";
import {
	CONTEXT_BLOCK,
	contextManagementText,
	HANDOFF_DIR,
	HANDOFF_TOOL,
	handoffPath,
	handoffText,
	ownHandoffs,
	parseTail,
	tailArgv,
} from "./handoff.ts";
import {
	isStale,
	mtimeOf,
	newestHandoff,
	readBackKey,
	readBackText,
	staleLine,
} from "./read-back.ts";
import { atRoot } from "./root.ts";
import { HANDOFF_INPUT_SCHEMA, HANDOFF_MATCH, TOOL_HANDOFF } from "./tool.ts";

/** Wall clock to leave for the write itself, so a slow `tail` cannot eat the whole budget. */
const WRITE_RESERVE_MS = 400;

interface Occasion {
	readonly transcriptPath: string;
	readonly remainingMs: number;
	readonly why: string;
}

/** A dropped write is the one failure the user can act on, so it takes the visible sink. */
const notWritten = ($: EngineInterface, why: string, cause: string): void => {
	$.ui.log(`No handoff was written (${why}): ${cause}`);
};

const copyMisnamed = async (
	$: EngineInterface,
	misnamed: string,
	path: string,
): Promise<string | undefined> => {
	let text: string;
	try {
		text = await $.fs.read(misnamed);
	} catch (error) {
		return `The handoff Claude wrote, \`${misnamed}\`, could not be read (${error})`;
	}
	try {
		await $.fs.write(atRoot(await $.session.root(), path), text);
		$.ui.log(
			`The handoff Claude wrote, \`${misnamed}\`, has a name the next session does not read, so it was copied to \`${path}\`.`,
		);
	} catch (error) {
		$.ui.log(
			`The handoff Claude wrote, \`${misnamed}\`, has a name the next session does not read, and the copy to \`${path}\` failed (${error}).`,
		);
	}
	return undefined;
};

/** Never throws: each failure is one `notWritten` line, because a hook that throws is dropped silently. */
const writeHandoff = async (
	$: EngineInterface,
	occasion: Occasion,
): Promise<void> => {
	const { transcriptPath, remainingMs, why } = occasion;
	if (transcriptPath === "") {
		return;
	}
	// `SessionEnd` really gets less than `next.budget.remainingMs` reports, so each caller passes its own cut.
	const forTail = Math.min(remainingMs - WRITE_RESERVE_MS, 10_000);
	if (forTail <= 0) {
		notWritten($, why, "no time was left of the bound the event gives");
		return;
	}
	try {
		const read = await $.process.run(tailArgv(transcriptPath), {
			timeoutMs: forTail,
		});
		if (read.exitCode !== 0) {
			notWritten(
				$,
				why,
				`the transcript could not be read, and tail exited ${read.exitCode}`,
			);
			return;
		}
		const tail = parseTail(read.stdout);
		const own = ownHandoffs(tail);
		if (own.valid) {
			// Skip the code-built file when Claude wrote its own; it would be the poorer of the two.
			return;
		}
		const at = new Date();
		const path = handoffPath(at);
		let unread = "";
		if (own.misnamed !== undefined) {
			const copied = await copyMisnamed($, own.misnamed, path);
			if (copied === undefined) {
				return;
			}
			unread = copied;
		}
		const text = handoffText(tail, at.toISOString());
		if (text === "") {
			if (unread !== "") {
				$.ui.log(unread);
			}
			return;
		}
		// Own catch: the failure line must name the file, and the path exists only here.
		try {
			await $.fs.write(atRoot(await $.session.root(), path), text);
			if (unread !== "") {
				$.ui.log(`${unread}, so the code-built handoff is \`${path}\``);
			}
		} catch (error) {
			notWritten($, why, `\`${path}\` could not be written: ${error}`);
		}
	} catch (error) {
		notWritten($, why, String(error));
	}
};

/** A `clear` gets none, so a typed `/clear` keeps its meaning. */
const CONTINUED = ["resume"];

/** Submits outside the hook: `$.prompt.submit` is refused inside `classic.SessionStart`. */
const submitReadBack = async (
	$: EngineInterface,
	name: string,
	text: string,
): Promise<void> => {
	try {
		await $.prompt.submit({ text });
	} catch (error) {
		$.ui.log(`Failed to inject handoff ${name} (${error})`);
	}
};

/** The name goes to the store before the submit, so a second start of the same session finds it taken. */
const readBack = async ($: EngineInterface, source: string): Promise<void> => {
	if (!CONTINUED.includes(source)) {
		return;
	}
	try {
		const dir = atRoot(await $.session.root(), HANDOFF_DIR);
		if (!(await $.fs.exists(dir))) {
			return;
		}
		const entries = await $.fs.list(dir);
		const name = newestHandoff(entries.map((entry) => entry.name));
		const key = readBackKey(await $.session.root());
		if (name === undefined || name === (await $.store.get(key))) {
			return;
		}
		const ageMs = (await $.clock.now()) - mtimeOf(entries, name);
		await $.store.set(key, name);
		if (isStale(ageMs)) {
			$.ui.log(staleLine(name, ageMs));
			return;
		}
		const text = readBackText(name, await $.fs.read(`${dir}/${name}`));
		$.clock.after(0, () => {
			submitReadBack($, name, text).catch(() => undefined);
		});
	} catch (error) {
		$.ui.log(`Failed to read a handoff back (${error})`);
	}
};

const HANDOFF_SPEC: ToolSpec = {
	name: HANDOFF_TOOL,
	description: TOOL_HANDOFF,
	inputSchema: HANDOFF_INPUT_SCHEMA,
};

const ANY_ID = /./;

const sessionOf = ($: EngineInterface): Session => ({
	write: async (path, text) =>
		$.fs.write(atRoot(await $.session.root(), path), text),
	clear: () => $.command.run({ command: "clear" }),
	submit: (text) => $.prompt.submit({ text }),
	taken: async (name) => $.store.set(readBackKey(await $.session.root()), name),
	abort: (turnId) => $.turn.abort({ turnId }),
	log: (line) => $.ui.log(line),
	later: (work) => {
		$.clock.after(0, () => {
			work().catch(() => undefined);
		});
	},
});

const handoffBlock = { name: CONTEXT_BLOCK, text: contextManagementText() };

export const handoff: Block = {
	id: "handoff",
	kind: "session",
	routes: [
		"classic.PreCompact",
		"classic.SessionStart",
		"session.start",
		"tool.call",
		"turn.start",
		"prompt.context",
		"prompt.section",
	],
	needs: "2.1.314",
};

export const attachHandoff = (on: On, _context: BlockContext): void => {
	// The `PreCompact` cut is unmeasured; the writer's 10,000 ms cap bounds the read either way.
	on("classic.PreCompact", async ($, e, next) => {
		await writeHandoff($, {
			transcriptPath: e.transcript_path,
			remainingMs: next.budget.remainingMs,
			why: `PreCompact ${e.trigger}`,
		});
		return next(e);
	});
	on("session.start", { isInteractive: [true, false] }, ($, e, next) =>
		declareAfterStart(
			(tool) => $.tool.register(tool),
			HANDOFF_SPEC,
			() => next(e),
		),
	);
	// The window block holds the one unmatched `turn.start` hook, so this one matches every turn id.
	on("turn.start", { turnId: [ANY_ID] }, (_$, e, next) => {
		if (e.agentId === undefined) {
			holdTurn(e.turnId);
		}
		return next(e);
	});
	on("tool.call", HANDOFF_MATCH, async ($, e) => ({
		result: await handOff(sessionOf($), e),
	}));
	on("classic.SessionStart", async ($, e, next) => {
		await readBack($, e.source);
		return next(e);
	});
	// Hooks cannot write Claude's handoff, so the first user message's context tells the session to.
	on("prompt.context", async (_$, e, next) => {
		const answer = await next(e);
		return { ...answer, blocks: [...answer.blocks, handoffBlock] };
	});
	// Core's section says no handoff is needed, which contradicts the block above.
	on("prompt.section", { name: ["context_management"] }, () => ({
		text: null,
	}));
};
