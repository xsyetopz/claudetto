import type { EngineInterface, On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import {
	CLEAR,
	CONTEXT_BLOCK,
	contextManagementText,
	HANDOFF_DIR,
	handoffPath,
	handoffText,
	parseTail,
	tailArgv,
	wroteOwn,
} from "./handoff.ts";
import {
	isStale,
	mtimeOf,
	newestHandoff,
	readBackText,
	staleLine,
} from "./read-back.ts";

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
		if (wroteOwn(tail)) {
			// Skip the code-built file when Claude wrote its own; it would be the poorer of the two.
			return;
		}
		const at = new Date();
		const text = handoffText(tail, at.toISOString());
		if (text === "") {
			return;
		}
		// Own catch: the failure line must name the file, and the path exists only here.
		const path = handoffPath(at);
		try {
			await $.fs.write(path, text);
		} catch (error) {
			notWritten($, why, `\`${path}\` could not be written: ${error}`);
		}
	} catch (error) {
		notWritten($, why, String(error));
	}
};

const CONTINUED = ["clear", "resume"];

/** Keyed by project root: the store is one file for the whole login and stamps can collide. */
const readBackKey = (root: string): string => `handoff.readback:${root}`;

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
		if (!(await $.fs.exists(HANDOFF_DIR))) {
			return;
		}
		const entries = await $.fs.list(HANDOFF_DIR);
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
		const text = readBackText(name, await $.fs.read(`${HANDOFF_DIR}/${name}`));
		$.clock.after(0, () => {
			submitReadBack($, name, text).catch(() => undefined);
		});
	} catch (error) {
		$.ui.log(`Failed to read a handoff back (${error})`);
	}
};

/** `SessionEnd` really gets about 1.5 s, not the 10 s that `next.budget.remainingMs` reports. */
const SESSION_END_CUT_MS = 1500;

const handoffBlock = { name: CONTEXT_BLOCK, text: contextManagementText() };

export const handoff: Block = {
	id: "handoff",
	kind: "session",
	routes: [
		"classic.SessionEnd",
		"classic.PreCompact",
		"classic.SessionStart",
		"prompt.context",
	],
	needs: "2.1.314",
};

export const attachHandoff = (on: On, _context: BlockContext): void => {
	// `/clear` continues in one process under a new session id, so the handoff is all that crosses.
	on("classic.SessionEnd", async ($, e, next) => {
		if (e.reason === CLEAR) {
			await writeHandoff($, {
				transcriptPath: e.transcript_path,
				remainingMs: Math.min(next.budget.remainingMs, SESSION_END_CUT_MS),
				why: `SessionEnd ${e.reason}`,
			});
		}
		return next(e);
	});
	// The `PreCompact` cut is unmeasured; the writer's 10,000 ms cap bounds the read either way.
	on("classic.PreCompact", async ($, e, next) => {
		await writeHandoff($, {
			transcriptPath: e.transcript_path,
			remainingMs: next.budget.remainingMs,
			why: `PreCompact ${e.trigger}`,
		});
		return next(e);
	});
	on("classic.SessionStart", async ($, e, next) => {
		await readBack($, e.source);
		return next(e);
	});
	// Hooks cannot write Claude's handoff, so the first user message's context tells the session to.
	on("prompt.context", async (_$, e, next) => {
		const answer = await next(e);
		return { ...answer, blocks: [...answer.blocks, handoffBlock] };
	});
};
