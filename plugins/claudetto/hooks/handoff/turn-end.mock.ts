import type {
	ModelForkResult,
	On,
	SessionCompactResult,
	SessionMessage,
} from "claude-code";
import { type Engine, mock } from "claude-code/testing";

import { scanner } from "../secrets.mock.ts";

export const HANDOFF = `# Handoff

Written by Claude at 2026-11-02T10:00:00Z.

## Next Steps

Ship the export.
`;

export const FIRST: SessionMessage = {
	role: "user",
	text: "<env>the first turn's block</env>",
	toolUses: [],
	handle: "h0",
};

export const LATER: SessionMessage = {
	role: "assistant",
	text: "Read the export code.",
	toolUses: [],
	handle: "h1",
};

const ENDED = {
	durationMs: 1,
	isAborted: false,
	reason: "answer",
	turnId: "t1",
} as const;

export const DONE = { answer: "Done. The export ships." };

export const GITHUB_TOKEN = `ghp_${"b".repeat(36)}`;

export interface Seen {
	runs: number;
	compacted: SessionCompactResult[];
	written: { path: string; text: string }[];
	sent: string[];
	lines: string[];
	forks: string[];
}

/** The live context at the turn's end, and what a fork of it answers. */
interface Context {
	readonly tokens?: number;
	readonly window?: number;
	readonly fork?: ModelForkResult;
}

export const forked = (text: string): ModelForkResult => ({
	isAnswered: true,
	text,
	usage: {
		input_tokens: 2,
		output_tokens: 300,
		cache_read_input_tokens: 450_000,
		cache_creation_input_tokens: 400,
	},
});

/** How the stubbed `/compact` goes: compacts as a typed one would, throws, or runs no compaction. */
export type Run = "compact" | "throw" | "none";

interface Ending {
	readonly answer?: string;
	readonly agentId?: string;
	readonly isAborted?: boolean;
	readonly reason?: "answer" | "aborted";
}

const wireIo = (on: On, seen: Seen, refuseSubmit: boolean): void => {
	on("env.get", () => ({ value: undefined }));
	on("session.root", () => ({ value: "/repo" }));
	on("ui.log", (_$, e) => {
		seen.lines.push(e.text);
		return { value: undefined };
	});
	on("fs.write", (_$, e) => {
		seen.written.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("prompt.submit", (_$, e) => {
		if (refuseSubmit) {
			throw new Error("submit refused");
		}
		seen.sent.push(e.text);
		return { text: e.text };
	});
};

const wireContext = (on: On, seen: Seen, context: Context): void => {
	on("session.compact", () => ({ skip: "core ran" }));
	on("session.usage", () => ({
		value: {
			startedAt: 0,
			context: {
				tokens: context.tokens ?? 1000,
				window: context.window ?? 1_000_000,
			},
			rateLimits: [],
		},
	}));
	on("model.fork", (_$, e) => {
		seen.forks.push(e.prompt);
		return { value: context.fork ?? forked(HANDOFF) };
	});
	on("turn.complete", () => ({ text: "" }));
};

// A stub may not call `$`, so the `/compact` stub waits while `finish` compacts the main transcript, as a typed `/compact` would.
const wireCompact = (on: On, seen: Seen, run: Run, held: Promise<boolean>) => {
	on("command.run", async () => {
		seen.runs += 1;
		if (run === "throw") {
			throw new Error("compact refused");
		}
		if (run === "compact") {
			await held;
		}
		return { text: "" };
	});
};

/** `command.run` stands in for the engine's `/compact`; `finish` ends a turn and lets the handover run to its end. */
export const lab = (
	$: Engine,
	on: On,
	run: Run = "compact",
	refuseSubmit = false,
	context: Context = {},
) => {
	scanner(on, [GITHUB_TOKEN]);
	const seen: Seen = {
		runs: 0,
		compacted: [],
		written: [],
		sent: [],
		lines: [],
		forks: [],
	};
	const gate = Promise.withResolvers<boolean>();
	const clock = mock.clock(on, { now: 0 });
	wireIo(on, seen, refuseSubmit);
	wireContext(on, seen, context);
	wireCompact(on, seen, run, gate.promise);
	const finish = async (e: Ending = {}): Promise<void> => {
		await $.turn.complete({ ...ENDED, answer: HANDOFF, ...e });
		await clock.settle();
		if (run === "compact" && seen.runs === 1) {
			seen.compacted.push(
				await $.session.compact({
					trigger: "manual",
					messages: [FIRST, LATER],
				}),
			);
		}
		gate.resolve(true);
		await clock.settle();
	};
	return { seen, finish };
};

export const compactedTo = (
	seen: Seen,
): readonly SessionMessage[] | undefined => {
	const compacted = seen.compacted[0];
	return compacted && "skip" in compacted ? [] : compacted?.messages;
};
