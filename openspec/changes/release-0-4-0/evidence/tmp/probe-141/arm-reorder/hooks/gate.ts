import type { EngineInterface, On } from "claude-code";
import {
	DENIALS_PER_CALL_MAX,
	type Denials,
	NO_REASON,
	repeatedText,
	signature,
	withDenial,
} from "./gate/denials.ts";
import { POLICY_FILES } from "./gate/packages.ts";
import { newRecreation, recreates, saw } from "./gate/recreate.ts";
import { judge, systemPath } from "./gate/rules.ts";
import { deny, type Verdict } from "./gate/verdict.ts";
import { redactAll, redactWith, secretsIn } from "./secrets.ts";
import { GATE_CHECK_FAILED, GATE_SYSTEM_WRITE, gateRule } from "./texts.ts";

const FILE_WRITERS = new Set(["Write", "Edit", "NotebookEdit"]);
const STRICTNESS = ["allow", "ask", "deny"];
const PERSON = /^(?:composer|bridge)$/;
// Another feature owns the unmatched `tool.check`; this pattern matches every tool name.
const ANY_TOOL = /^/;

export const fieldOf = (input: unknown, key: string): string | undefined => {
	const value =
		typeof input === "object" && input !== null
			? Object.entries(input).find(([k]) => k === key)?.[1]
			: undefined;
	return typeof value === "string" ? value : undefined;
};

const presentFiles = async ($: EngineInterface): Promise<Set<string>> => {
	const cwd = await $.session.cwd();
	const found = await Promise.all(
		POLICY_FILES.map(async (f) =>
			(await $.fs.exists(`${cwd}/${f}`)) ? f : undefined,
		),
	);
	return new Set(found.filter((f) => f !== undefined));
};

const ownVerdict = async (
	$: EngineInterface,
	tool: string,
	input: unknown,
): Promise<Verdict | undefined> => {
	const command = fieldOf(input, "command");
	if ((tool === "Bash" || tool === "Monitor") && command !== undefined) {
		const present = await presentFiles($);
		const own = judge(command, (f) => present.has(f));
		return own && { ...own, reason: `${own.reason} (\`${command}\`)` };
	}
	const path = fieldOf(input, "file_path") ?? fieldOf(input, "notebook_path");
	return FILE_WRITERS.has(tool) && path !== undefined && systemPath(path)
		? deny(GATE_SYSTEM_WRITE)
		: undefined;
};

export const gate = (on: On): void => {
	let denials: Denials = {};
	const files = newRecreation();

	// The gate only tightens: its verdict never turns a `deny` or `ask` of the engine into a looser one.
	on("tool.check", { tool: ANY_TOOL }, async ($, e, next) => {
		const refused = repeatedText(
			denials,
			signature(e.tool, e.input),
			fieldOf(e.input, "command") ?? `${e.tool} ${JSON.stringify(e.input)}`,
		);
		if (refused !== undefined) {
			return deny(refused);
		}
		// Computed before `next`, so a throw leaves `next` uncalled and the `.catch` asks in its place.
		const recreated = await recreates(
			files,
			() => $.session.cwd(),
			(path) => $.fs.exists(path),
			e.tool,
			e.input,
		);
		const own = (await ownVerdict($, e.tool, e.input)) ?? recreated;
		const found = await next(e);
		// The engine's text for a rule denial does not name the rule, so a model reads it as unexplained.
		const engine =
			found.decision === "deny" && found.rule !== undefined
				? { ...found, reason: gateRule(found.reason, found.rule) }
				: found;
		return own === undefined ||
			STRICTNESS.indexOf(engine.decision) >= STRICTNESS.indexOf(own.decision)
			? engine
			: own;
	}).catch(() => ({ decision: "ask", reason: GATE_CHECK_FAILED }));

	// `classic.PermissionRequest` does not fire in `-p`, so `tool.check` carries the same verdict.
	on("classic.PermissionRequest", async ($, e, next) => {
		const answer = await next(e);
		if (answer.decision !== undefined) {
			return answer;
		}
		const own = await ownVerdict($, e.tool_name, e.tool_input);
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

	// Every result is scanned, so a secret any tool prints reaches the model as `[REDACTED]`.
	on("tool.call", { tool: ANY_TOOL }, async ($, e, next) => {
		const answer = await next(e);
		if (answer.deny !== undefined) {
			return answer;
		}
		if (!answer.isError) {
			saw(files, e.tool, e);
		}
		const seen =
			answer.text ??
			(typeof answer.result === "string"
				? answer.result
				: (JSON.stringify(answer.result) ?? ""));
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
