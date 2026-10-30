// The one module that `hooks/hooks.json` names (`architecture.md`, Components).
// Each capability registers its own rules here as it lands, so the hook map is one file to read.

import type { EngineInterface, On, PluginOptions } from "claude-code";
import { onCompact } from "./compaction/hook.ts";
import { onDenied } from "./gate/denied.ts";
import { onCheck, onCheckFail, onPermission } from "./gate/hooks.ts";
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
import { DECIDE_MATCH, onDecide, onSessionStart } from "./jev/hooks.ts";
import { keepOptions } from "./jev/options.ts";
import {
	isStale,
	mtimeOf,
	newestHandoff,
	readBackText,
	staleLine,
} from "./read-back.ts";
import {
	onFailed,
	onSpawn,
	onStop,
	onSubmitBudget,
} from "./run-limits/hooks.ts";
import { onSetupCommand, SETUP_COMMAND } from "./tiers/hooks.ts";
import { describedTools, shorterText } from "./tools/tools.ts";
import { onMeasure, onTurnComplete, onTurnStart } from "./window/hooks.ts";

/** Wall clock to leave for the write itself, so a slow `tail` cannot eat the whole budget. */
const WRITE_RESERVE_MS = 400;

/**
 * The cut a classic `SessionEnd` hook is really given, measured in a REPL: `next.budget.remainingMs`
 * reported 10,000 there, while a `$.process.run` of the same hook was aborted after 1,521 ms and
 * `next.signal` turned aborted between 1,255 ms and 1,506 ms (`references.md`, "The Interactive
 * `/clear`, Measured in the REPL"). It is `H2s()` at its default, which
 * `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` can raise; taking the lower figure only ever gives up
 * time the writer has no use for, since a whole read and redaction measured 17 ms at the worst case
 * (`docs/evidence/redaction.md`).
 */
const SESSION_END_CUT_MS = 1500;

/** What the writer needs of the event it answers, so one writer serves both events. */
interface Occasion {
	readonly transcriptPath: string;
	readonly remainingMs: number;
	readonly why: string;
}

/** The context block that tells the session to write its own handoff, and where. */
const handoffBlock = { name: CONTEXT_BLOCK, text: contextManagementText() };

/**
 * One line to the user for a handoff that was not written, naming the occasion and the cause. It
 * takes the default sink, `transcript`, which shows a dim row and reaches the debug log as well,
 * because a handoff that quietly never appeared is the failure the spec forbids. A dropped write is
 * the one failure here the user can act on: the conversation is gone and the file is not there.
 */
const notWritten = ($: EngineInterface, why: string, cause: string): void => {
	$.ui.log(`No handoff was written (${why}): ${cause}`);
};

/**
 * Writes one handoff, or nothing when there is nothing to write. It never throws: the session is
 * ending either way, so a failure is logged and the end goes on.
 *
 * It lives in this file rather than beside the pure code of `handoff.ts`, because the engine's loader
 * follows `$` across a file boundary only into a function declaration, which the lint rules forbid.
 */
const writeHandoff = async (
	$: EngineInterface,
	occasion: Occasion,
): Promise<void> => {
	const { transcriptPath, remainingMs, why } = occasion;
	if (transcriptPath === "") {
		return;
	}
	// The event's own cut bounds the hook, so `tail` gets what is left of it rather than a constant,
	// and the write keeps its own reserve. Each caller hands the cut it is really given, which is not
	// the figure `next.budget.remainingMs` reports on `SessionEnd`.
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
			// A file Claude wrote holds the decisions and the reasons, which code cannot read off a
			// transcript, so a code-built file beside it would only be the poorer of the two.
			return;
		}
		const at = new Date();
		const text = handoffText(tail, at.toISOString());
		if (text === "") {
			return;
		}
		// The write has its own catch, because the spec asks the line for a failed write to name the
		// file, and the path exists only here.
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

/** The start sources that carry work on in place of beginning it, which are the two the spec names. */
const CONTINUED = ["clear", "resume"];

/**
 * Where the name of the last injected handoff is kept, per project. The store is one JSON file of
 * this plugin for the whole login, so the project's root is part of the key: the spec reads the file
 * back in the next session of the same project, and two projects write stamps that can collide.
 */
const readBackKey = (root: string): string => `handoff.readback:${root}`;

/**
 * Submits the handoff, from outside the hook that found it: Claude Code refuses `$.prompt.submit`
 * inside `classic.SessionStart` (`design.md`, Read-Back). A refused submit leaves the file on disk
 * and shows one line, because a lost handoff the user never hears about is the failure the spec
 * names.
 */
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

/**
 * Reads the newest handoff back into a session that follows a `clear` or a `resume`, once. The name
 * of the file goes to the store before the submit, so a second start of the same session finds it
 * taken, and a newer file still goes in.
 */
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
		// The name goes to the store either way, so the file is taken, or named, once and no more.
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

/** Registers the hooks of the plugin on `on`, after keeping `options` for the hooks that read them from there. */
export const register = (on: On, options: PluginOptions): void => {
	// The decision tool of the model, which exists only with the option `jev` and a key. The options
	// are kept first, because both hooks are registered by reference and read them from there.
	// `session.start` declares `mcp__claudetto__decide` and `tool.call` serves it. The filter keeps
	// every other call, `AskUserQuestion` among them, out of the hook, so that dialog reaches the user.
	keepOptions(options);
	// Setup, with no checkout and no `bun`: the command asks which groups of keys to keep and writes
	// them to the user settings file. It answers `{ text }` and leaves `context` out, so the person
	// reads the report and the model reads nothing of it, which costs the session no tokens.
	on("command.run", { command: SETUP_COMMAND }, onSetupCommand);
	on("session.start", onSessionStart);
	on("tool.call", DECIDE_MATCH, onDecide);
	// A shorter description for a few tools, and only while it is shorter. The chain runs
	// first, so the comparison is against the text the session would otherwise send, which another
	// hook may already have changed.
	on("tool.describe", { tool: [...describedTools()] }, async (_$, e, next) => {
		const answer = await next(e);
		const ours = shorterText(e.tool, answer.description);
		return ours === undefined ? answer : { ...answer, description: ours };
	});
	// `main` is the thread's own body under the `agent` setting, never a delegation target,
	// so the harness's agent listing names it to no end. Refusing the offer takes the listing line out
	// of the first message and leaves the body in place, which `just capture --arm plugin --shipped`
	// read as 28,915 against 28,993 with blocks still 74, 62, 5,443 and no `claudetto:main` in the body.
	on("agent.offer", { agent: "claudetto:main" }, async () => ({
		isOffered: false,
	}));
	// A conversation that ends with `/clear` goes on in the same process under a new session id, so
	// the handoff is the only thing that crosses. The other reasons end the work itself and need none.
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
	// The compaction has not run yet here, so the transcript still holds the turns the summary will
	// replace. This cut is the reported one: `PreCompact` was not measured, because reaching it costs
	// a compaction, and the 10,000 ms cap inside the writer bounds the read either way.
	on("classic.PreCompact", async ($, e, next) => {
		await writeHandoff($, {
			transcriptPath: e.transcript_path,
			remainingMs: next.budget.remainingMs,
			why: `PreCompact ${e.trigger}`,
		});
		return next(e);
	});
	// The gate itself, and the one registration that carries a `.catch`: without one a failed hook is
	// absent, so the call would go on unjudged. This one handler answers the rules, the protected paths,
	// and the refusal of a call auto mode already denied twice, because
	// `tool.check` takes one handler and a second deny path would be fail-open (`design.md`,
	// "Protected paths").
	on("tool.check", onCheck).catch(onCheckFail);
	// The counting half of that refusal. It fires only when auto mode denies a call, and its only output is
	// `retry`, so the reason reaches the model from `onCheck` above.
	on("classic.PermissionDenied", onDenied);
	// The dialog path of the gate, which `onPermission` answers: it does not fire in `claude -p` at all,
	// and in auto mode only on the fallback to a dialog (`design.md`, "Permission Policy"). Each handler
	// above and here is registered by reference, because the loader follows `$` into another file only
	// through a `function` declaration, which the lint rules forbid.
	on("classic.PermissionRequest", onPermission);
	// The conversation that the handoff belongs to has ended, and this is the session that takes it on.
	on("classic.SessionStart", async ($, e, next) => {
		await readBack($, e.source);
		return next(e);
	});
	// The run limits (`design.md`, "Run Limits"). The refusals of an identical retry and of a call at
	// heavy context are answered by `onCheck` above, so these three only count and report: the start
	// of a subagent is held here, a failed call is counted, and the tasks still in flight are named at
	// Stop.
	on("agent.spawn", onSpawn);
	on("classic.PostToolUseFailure", onFailed);
	on("classic.Stop", onStop);
	// The budget line rides the prompt, which costs a request already. `classic.Stop` would cost one
	// of its own, and `prompt.context` fires once per conversation, so the figure would be stale.
	on("prompt.submit", onSubmitBudget);
	// The window recorder: the loops that run say who spent a measured response, which
	// `session.measure` does not carry (`design.md`, "Window Budget").
	on("turn.start", onTurnStart);
	on("turn.complete", onTurnComplete);
	on("session.compact", onCompact);
	on("session.measure", onMeasure);
	// No hook can write the handoff for Claude, because both writers make no model call and code reads
	// no decision out of a transcript. So the session is told the folder and the nine headings here,
	// where the text rides the context of the first user message and costs no request of its own.
	on("prompt.context", async (_$, e, next) => {
		const answer = await next(e);
		return { ...answer, blocks: [...answer.blocks, handoffBlock] };
	});
};
