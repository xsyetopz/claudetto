// The fakes of the `tool.check` handler tests: a fake `$` with `git`, Jev, and the classifier model, and the call of `onCheck`.

import { onCheck } from "../../../plugins/claudetto/modules/gate/adapters/mod.ts";

/** The output of `git --list-cmds=main,others` in these tests. */
export const GIT_COMMANDS = "add\nclean\nrm\nstatus\n";

export interface Verdict {
	decision: string;
	decider?: string;
	reason?: string;
}

/** A fake `$` of a session at `/p`, with a `git` whose `status` prints `status`, and the argv of each run in `runs`. */
export const fake = (status: string, runs: (readonly string[])[] = []) => ({
	session: { cwd: async () => "/p" },
	env: { get: async (name: string) => ({ HOME: "/u", TMPDIR: "/t/" })[name] },
	fs: {
		stat: async (_path: string): Promise<{ mtimeMs: number }> =>
			Promise.reject(new Error("ENOENT")),
		read: async (_path: string): Promise<string> =>
			Promise.reject(new Error("ENOENT")),
	},
	process: {
		run: async (argv: readonly string[]) => {
			// The `git` facts of the gate: no alias, and the commands that these tests use.
			if (argv.includes("--get-regexp")) {
				return { exitCode: 1, stdout: "", stderr: "" };
			}
			if (argv.includes("--list-cmds=main,others")) {
				return { exitCode: 0, stdout: GIT_COMMANDS, stderr: "" };
			}
			runs.push(argv);
			return { exitCode: 0, stdout: status, stderr: "" };
		},
	},
});

/** Whether `f` is a function, so a test can call a handler with a fake `$` that has only the parts that the handler reads. */
export const isHandler = <A extends unknown[], R>(
	f: unknown,
): f is (...a: A) => R => typeof f === "function";

export const check = (
	command: string,
	engine: Verdict,
	$: unknown = fake(""),
) => {
	if (!isHandler<unknown[], Promise<Verdict>>(onCheck)) {
		throw new Error("`onCheck` is not a function");
	}
	return onCheck($, { tool: "Bash", input: { command } }, async () => engine);
};

export interface Reply {
	status: number;
	ok: boolean;
	headers: object;
	text: string;
}
export interface Fetch {
	url: string;
	init?: { headers?: Record<string, string>; body?: string } | undefined;
}

/** A reply of the API with the `noul` answer `q`, or the `status` with no answer. */
export const answerOf =
	(noul: number, status = 200) =>
	async (): Promise<Reply> => ({
		status,
		ok: status === 200,
		headers: {},
		text: JSON.stringify({ answers: { q: { type: "noul", noul } } }),
	});

let sessions = 0;

/** A new id of a session, so that no verdict or denial of the classifier carries over from another test. */
const newSession = (): (() => Promise<string>) => {
	const id = `fresh-${++sessions}`;
	return async () => id;
};

/** A fake `$` of a new session with the key `key`, whose `git` prints an untracked `notes.md`, whose `http.fetch` gives `jev`, and whose `clock.sleep` waits for an abort. */
export const jevFake = (
	key: string | undefined,
	jev: () => Promise<Reply>,
	runs: (readonly string[])[] = [],
	fetches: Fetch[] = [],
) => ({
	...fake("?? notes.md\n", runs),
	session: { cwd: async () => "/p", id: newSession() },
	env: {
		get: async (name: string) =>
			({ HOME: "/u", TMPDIR: "/t/", TYPESAFE_API_KEY: key })[name],
	},
	http: {
		fetch: async (url: string, init?: Fetch["init"]) => {
			fetches.push({ url, init });
			return jev();
		},
	},
	clock: {
		now: async () => 0,
		sleep: (_ms: number, options?: { signal?: AbortSignal }) =>
			new Promise<void>((_resolve, reject) =>
				options?.signal?.addEventListener("abort", () =>
					reject(new Error("aborted")),
				),
			),
	},
});

export const sure = answerOf(0.93);

/** A reply of the model with the text `text`. */
export const said = (text: string) => async () => ({
	isAnswered: true,
	text,
	usage: {},
});

/** A fake `$.model` whose `complete` gives `reply` and keeps each request in `asked`. */
export const modelOf = (
	reply: () => Promise<object>,
	asked: Record<string, unknown>[] = [],
) => ({
	complete: async (request: Record<string, unknown>) => {
		asked.push(request);
		return reply();
	},
});

/** A fake `$` of a new session with no Jev key, the user rows `typed`, and a model that gives `reply`. */
export const classifierFake = (
	reply: () => Promise<object>,
	asked: Record<string, unknown>[] = [],
	typed: string[] = [],
) => {
	const base = jevFake(undefined, sure);
	return {
		...base,
		session: {
			...base.session,
			messages: async () =>
				typed.map((text) => ({ role: "user", text, toolUses: [] })),
		},
		model: modelOf(reply, asked),
	};
};
