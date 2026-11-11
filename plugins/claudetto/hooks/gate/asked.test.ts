import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import {
	bodyOf,
	haikuFailed,
	haikuText,
	jevAnswers,
	jevReply,
	KEY,
	noul,
} from "../decider/decider.mock.ts";
import { bash } from "../secrets.mock.ts";
import { type Earlier, lab } from "./processes.mock.ts";

const DELETE = "git branch -D old-feature";
const NOUL = "asks_delete_branch";

interface Decider {
	/** The probability Jev gives the Noul, or `down` for a failing server; none leaves the environment without a key. */
	readonly jev?: number | "down";
	/** The fallback model's reply to a prompt; none is a call that is not answered. */
	readonly haiku?: (prompt: string) => string;
}

const yes = (evidence: string) => (): string =>
	JSON.stringify({ [NOUL]: { answer: "yes", evidence } });
const no = (): string => JSON.stringify({ [NOUL]: { answer: "no" } });
const yesExcept =
	(branch: string, evidence: string) =>
	(prompt: string): string =>
		prompt.includes(branch) ? no() : yes(evidence)();

const gate = (
	on: On,
	said: string[],
	{ jev, haiku }: Decider = {},
	past: Earlier[] = [],
) => {
	const fetches: Parameters<typeof bodyOf>[0][] = [];
	const prompts: string[] = [];
	lab(on, past, said);
	mock.env(on, jev === undefined ? {} : { TYPESAFE_API_KEY: KEY });
	mock.clock(on);
	on("ui.log", () => ({ value: undefined }));
	on("http.fetch", (_$, e) => {
		fetches.push(e);
		return {
			value:
				jev === "down"
					? jevReply(500, "down")
					: jevAnswers({ [NOUL]: noul(jev ?? 0) }),
		};
	});
	on("model.complete", (_$, e) => {
		const prompt = JSON.stringify(e.prompt);
		prompts.push(prompt);
		return {
			value:
				haiku === undefined ? haikuFailed("aborted") : haikuText(haiku(prompt)),
		};
	});
	return { fetches, prompts };
};

for (const [scenario, said] of [
	["The Person Asked", "delete all other local branches"],
	[
		"Words Outside a Fixed List",
		"get rid of the stale branches, old-feature included",
	],
] as const) {
	test(`${scenario}: after "${said}" and a yes, the delete runs`, async ($: Engine, on: On) => {
		gate(on, [said], { haiku: yes(said) });
		const v = await bash($, DELETE);
		expect(v.decision).toBe("allow");
	});
}

for (const [scenario, said] of [
	["No Request", "old-feature is out."],
	["The Person Forbade It", "do not delete old-feature"],
] as const) {
	test(`${scenario}: after "${said}" and a no, the gate asks`, async ($: Engine, on: On) => {
		gate(on, [said], { haiku: no });
		const v = await bash($, DELETE);
		expect(v.decision).toBe("ask");
	});
}

test("The Decider Fails: Jev is down and the fallback is not answered, so the gate asks", async ($: Engine, on: On) => {
	const { fetches, prompts } = gate(on, ["delete old-feature"], {
		jev: "down",
	});
	const v = await bash($, DELETE);
	expect(v.decision).toBe("ask");
	expect(fetches).toHaveLength(1);
	expect(prompts).toHaveLength(1);
});

test("a yes from Jev lets the delete run, from the person's messages and the branch alone", async ($: Engine, on: On) => {
	const { fetches, prompts } = gate(on, ["tidy up", "drop old-feature"], {
		jev: 0.9,
	});
	const v = await bash($, DELETE);
	expect(v.decision).toBe("allow");
	expect(bodyOf(fetches[0])["state"]).toEqual({
		person_messages: "- tidy up\n- drop old-feature",
		branch: "old-feature",
	});
	expect(prompts).toHaveLength(0);
});

test("an answer Jev leaves between its thresholds asks the person, with no second call", async ($: Engine, on: On) => {
	const { prompts } = gate(on, ["old-feature may go at some point"], {
		jev: 0.5,
	});
	const v = await bash($, DELETE);
	expect(v.decision).toBe("ask");
	expect(prompts).toHaveLength(0);
});

test("a fallback yes whose evidence the messages do not hold asks the person", async ($: Engine, on: On) => {
	gate(on, ["old-feature is out."], { haiku: yes("delete old-feature") });
	const v = await bash($, DELETE);
	expect(v.decision).toBe("ask");
});

test("a session with no message of the person asks, with no call", async ($: Engine, on: On) => {
	const { fetches, prompts } = gate(on, [], { jev: 0.9 });
	const v = await bash($, DELETE);
	expect(v.decision).toBe("ask");
	expect(fetches).toHaveLength(0);
	expect(prompts).toHaveLength(0);
});

test("a branch this session made is deleted with no call", async ($: Engine, on: On) => {
	const { prompts } = gate(on, ["carry on"], {}, [
		{ command: "git branch mine", text: "" },
	]);
	const v = await bash($, "git branch -D mine");
	expect(v.decision).toBe("allow");
	expect(prompts).toHaveLength(0);
});

test("each branch of one delete gets its own answer, and one no asks the person", async ($: Engine, on: On) => {
	const said = "delete old-feature";
	const { prompts } = gate(on, [said], {
		haiku: yesExcept("other-one", said),
	});
	const v = await bash($, `${DELETE} other-one`);
	expect(v.decision).toBe("ask");
	expect(prompts).toHaveLength(2);
});

test("a delete inside sh -c is answered the same way", async ($: Engine, on: On) => {
	const said = "delete old-feature";
	gate(on, [said], { haiku: yes(said) });
	const v = await bash($, `sh -c '${DELETE}'`);
	expect(v.decision).toBe("allow");
});
