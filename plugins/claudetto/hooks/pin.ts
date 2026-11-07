import type { EngineInterface, On, SessionMessage } from "claude-code";
import { isRecord } from "./decide/jev.ts";
import { type Command, parse, programOf } from "./gate/shell-words.ts";
import { deny, fieldOf } from "./gate/verdict.ts";
import {
	PIN_ANSWER_FIRST,
	PIN_BLOCKED,
	PIN_COMPACT,
	PIN_EXTRACT,
	PIN_ISSUES_FIRST,
	PIN_NO_QUESTIONS,
	PIN_NOTE,
	type PinConstraint,
	type PinKind,
} from "./texts.ts";
import { ASK_TOOL, isPersonMessage } from "./verify.ts";

export const PERSON = /^(?:composer|bridge|sdk)$/;
const ANY_TOOL = /^/;
const ISSUES_FILE = /^ISSUES.*\.md$/;
const IN_PLACE = /^-[a-z]*i/;
const READ_PROGRAMS = new Set([
	"cat",
	"head",
	"tail",
	"less",
	"more",
	"bat",
	"nl",
]);
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

const toConstraint = (c: unknown): PinConstraint[] => {
	if (!(isRecord(c) && typeof c["text"] === "string" && isRule(c["rule"]))) {
		return [];
	}
	const files = c["files"];
	return [
		{
			text: c["text"],
			rule: c["rule"],
			...(Array.isArray(files) ? { files: files.map(String) } : {}),
		},
	];
};

const KINDS: ReadonlySet<unknown> = new Set<PinKind>([
	"remark",
	"question",
	"task",
]);
const isKind = (x: unknown): x is PinKind => KINDS.has(x);

interface Extraction {
	constraints: PinConstraint[];
	kind: PinKind;
}

const parseLedger = (text: string): Extraction | undefined => {
	try {
		const json: unknown = JSON.parse(
			text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
		);
		const list = isRecord(json) ? json["constraints"] : undefined;
		const kind = isRecord(json) ? json["kind"] : undefined;
		return Array.isArray(list)
			? {
					constraints: list.flatMap(toConstraint),
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

/** Whether a command of the shell text writes files and names one that `isTarget` accepts, as an argument or a redirect target. */
export const bashWritesTo = (
	command: string,
	isTarget: (path: string) => boolean,
): boolean =>
	parse(command).commands.some(
		(c) =>
			writesFiles(c) &&
			[...programOf(c).args, ...c.redirects.map((r) => r.target)].some(
				isTarget,
			),
	);

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
	const r = await $.model.complete({
		model: "haiku",
		prompt: PIN_EXTRACT(await personTexts($), previous, text),
		maxTokens: 600,
		timeoutMs: 20_000,
	});
	return r.isAnswered ? parseLedger(r.text) : undefined;
};

/** The repo root as the cwd spells it: `cdup` is `git rev-parse --show-cdup`, one `../` per level up. */
export const rootOf = (cwd: string, cdup: string): string =>
	cwd
		.split("/")
		.slice(0, cwd.split("/").length - (cdup.split("../").length - 1))
		.join("/");

// The open-issues file the project keeps at its root: the newest by mtime, since names carry a date only some of the time.
// A symlink lists as `other` with mtime 0, so its target's mtime from `stat` stands in.
const newestIssues = async (
	$: EngineInterface,
	cwd: string,
): Promise<string | undefined> => {
	const named = (await $.fs.list(cwd).catch(() => [])).filter(
		(f) => (f.kind === "file" || f.isLink) && ISSUES_FILE.test(f.name),
	);
	const dated = await Promise.all(
		named.map(async (f) => ({
			name: f.name,
			mtimeMs: f.isLink
				? ((await $.fs.stat(`${cwd}/${f.name}`).catch(() => undefined))
						?.mtimeMs ?? 0)
				: f.mtimeMs,
		})),
	);
	return dated.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.name;
};

/** Whether the shell command shows `file`: a read program, or `sed` not in place, given the file as an argument. */
const bashReads = (command: string, file: string[]): boolean =>
	parse(command).commands.some((c) => {
		const { name, args } = programOf(c);
		const reads =
			READ_PROGRAMS.has(name) ||
			(name === "sed" && !args.some((a) => IN_PLACE.test(a)));
		return reads && args.some((a) => file.includes(a));
	});

const hasRead = (messages: SessionMessage[], file: string[]): boolean =>
	messages.some((m) =>
		m.toolUses.some(
			(u) =>
				!u.isError &&
				(u.tool === "Read"
					? file.includes(String(u.input["file_path"]))
					: u.tool === "Bash" && bashReads(String(u.input["command"]), file)),
		),
	);

// A session started in a subfolder still has the file at the repo root; outside a repo the cwd is the root.
const unreadIssues = async (
	$: EngineInterface,
): Promise<string | undefined> => {
	const cwd = await $.session.cwd();
	const run = await $.process
		.run(["git", "rev-parse", "--show-cdup"])
		.catch(() => undefined);
	const cdup = run?.exitCode === 0 ? run.stdout.trim() : "";
	const root = rootOf(cwd, cdup);
	const newest = await newestIssues($, root);
	if (newest === undefined) {
		return undefined;
	}
	const file = [newest, `${cdup}${newest}`, `${root}/${newest}`];
	return hasRead(await $.session.messages(), file) ? undefined : file[1];
};

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
		return ledger.length === 0
			? next(e)
			: next({ ...e, instructions: PIN_COMPACT(e.instructions, ledger) });
	});
	// `delegation` answers the ask tool in its own `tool.call`, so `tool.check` never runs for it: the ask's checks sit here, and `register` puts `pin` first.
	on("tool.call", { tool: ASK_TOOL }, async ($, e, next) => {
		await pending;
		const hit = ledger.find((c) => c.rule === "no-questions");
		if (hit !== undefined) {
			return { deny: PIN_NO_QUESTIONS(hit.text) };
		}
		const unread = await unreadIssues($);
		return unread === undefined ? next(e) : { deny: PIN_ISSUES_FIRST(unread) };
	});
	on("tool.check", { tool: ANY_TOOL }, async ($, e, next) => {
		await pending;
		const hit = ledger.find((c) => breaks(c, e.tool, e.input));
		if (hit !== undefined) {
			return deny(PIN_BLOCKED(hit.text));
		}
		if (kind === "task" || (kind === "question" && LOOKUPS.has(e.tool))) {
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
