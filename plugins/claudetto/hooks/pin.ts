import type { EngineInterface, On, SessionMessage } from "claude-code";
import { isRecord } from "./decide/jev.ts";
import { type Command, parse, programOf } from "./gate/shell-words.ts";
import { deny, fieldOf } from "./gate/verdict.ts";
import {
	PIN_ANSWER_FIRST,
	PIN_BLOCKED,
	PIN_COMPACT,
	PIN_EXTRACT,
	PIN_NO_QUESTIONS,
	PIN_NOTE,
	type PinConstraint,
	type PinKind,
} from "./texts.ts";
import { ASK_TOOL, isPersonMessage } from "./verify.ts";

export const PERSON = /^(?:composer|bridge|sdk)$/;
const ANY_TOOL = /^/;
const IN_PLACE = /^-[a-z]*i/;
const WRITERS = new Set(["Write", "Edit", "NotebookEdit"]);
const WRITE_PROGRAMS = new Set([
	"tee",
	"mv",
	"cp",
	"rm",
	"mkdir",
	"touch",
	"patch",
	"ln",
	"chmod",
	"truncate",
]);
const GIT_WRITES = new Set([
	"commit",
	"add",
	"checkout",
	"restore",
	"reset",
	"stash",
	"apply",
	"merge",
	"rebase",
	"mv",
	"rm",
	"clean",
	"cherry-pick",
	"revert",
]);
const RULES: ReadonlySet<unknown> = new Set<PinConstraint["rule"]>([
	"read-only",
	"no-commit",
	"no-push",
	"only-files",
	"no-questions",
	"none",
]);
const isRule = (x: unknown): x is PinConstraint["rule"] => RULES.has(x);

const flat = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// An entry stands only on words a message of the person holds, so a remark or the agent's own text sets none.
const toConstraint = (c: unknown, said: string[]): PinConstraint[] => {
	if (
		!(
			isRecord(c) &&
			typeof c["text"] === "string" &&
			typeof c["quote"] === "string" &&
			flat(c["quote"]) !== "" &&
			isRule(c["rule"])
		)
	) {
		return [];
	}
	const quote = flat(c["quote"]);
	if (!said.some((t) => flat(t).includes(quote))) {
		return [];
	}
	const files = c["files"];
	return [
		{
			text: c["text"],
			rule: c["rule"],
			quote: c["quote"],
			...(Array.isArray(files) ? { files: files.map(String) } : {}),
		},
	];
};

const KINDS: ReadonlySet<unknown> = new Set<PinKind>([
	"remark",
	"question",
	"dispute",
	"task",
]);
const isKind = (x: unknown): x is PinKind => KINDS.has(x);

interface Extraction {
	constraints: PinConstraint[];
	kind: PinKind;
}

const parseLedger = (
	text: string,
	said: string[],
): Extraction | undefined => {
	try {
		const json: unknown = JSON.parse(
			text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
		);
		const list = isRecord(json) ? json["constraints"] : undefined;
		const kind = isRecord(json) ? json["kind"] : undefined;
		return Array.isArray(list)
			? {
					constraints: list.flatMap((c) => toConstraint(c, said)),
					kind: isKind(kind) ? kind : "task",
				}
			: undefined;
	} catch {
		return undefined;
	}
};

const writesFile = (c: Command): boolean =>
	c.redirects.some(
		(r) => !r.op.startsWith("<") && r.op !== ">&" && r.target !== "/dev/null",
	);

const writesFiles = (c: Command): boolean => {
	const { name, args } = programOf(c);
	const sub = args.find((a) => !a.startsWith("-")) ?? "";
	return (
		writesFile(c) ||
		WRITE_PROGRAMS.has(name) ||
		(name === "sed" && args.some((a) => IN_PLACE.test(a))) ||
		(name === "bun" && ["add", "install", "remove"].includes(sub))
	);
};

const bashWrites = (
	command: string,
	git: Set<string> = GIT_WRITES,
	anyWrite = true,
): boolean =>
	parse(command).commands.some((c) => {
		const { name, args } = programOf(c);
		const sub = args.find((a) => !a.startsWith("-")) ?? "";
		return (anyWrite && writesFiles(c)) || (name === "git" && git.has(sub));
	});

const breaks = (c: PinConstraint, tool: string, input: unknown): boolean => {
	const command = tool === "Bash" ? fieldOf(input, "command") : undefined;
	switch (c.rule) {
		case "read-only":
			return (
				WRITERS.has(tool) || (command !== undefined && bashWrites(command))
			);
		case "no-commit":
			return (
				command !== undefined && bashWrites(command, new Set(["commit"]), false)
			);
		case "no-push":
			return (
				command !== undefined && bashWrites(command, new Set(["push"]), false)
			);
		case "only-files": {
			const path =
				fieldOf(input, "file_path") ?? fieldOf(input, "notebook_path") ?? "";
			return (
				WRITERS.has(tool) && !(c.files ?? []).some((f) => path.endsWith(f))
			);
		}
		case "no-questions":
		case "none":
			return false;
	}
};

const personTexts = async ($: EngineInterface): Promise<string[]> =>
	(await $.session.messages()).filter(isPersonMessage).map((m) => m.text);

const extractLedger = async (
	$: EngineInterface,
	text: string,
	previous: PinConstraint[],
): Promise<Extraction | undefined> => {
	const history = await personTexts($);
	const r = await $.model.complete({
		model: "haiku",
		prompt: PIN_EXTRACT(history, previous, text),
		maxTokens: 600,
		timeoutMs: 20_000,
	});
	return r.isAnswered ? parseLedger(r.text, [...history, text]) : undefined;
};

/** The repo root as the cwd spells it: `cdup` is `git rev-parse --show-cdup`, one `../` per level up. */
export const rootOf = (cwd: string, cdup: string): string =>
	cwd
		.split("/")
		.slice(0, cwd.split("/").length - (cdup.split("../").length - 1))
		.join("/");

// Built-ins that change nothing: a question that needs one of them gets the lookup, not the answer-first gate (task 18.21).
const LOOKUPS: ReadonlySet<string> = new Set([
	"ListAgents",
	"Read",
	"Grep",
	"Glob",
]);

const hasSpoken = (messages: SessionMessage[]): boolean =>
	messages
		.slice(messages.findLastIndex(isPersonMessage) + 1)
		.some((m) => m.role === "assistant" && m.text !== "");

export const pin = (on: On): void => {
	let ledger: PinConstraint[] = [];
	// What the latest person message is; a failed extraction leaves it a task, which no check touches.
	let kind: PinKind = "task";
	// The message count at which the answer-first deny fired this turn: calls of that one batch are denied, the retry is not.
	let nudgedAt = -1;
	const isFirstBatch = (messages: SessionMessage[]): boolean =>
		nudgedAt < 0 || nudgedAt === messages.length;
	// The extraction runs beside the reply so the prompt is not held for it; tool.check waits on it.
	let pending: Promise<void> = Promise.resolve();
	const adopt = async (job: Promise<Extraction | undefined>): Promise<void> => {
		const found = await job.catch(() => undefined);
		// A failed or unreadable answer keeps the last ledger rather than dropping constraints.
		ledger = found?.constraints ?? ledger;
		kind = found?.kind ?? kind;
	};
	// A resumed session holds person messages this process never saw: its first prompt waits for the extraction, so the note rides it.
	let seen = false;
	on("prompt.submit", { origin: { kind: PERSON } }, async ($, e, next) => {
		kind = "task";
		nudgedAt = -1;
		if (!(e.command || e.isMeta)) {
			pending = adopt(extractLedger($, e.text, ledger));
			const earlier = (await personTexts($)).some((t) => t !== e.text);
			if (!seen && earlier) {
				await pending;
			}
			seen = true;
		}
		const shown = ledger;
		return shown.length === 0
			? next(e)
			: next({ ...e, context: [...(e.context ?? []), PIN_NOTE(shown)] });
	});
	on("session.compact", async (_$, e, next) => {
		await pending;
		// The summary that follows is a user message no person wrote: the answer-first gate would read it as an unanswered remark.
		kind = "task";
		return ledger.length === 0
			? next(e)
			: next({ ...e, instructions: PIN_COMPACT(e.instructions, ledger) });
	});
	// `delegation` answers the ask tool in its own `tool.call`, so `tool.check` never runs for it: the ask's checks sit here, and `register` puts `pin` first.
	on("tool.call", { tool: ASK_TOOL }, async (_$, e, next) => {
		await pending;
		const hit = ledger.find((c) => c.rule === "no-questions");
		return hit === undefined ? next(e) : { deny: PIN_NO_QUESTIONS(hit.text) };
	});
	on("tool.check", { tool: ANY_TOOL }, async ($, e, next) => {
		await pending;
		const hit = ledger.find((c) => breaks(c, e.tool, e.input));
		if (hit !== undefined) {
			return deny(PIN_BLOCKED(hit.text));
		}
		// A dispute is settled by running the disputed code, so its command passes; an edit still waits for the answer.
		if (
			kind === "task" ||
			(kind !== "remark" && LOOKUPS.has(e.tool)) ||
			(kind === "dispute" && e.tool === "Bash")
		) {
			return next(e);
		}
		const messages = await $.session.messages();
		if (!hasSpoken(messages) && isFirstBatch(messages)) {
			nudgedAt = messages.length;
			return deny(PIN_ANSWER_FIRST);
		}
		return next(e);
	});
};
