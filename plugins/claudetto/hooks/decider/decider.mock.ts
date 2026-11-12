import type {
	HttpInit,
	ModelCompleteRequest,
	ModelCompleteResult,
	ModelTextBlock,
	On,
	ProcessRunResult,
} from "claude-code";
import { mock } from "claude-code/testing";

import type { Host, QuestionSet } from "./questions.ts";

export const KEY = "typesafe-key-for-the-lab";

export const SET: QuestionSet = {
	yesMin: 0.7,
	noMax: 0.3,
	pickMin: 0.75,
	questions: {
		done: {
			type: "noul",
			instructions: "Does the reply say the work is done?",
		},
		store: {
			type: "choice",
			instructions: "Which store does the reply name?",
			criteria: { sql: "relations", kv: "keys" },
		},
	},
};

export const STATE = { reply: "The work is done and the data sits in sql." };

interface Reply {
	readonly status: number;
	readonly ok: boolean;
	readonly headers: Record<string, string>;
	readonly text: string;
}

export const jevReply = (status: number, text: string): Reply => ({
	status,
	ok: status >= 200 && status < 300,
	headers: {},
	text,
});

export const noul = (p: number) => ({ type: "noul", noul: p });

export const pick = (top: number) => ({
	type: "choice",
	choice: "sql",
	probabilities: { sql: top, kv: 1 - top },
});

export const jevAnswers = (answers: object): Reply =>
	jevReply(200, JSON.stringify({ model: "jev-1.14.0", answers }));

/** Jev's replies in turn, then a full set of confident answers. */
export const inOrder =
	(...replies: Reply[]) =>
	(n: number): Reply =>
		replies[n - 1] ?? jevAnswers(SETTLED);

/** A full set of confident answers. */
export const SETTLED = { done: noul(0.9), store: pick(0.9) };

const USAGE = {
	input_tokens: 1,
	output_tokens: 1,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
};

export const haikuText = (text: string): ModelCompleteResult => ({
	isAnswered: true,
	text,
	usage: USAGE,
});

export const haikuFailed = (
	reason: "api-error" | "aborted" | "empty-reply",
): ModelCompleteResult =>
	reason === "api-error"
		? {
				isAnswered: false,
				reason,
				status: 500,
				error: "server_error",
				usage: USAGE,
			}
		: { isAnswered: false, reason, usage: USAGE };

interface Rig {
	/** The variables the environment holds. */
	readonly env?: Readonly<Record<string, string>>;
	/** Jev's answer to its `n`th request; a throw is a failed request, and a promise that never settles is a hung server. */
	readonly jev?: (n: number) => Reply | Promise<Reply>;
	/** The model's answer to its `n`th request. */
	readonly haiku?: (n: number) => ModelCompleteResult;
	/** True: the secret scanner exits with an error. */
	readonly scanFails?: boolean;
}

// What the scanner's `secret-named-assignment` rule finds: the value of a NAME=value line whose NAME names a secret.
const ASSIGNMENT =
	/^\s*(?:export\s+)?\w*(?:token|secret|key|password)\w*=["']?([^\s"']+)/gimu;

const scanned = (stdin: string, fails: boolean): ProcessRunResult => {
	const found = [...stdin.matchAll(ASSIGNMENT)].map((m) => ({ Secret: m[1] }));
	return {
		exitCode: fails ? 2 : 0,
		stdout: JSON.stringify(found),
		stderr: fails ? "scanner crashed" : "",
		isStdoutTruncated: false,
		isStderrTruncated: false,
	};
};

interface Fetched {
	readonly url: string;
	readonly init?: HttpInit | undefined;
}

/** A stand-in for `$`: its key, Jev, the model and the clock, with each request and log line kept. */
export const rig = ({ env, jev, haiku, scanFails = false }: Rig = {}) => {
	const fetches: Fetched[] = [];
	const scans: string[] = [];
	const asked: ModelCompleteRequest[] = [];
	const logs: string[] = [];
	const vars = env ?? { TYPESAFE_API_KEY: KEY };
	const $: Host = {
		env: { get: (name) => Promise.resolve(vars[name]) },
		http: {
			fetch: (url, init) => {
				fetches.push({ url, init });
				if (jev === undefined) {
					throw new Error("no request was expected");
				}
				return Promise.resolve(jev(fetches.length));
			},
		},
		process: {
			run: (_argv, init) => {
				scans.push(init?.stdin ?? "");
				return Promise.resolve(scanned(init?.stdin ?? "", scanFails));
			},
		},
		clock: { sleep: () => Promise.resolve() },
		model: {
			complete: (request) => {
				asked.push(request);
				return Promise.resolve(haiku?.(asked.length) ?? haikuFailed("aborted"));
			},
		},
		ui: {
			log: (text) => {
				logs.push(text);
			},
		},
	};
	return { $, fetches, asked, logs, scans };
};

/** The text blocks of one model request's prompt. */
export const blocksOf = (
	request: ModelCompleteRequest | undefined,
): readonly ModelTextBlock[] =>
	typeof request?.prompt === "object" ? request.prompt : [];

/** The JSON body of one request to Jev. */
export const bodyOf = (
	fetched: Fetched | undefined,
): Record<string, unknown> => {
	const body = fetched?.init?.body ?? "{}";
	const parsed: unknown = JSON.parse(
		typeof body === "string"
			? body
			: Buffer.from(body.base64, "base64").toString(),
	);
	return typeof parsed === "object" && parsed !== null
		? Object.fromEntries(Object.entries(parsed))
		: {};
};

/** A lab with no Decider key whose fallback model gives no answer, so each question stays `unsettled` and the Stop check passes. */
export const quietDecider = (on: On): void => {
	mock.env(on, {});
	on("ui.log", () => ({ value: undefined }));
	on("model.complete", () => ({ value: haikuFailed("aborted") }));
};
