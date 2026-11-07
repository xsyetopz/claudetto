import type { EngineInterface, On, PluginOptions } from "claude-code";
import {
	DENIALS_PER_CALL_MAX,
	type Denials,
	NO_REASON,
	repeatedText,
	signature,
	withDenial,
} from "./gate/denials.ts";
import { POLICY_FILES } from "./gate/packages.ts";
import { MARKER, ownsOf, tmpTopOf, tmpTops } from "./gate/processes.ts";
import { readSplit } from "./gate/read-split.ts";
import { readOnly } from "./gate/readonly.ts";
import {
	type Host,
	newRecreation,
	type Recreation,
	recreates,
	saw,
} from "./gate/recreate.ts";
import { judge, systemPath } from "./gate/rules.ts";
import { deny, fieldOf, type Verdict } from "./gate/verdict.ts";
import {
	namedPaths,
	spellsWall,
	unguarded,
	walledVerdict,
} from "./gate/walled.ts";
import { listOption } from "./options.ts";
import { redactAll, redactWith, secretsIn } from "./secrets.ts";
import {
	GATE_CHECK_FAILED,
	GATE_READ_ONLY,
	GATE_SYSTEM_WRITE,
	gateRule,
	gateTmpMarker,
	walledUnguarded,
} from "./texts.ts";

export const GATE_LOG = ".claude/claudetto/gate-asks.jsonl";
const LOGGED_CHARS = 200;
const FILE_WRITERS = new Set(["Write", "Edit", "NotebookEdit"]);
const STRICTNESS = ["allow", "ask", "deny"];
const PERSON = /^(?:composer|bridge)$/;
// Another feature owns the unmatched `tool.check`; this pattern matches every tool name.
const ANY_TOOL = /^/;
// Only a command that could need the transcript or a marker file reads them.
const OWNED = /\b(?:kill|worktree|branch|update-ref)\b/;
const TMP_TOUCH = /\b(?:rm|mkdir|mktemp)\b/;

const isBareAsk = (
	found: Awaited<ReturnType<EngineInterface["tool"]["check"]>>,
): boolean =>
	found.decision === "ask" &&
	found.rule === undefined &&
	found.setting === undefined &&
	found.hook === undefined &&
	found.plugin === undefined;

const presentFiles = async ($: EngineInterface): Promise<Set<string>> => {
	const cwd = await $.session.cwd();
	const found = await Promise.all(
		POLICY_FILES.map(async (f) =>
			(await $.fs.exists(`${cwd}/${f}`)) ? f : undefined,
		),
	);
	return new Set(found.filter((f) => f !== undefined));
};

const hostOf = ($: EngineInterface): Host => ({
	cwd: () => $.session.cwd(),
	exists: (path) => $.fs.exists(path),
	realPath: async (path) =>
		(await $.fs.stat(path, { resolve: true }).catch(() => undefined))?.realPath,
	list: (path) => $.fs.list(path),
	// `$.process` has no environment of its own; the shell that runs a command expands `~` from this one.
	home: async () => (await $.process.run(["printenv", "HOME"])).stdout,
	past: async () => (await $.session.messages()).flatMap((m) => m.toolUses),
});

/** Tells whether the /tmp folder holds this session's marker. */
export async function isMarked(
	$: EngineInterface,
	top: string,
): Promise<boolean> {
	return (
		(await $.fs.exists(`${top}/${MARKER}`)) &&
		(await $.fs.read(`${top}/${MARKER}`)).trim() === (await $.session.id())
	);
}

const ownershipOf = async ($: EngineInterface, command: string) => {
	const tops = TMP_TOUCH.test(command) ? tmpTops(command) : [];
	const marked = await Promise.all(
		tops.map(async (top) => ((await isMarked($, top)) ? top : undefined)),
	);
	return ownsOf(
		OWNED.test(command) ? await hostOf($).past() : [],
		new Set(marked.filter((t) => t !== undefined)),
	);
};

interface Walls {
	paths: readonly string[];
	files: Recreation;
}

const homeOf = async ($: EngineInterface, files: Recreation) => {
	files.home ??= (await hostOf($).home()).trim();
	return files.home;
};

const ownVerdict = async (
	$: EngineInterface,
	walls: Walls,
	tool: string,
	input: unknown,
): Promise<Verdict | undefined> => {
	const named = namedPaths(tool, input);
	const walled = spellsWall(walls.paths, named)
		? walledVerdict(
				named,
				walls.paths,
				await homeOf($, walls.files),
				await $.session.cwd(),
			)
		: undefined;
	if (walled !== undefined) {
		return walled;
	}
	const command = fieldOf(input, "command");
	if ((tool === "Bash" || tool === "Monitor") && command !== undefined) {
		const present = await presentFiles($);
		const own = judge(
			command,
			(f) => present.has(f),
			await ownershipOf($, command),
		);
		return own && { ...own, reason: `${own.reason} (\`${command}\`)` };
	}
	const path = fieldOf(input, "file_path") ?? fieldOf(input, "notebook_path");
	if (!FILE_WRITERS.has(tool) || path === undefined) {
		return undefined;
	}
	// A write makes its missing folders, so it would make a /tmp folder no marker names (seen live, 18.41).
	const top = tmpTopOf(path);
	if (top !== undefined && top !== path && !(await isMarked($, top))) {
		return deny(gateTmpMarker(top));
	}
	return systemPath(path) ? deny(GATE_SYSTEM_WRITE) : undefined;
};

// `$.fs` has no append, so each line is read back and written whole; the queue keeps parallel checks from losing one.
let logging: Promise<void> = Promise.resolve();
const log = async (
	$: EngineInterface,
	e: { tool: string; input: unknown },
	verdict: { decision: string; rule?: string; reason?: string },
): Promise<void> => {
	if (verdict.decision === "allow") {
		return;
	}
	const before = logging;
	const write = async () => {
		await before;
		const path = `${await $.session.root()}/${GATE_LOG}`;
		const text = [
			fieldOf(e.input, "command") ?? JSON.stringify(e.input) ?? "",
			verdict.rule ?? verdict.reason ?? "",
		].join("\0");
		const secrets = await secretsIn(
			(argv, init) => $.process.run(argv, init),
			text,
		);
		const [command = "", rule = ""] = redactWith(text, secrets)
			.split("\0")
			.map((part) => part.slice(0, LOGGED_CHARS));
		const line = JSON.stringify({
			time: new Date(await $.clock.now()).toISOString(),
			tool: e.tool,
			decision: verdict.decision,
			rule,
			command,
		});
		const held = (await $.fs.exists(path)) ? await $.fs.read(path) : "";
		await $.fs.write(path, `${held}${line}\n`);
	};
	// A failed write loses its line and keeps the verdict: the outer catch would turn a deny into an ask.
	logging = write().catch(() => undefined);
	await logging;
};

export const gate = (on: On, options: PluginOptions): void => {
	let denials: Denials = {};
	const files = newRecreation();
	const walls = { paths: listOption(options, "protectedPaths"), files };

	// A deny rule in the settings can vanish unnoticed, as it did on 2026-11-07, while the gate's wall stays.
	on("classic.SessionStart", { source: "startup" }, async ($, e, next) => {
		const open = unguarded(
			walls.paths,
			await $.settings.read({ key: "permissions" }),
			await homeOf($, files),
		);
		if (open.length > 0) {
			$.ui.log(walledUnguarded(open));
		}
		return next(e);
	});

	// The gate only tightens, except that an `ask` no rule, option, hook, or plugin made, on a read-only command, becomes an `allow`.
	on("tool.check", { tool: ANY_TOOL }, async ($, e, next) => {
		const refused = repeatedText(
			denials,
			signature(e.tool, e.input),
			fieldOf(e.input, "command") ?? `${e.tool} ${JSON.stringify(e.input)}`,
		);
		if (refused !== undefined) {
			const verdict = deny(refused);
			await log($, e, verdict);
			return verdict;
		}
		// Computed before `next`, so a throw leaves `next` uncalled and the `.catch` asks in its place.
		const recreated = await recreates(hostOf($), files, e.tool, e.input);
		const own = (await ownVerdict($, walls, e.tool, e.input)) ?? recreated;
		const found = await next(e);
		// The engine's text for a rule denial does not name the rule, so a model reads it as unexplained.
		const engine =
			found.decision === "deny" && found.rule !== undefined
				? { ...found, reason: gateRule(found.reason, found.rule) }
				: found;
		if (
			own === undefined &&
			e.tool === "Bash" &&
			isBareAsk(engine) &&
			readOnly(fieldOf(e.input, "command") ?? "")
		) {
			return { decision: "allow", reason: GATE_READ_ONLY };
		}
		const verdict =
			own === undefined ||
			STRICTNESS.indexOf(engine.decision) >= STRICTNESS.indexOf(own.decision)
				? engine
				: own;
		await log($, e, verdict);
		return verdict;
	}).catch(() => ({ decision: "ask", reason: GATE_CHECK_FAILED }));

	// `classic.PermissionRequest` does not fire in `-p`, so `tool.check` carries the same verdict.
	on("classic.PermissionRequest", async ($, e, next) => {
		const answer = await next(e);
		if (answer.decision !== undefined) {
			return answer;
		}
		const own = await ownVerdict($, walls, e.tool_name, e.tool_input);
		return own?.decision === "deny"
			? { ...answer, decision: { behavior: "deny", message: own.reason } }
			: answer;
	});

	on("classic.PermissionDenied", async (_$, e, next) => {
		const answer = await next(e);
		const key = signature(e.tool_name, e.tool_input);
		denials = withDenial(denials, key, e.reason);
		// A retry of a denial with no reason meets the same denial, so only a reasoned one is retried.
		return (denials[key]?.count ?? 0) < DENIALS_PER_CALL_MAX &&
			!NO_REASON.test(e.reason)
			? { ...answer, retry: true }
			: answer;
	});

	// A new message from the person can carry the consent the earlier denials lacked.
	on("prompt.submit", { origin: { kind: PERSON } }, (_$, e, next) => {
		denials = {};
		return next(e);
	});

	readSplit(on);

	// Every result is scanned, so a secret any tool prints reaches the model as `[REDACTED]`.
	on("tool.call", { tool: ANY_TOOL }, async ($, e, next) => {
		const answer = await next(e);
		if (answer.deny !== undefined) {
			return answer;
		}
		const seen =
			answer.text ??
			(typeof answer.result === "string"
				? answer.result
				: (JSON.stringify(answer.result) ?? ""));
		if (!answer.isError) {
			await saw(hostOf($), files, e.tool, e, seen);
		}
		const secrets = await secretsIn(
			(argv, init) => $.process.run(argv, init),
			seen,
		);
		if (secrets.length === 0) {
			return answer;
		}
		// A hook's `{ result }` cannot carry an error, so an errored result reaches the model as a deny.
		return answer.isError
			? { deny: redactWith(seen, secrets) }
			: {
					result: redactAll(answer.result, secrets),
					...(answer.context && { context: answer.context }),
				};
	}).catch(async (_$, e, next) => {
		// The replay rethrows what failed beneath, so only a failed scan withholds the result.
		await next(e);
		return {
			deny: next.error.message ?? `The secret scan ${next.error.kind}.`,
		};
	});
};
