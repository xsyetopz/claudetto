import type { EngineInterface } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain";
import { redactedState } from "../../decider/redact";
import {
	ADVISOR_BAD_FILES,
	ADVISOR_CALL,
	ADVISOR_DENIED,
	ADVISOR_FAILED,
	ADVISOR_NO_QUESTION,
	ADVISOR_SYSTEM,
	ADVISOR_TOO_BIG,
	ADVISOR_UNREADABLE,
} from "../../texts-gate";

// Full IDs, because the lab rule on `$.model.complete` takes no alias. `fable` resolves to Mythos through the same variable.
const MODELS = { fable: "claude-fable-5-2", mythos: "claude-mythos-5-2" };
const MAX_CHARS = 400_000;
const MAX_TOKENS = 16_000;
const TIMEOUT_MS = 600_000;

const messageOf = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

/** Each file as `{ path, text }`, or the refusal that stops the send: a path the read rules deny, or one that cannot be read. */
async function filesOf(
	$: EngineInterface,
	paths: readonly string[],
): Promise<{ path: string; text: string }[] | string> {
	const cwd = await $.session.cwd();
	const absolute = [
		...new Set(
			paths.map((p) =>
				p.startsWith("/") ? p : `${cwd}/${p.replace(/^\.\//u, "")}`,
			),
		),
	];
	const checks = await Promise.all(
		absolute.map((path) =>
			$.tool.check({ tool: "Read", input: { file_path: path } }),
		),
	);
	const denied = absolute.find((_, i) => checks[i]?.decision === "deny");
	if (denied !== undefined) {
		return ADVISOR_DENIED(denied);
	}
	const read = await Promise.all(
		absolute.map(
			async (
				path,
			): Promise<
				{ path: string; text: string } | { path: string; why: string }
			> => {
				try {
					return { path, text: await $.fs.read(path) };
				} catch (error) {
					return { path, why: messageOf(error) };
				}
			},
		),
	);
	const failed = read.find((r) => "why" in r);
	if (failed !== undefined && "why" in failed) {
		return ADVISOR_UNREADABLE(failed.path, failed.why);
	}
	return read.flatMap((r) =>
		"text" in r ? [{ path: r.path, text: r.text }] : [],
	);
}

/**
 * Puts one question, with the content of the files `paths` name and nothing else of the session, to one model call at `high` effort.
 * The question and the files are redacted first. The result is the model's text, or the reason nothing was sent or answered.
 */
export async function advise(
	$: EngineInterface,
	question: string,
	paths: readonly string[],
): Promise<string> {
	const files = await filesOf($, paths);
	if (typeof files === "string") {
		return files;
	}
	const state = {
		question,
		...Object.fromEntries(files.map((f) => [f.path, f.text])),
	};
	if (Object.values(state).join("").length > MAX_CHARS) {
		return ADVISOR_TOO_BIG(MAX_CHARS);
	}
	const account =
		(await $.env.get("ANTHROPIC_DEFAULT_FABLE_MODEL")) === MODELS.mythos
			? "mythos"
			: "fable";
	try {
		const safe = await redactedState($, state);
		const prompt = [
			`<question>\n${safe["question"]}\n</question>`,
			...files.map((f) => `<file path="${f.path}">\n${safe[f.path]}\n</file>`),
		].join("\n");
		const result = await $.model.complete({
			model: MODELS[account],
			effort: "high",
			system: ADVISOR_SYSTEM,
			prompt,
			maxTokens: MAX_TOKENS,
			timeoutMs: TIMEOUT_MS,
		});
		return result.isAnswered ? result.text : ADVISOR_FAILED(result.reason);
	} catch (error) {
		return ADVISOR_FAILED(messageOf(error));
	}
}

const isPaths = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((f) => typeof f === "string");

/** Answers an `advisor` call; every other tool passes on. */
export async function advisorCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
): Promise<Awaited<CallAnswer>> {
	if (![ADVISOR_CALL].includes(e.tool)) {
		return next(e);
	}
	const question: unknown = Reflect.get(e, "question");
	const files: unknown = Reflect.get(e, "files") ?? [];
	if (typeof question !== "string" || question.trim() === "") {
		return { result: ADVISOR_NO_QUESTION };
	}
	if (!isPaths(files)) {
		return { result: ADVISOR_BAD_FILES };
	}
	return { result: await advise($, question, files) };
}
