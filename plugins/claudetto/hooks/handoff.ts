import type {
	EngineInterface,
	On,
	PluginOptions,
	SessionMessage,
} from "claude-code";
import { type CallState, handOff, type Session } from "./handoff/call.ts";
import {
	afterTurn,
	type Session as HandoverSession,
	type HandoverState,
	handOverTo,
	newHandoverState,
} from "./handoff/handover.ts";
import { atRoot, HANDOFF_DIR, handoffPath } from "./handoff/layout.ts";
import {
	DAY_MS,
	isStale,
	newestHandoff,
	readBackKey,
} from "./handoff/read-back.ts";
import { HANDOFF_INPUT_SCHEMA } from "./handoff/tool.ts";
import {
	handoffText,
	humanPrompts,
	ownHandoffs,
	readMessages,
} from "./handoff/transcript.ts";
import { redact } from "./secrets.ts";
import {
	contextManagementText,
	HANDOFF_TOOL,
	readBackText,
	STALE_HANDOFF,
	TOOL_HANDOFF,
} from "./texts.ts";

const redactOf =
	($: EngineInterface) =>
	(text: string): Promise<string> =>
		redact((argv, init) => $.process.run(argv, init), text);

/** A dropped write is the one failure the user can act on, so it takes the visible sink. */
const notWritten = ($: EngineInterface, why: string, cause: string): void => {
	$.ui.log(`No handoff was written (${why}): ${cause}`);
};

const copyMisnamed = async (
	$: EngineInterface,
	misnamed: string,
	path: string,
): Promise<void> => {
	try {
		const text = await $.fs.read(misnamed);
		await $.fs.write(atRoot(await $.session.root(), path), text);
		$.ui.log(
			`The handoff Claude wrote, \`${misnamed}\`, has a name the next session does not read, so it was copied to \`${path}\`.`,
		);
	} catch (error) {
		$.ui.log(
			`The handoff Claude wrote, \`${misnamed}\`, has a name the next session does not read, and the copy failed (${error}).`,
		);
	}
};

const promptsOf = async (
	$: EngineInterface,
	transcript: string | undefined,
): Promise<string[]> => {
	try {
		return transcript === undefined
			? []
			: humanPrompts(await $.fs.read(transcript));
	} catch {
		return [];
	}
};

/** Never throws: each failure is one `notWritten` line, because a hook that throws is skipped. */
const writeHandoff = async (
	$: EngineInterface,
	messages: readonly SessionMessage[],
	transcript: string | undefined,
	why: string,
): Promise<void> => {
	try {
		const tail = readMessages(messages);
		const own = ownHandoffs(tail);
		if (own.valid) {
			return;
		}
		const at = new Date();
		const path = handoffPath(at);
		if (own.misnamed !== undefined) {
			await copyMisnamed($, own.misnamed, path);
			return;
		}
		const text = await redactOf($)(
			handoffText(tail, await promptsOf($, transcript), at.toISOString()),
		);
		if (text !== "") {
			await $.fs.write(atRoot(await $.session.root(), path), text);
		}
	} catch (error) {
		notWritten($, why, String(error));
	}
};

const mtimeOf = async ($: EngineInterface, path: string): Promise<number> => {
	const slash = path.lastIndexOf("/");
	const entries = await $.fs.list(path.slice(0, slash));
	return (
		entries.find((entry) => entry.name === path.slice(slash + 1))?.mtimeMs ?? 0
	);
};

/** The name goes to the store before the submit, so a second start of the same session finds it taken. A handoff older than the resumed transcript was written before that session's last turn, so the session holds its work already. */
const readBack = async ($: EngineInterface, resumed: string): Promise<void> => {
	try {
		const root = await $.session.root();
		const dir = atRoot(root, HANDOFF_DIR);
		if (!(await $.fs.exists(dir))) {
			return;
		}
		const entries = await $.fs.list(dir);
		const name = newestHandoff(entries.map((entry) => entry.name));
		const key = readBackKey(root);
		if (name === undefined || name === (await $.store.get(key))) {
			return;
		}
		const written = entries.find((entry) => entry.name === name)?.mtimeMs ?? 0;
		if (written < (await mtimeOf($, resumed))) {
			return;
		}
		const ageMs = (await $.clock.now()) - written;
		await $.store.set(key, name);
		if (isStale(ageMs)) {
			$.ui.log(STALE_HANDOFF(name, Math.floor(ageMs / DAY_MS)));
			return;
		}
		const text = readBackText(
			name,
			await redactOf($)(await $.fs.read(`${dir}/${name}`)),
		);
		$.clock.after(0, () => {
			$.prompt.submit({ text }).catch((error: unknown) => {
				$.ui.log(`Failed to inject handoff ${name} (${error})`);
			});
		});
	} catch (error) {
		$.ui.log(`Failed to read a handoff back (${error})`);
	}
};

const callSession = ($: EngineInterface): Session => ({
	redact: redactOf($),
	write: async (path, text) =>
		$.fs.write(atRoot(await $.session.root(), path), text),
	clear: () => $.command.run({ command: "clear" }),
	setGoal: (condition) => $.command.run({ command: "goal", args: condition }),
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

const handoverSession = ($: EngineInterface): HandoverSession => ({
	redact: redactOf($),
	write: async (path, text) =>
		$.fs.write(atRoot(await $.session.root(), path), text),
	compact: () => $.command.run({ command: "compact" }),
	submit: (text) => $.prompt.submit({ text }),
	log: (line) => $.ui.log(line),
	context: async () => (await $.session.usage()).context,
	fork: (prompt) => $.model.fork({ prompt }),
});

const ANY_ID = /./;

/** The handoff block rides the first user message's context: a hook cannot write Claude's handoff itself. */
const handoffBlock = {
	name: "context_management",
	text: contextManagementText(),
};

const HANDOFF_CALLED = /^mcp__claudetto__handoff$/;

export const handoff = (on: On, options: PluginOptions): void => {
	const call: CallState = {
		handingOff: false,
		turn: undefined,
		goal: undefined,
	};
	const handover: HandoverState = newHandoverState();
	let transcript: string | undefined;
	on(
		"session.compact",
		{ trigger: ["manual", "auto", "plugin"] },
		async ($, e, next) => {
			const installed = handOverTo(handover, e);
			if (installed !== undefined) {
				return installed;
			}
			if (e.agentId === undefined) {
				await writeHandoff(
					$,
					e.messages,
					transcript,
					`compaction ${e.trigger}`,
				);
			}
			return next(e);
		},
	);
	on("session.start", { isInteractive: [true, false] }, async ($, e, next) => {
		const spec = {
			name: HANDOFF_TOOL,
			description: TOOL_HANDOFF,
			inputSchema: HANDOFF_INPUT_SCHEMA,
		};
		// `$.tool.register` rejects until the session binds, so an early refusal is retried after the start.
		let early = true;
		try {
			await $.tool.register(spec);
		} catch {
			early = false;
		}
		const started = await next(e);
		if (!early) {
			try {
				await $.tool.register(spec);
			} catch {
				// The tool stays unregistered; the code-built handoff still works.
			}
		}
		return started;
	});
	on("turn.start", { turnId: [ANY_ID] }, (_$, e, next) => {
		if (e.agentId === undefined) {
			call.turn = e.turnId;
		}
		return next(e);
	});
	// No type or event shows the active goal: its `goal_status` row is a sentinel the engine renders as nothing, so the command is what is seen.
	on("command.run", { command: ["goal"] }, (_$, e, next) => {
		const condition = e.args.trim();
		if (condition !== "") {
			call.goal = condition === "clear" ? undefined : condition;
		}
		return next(e);
	});
	on("tool.call", { tool: [HANDOFF_CALLED] }, async ($, e) => ({
		result: await handOff(callSession($), call, e),
	}));
	on("classic.SessionStart", async ($, e, next) => {
		transcript = e.transcript_path;
		if (e.source === "resume") {
			await readBack($, e.transcript_path);
		}
		return next(e);
	});
	on("prompt.context", async (_$, e, next) => {
		const answer = await next(e);
		return { ...answer, blocks: [...answer.blocks, handoffBlock] };
	});
	on("prompt.section", { name: ["context_management"] }, () => ({
		text: null,
	}));
	// Runs from a timer: `$.command.run` is queued until the session is idle, and it is not while this hook runs.
	on("turn.complete", { isAborted: [false] }, async ($, e, next) => {
		const answer = await next(e);
		if (e.agentId === undefined && e.reason === "answer") {
			const session = handoverSession($);
			$.clock.after(0, () => {
				afterTurn(session, handover, e.answer, options).catch(
					(error: unknown) => $.ui.log(`The handover failed (${error})`),
				);
			});
		}
		return answer;
	});
};
