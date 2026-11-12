import type { HttpInit, On } from "claude-code";
import { type Engine, mock } from "claude-code/testing";

import { bodyOf } from "../../decider/decider.mock";
import { scanner } from "../../secrets.mock";

export const DECIDE = "mcp__claudetto__decide";
export const KEY = "typesafe-key";

export const reply = (status: number, text: string) => ({
	value: { status, ok: status >= 200 && status < 300, headers: {}, text },
});

export const okay = (answers: object) =>
	reply(200, JSON.stringify({ model: "jev-1", answers }));

export const choice = (
	top: number,
	rest: Record<string, number>,
	approval = 0.05,
) => ({
	pick_0: {
		type: "choice",
		choice: "sql",
		confidence: 0.1,
		probabilities: { sql: top, ...rest },
	},
	approval_0: { type: "noul", noul: approval },
});

const opt = (label: string) => ({ label, description: `the ${label} option` });
export const TWO = {
	question: "Which store?",
	options: [opt("sql"), opt("kv")],
};
export const FOUR = {
	question: "Which store?",
	options: [opt("sql"), opt("kv"), opt("graph"), opt("doc")],
};

type Reply = ReturnType<typeof reply>;
type Send = (
	n: number,
	clock: ReturnType<typeof mock.clock>,
) => Reply | Promise<Reply>;

interface Fetched {
	url: string;
	init?: HttpInit;
}

/** A lab whose environment holds `TYPESAFE_API_KEY`, unless `env` says otherwise. */
export const stub = (on: On, send: Send, env?: Record<string, string>) => {
	scanner(on);
	mock.env(on, env ?? { TYPESAFE_API_KEY: KEY });
	const clock = mock.clock(on);
	const fetches: Fetched[] = [];
	on("http.fetch", (_$, e) => {
		fetches.push(e);
		return send(fetches.length, clock);
	});
	on("tool.call", (_$, e, next) =>
		e.tool === DECIDE ? next(e) : { result: "ran" },
	);
	return { fetches, clock };
};

export const ask = async ($: Engine, questions: object[]) => {
	const answer = await $.tool.call({ tool: DECIDE, questions });
	return typeof answer.result === "string" ? answer.result : "";
};

export const registered = async ($: Engine, on: On) => {
	const names: string[] = [];
	on("session.start", () => ({ cwd: "/repo" }));
	on("tool.register", (_$, e) => {
		names.push(e.name);
		return { value: { tool: `mcp__claudetto__${e.name}` } };
	});
	on("command.register", (_$, e) => ({ value: { command: e.name } }));
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });
	return names.filter((name) => name === "decide");
};

/** The sorted top-level keys of a request body. */
export const bodyKeys = (fetched: Fetched | undefined): string[] =>
	Object.keys(bodyOf(fetched)).toSorted((a, b) => a.localeCompare(b));

/** One top-level section of a request body. */
export const sectionOf = (
	fetched: Fetched | undefined,
	name: string,
): unknown => bodyOf(fetched)[name];

/** The keys of one top-level section of a request body. */
export const sectionKeys = (
	fetched: Fetched | undefined,
	name: string,
): string[] => Object.keys(new Object(sectionOf(fetched, name)));

/** Two slow 529 replies, then a reply that never comes in time. */
export const slowOverloads: Send = async (n, c) => {
	if (n < 3) {
		await c.sleep(4900);
		return reply(529, "{}");
	}
	await c.sleep(60_000);
	return okay({});
};

/** The given replies in turn, then a confident pick. */
export const repliesThenPick =
	(replies: Reply[]): Send =>
	(n) =>
		replies[n - 1] ?? okay(choice(0.9, { kv: 0.1 }));
