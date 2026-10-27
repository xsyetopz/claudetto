// The Jev stage of the `tool.check` handler: a sure yes allows an `ask`, and any other answer leaves it to a person (task 5.1a, 10.15).

import { beforeEach, expect, test } from "bun:test";
import { keepOptions } from "../../../plugins/claudetto/kernel/options.ts";
import { JEV_YES_MIN } from "../../../plugins/claudetto/modules/gate/limits.ts";
import { ATTEMPT_TIMEOUT_MS } from "../../../plugins/claudetto/modules/jev/limits.ts";
import {
	answerOf,
	check,
	type Fetch,
	jevFake,
	modelOf,
	type Reply,
	said,
	sure,
} from "./engine-fake.ts";

// A test that needs the classifier stage turns it on, so no other test depends on a fault of the stage.
beforeEach(() => keepOptions({ classifier: "off" }));

test("Jev Is Sure: a confident yes allows the `git` loss, and the reason carries the `P(yes)` value", async () => {
	keepOptions({ decide: "jev" });
	const runs: (readonly string[])[] = [];
	const fetches: Fetch[] = [];
	const v = await check(
		"git clean -fd",
		{ decision: "ask" },
		jevFake("k", sure, runs, fetches),
	);
	const { reason, ...rest } = v;
	expect(rest).toStrictEqual({ decision: "allow" });
	expect(reason).toContain("0.93");
	expect(runs.every((r) => r[0] === "git")).toBe(true);
	expect(fetches).toHaveLength(1);
	expect(fetches[0]?.url).toBe("https://api.typesafe.ai/v1/systemone");
	expect(fetches[0]?.init?.headers?.["authorization"]).toBe("Bearer k");
	const body = JSON.parse(fetches[0]?.init?.body ?? "{}");
	expect(body.state).toContain("git clean -fd");
	expect(body.questions.q.type).toBe("noul");
	expect(fetches[0]?.init?.body).not.toContain('"k"');
});

// The floor is `JEV_YES_MIN` of 0.8, above the 0.7 of `primitives-noul.md`, because a false yes loses files (the user, 2026-10-23: "follow typesafe's guidelines/best practices").
test("Jev Is Sure: a yes at `JEV_YES_MIN` allows the call", async () => {
	keepOptions({ decide: "jev" });
	const v = await check(
		"git clean -fd",
		{ decision: "ask" },
		jevFake("k", answerOf(JEV_YES_MIN)),
	);
	expect(v).toMatchObject({ decision: "allow" });
});

for (const [name, key, decide, jev] of [
	["a yes under the bound", "k", "jev", answerOf(0.79)],
	["a no", "k", "jev", answerOf(0.05)],
	["a failed call", "k", "jev", answerOf(0.9, 500)],
	[
		"a call that throws",
		"k",
		"jev",
		() => Promise.reject(new Error("timeout")),
	],
	["no key", undefined, "jev", sure],
	["the option `off`", "k", "off", sure],
] as const) {
	test(`Jev Is Not Sure: ${name} asks a person, so the dialog shows no always-allow row`, async () => {
		keepOptions({ decide, classifier: "off" });
		const v = await check(
			"git clean -fd",
			{ decision: "allow" },
			jevFake(key, jev),
		);
		expect(v).toMatchObject({ decision: "ask", decider: "person" });
		expect(v).not.toHaveProperty("jev");
	});
}

test("Timeout: a call that never answers ends at `ATTEMPT_TIMEOUT_MS` with no retry, and a person decides", async () => {
	keepOptions({ decide: "jev", classifier: "off" });
	const slept: number[] = [];
	const fetches: Fetch[] = [];
	const $ = {
		...jevFake("k", () => new Promise<Reply>(() => undefined), [], fetches),
		clock: {
			now: async () => 0,
			sleep: async (ms: number) => {
				slept.push(ms);
			},
		},
	};
	const v = await check("git clean -fd", { decision: "allow" }, $);
	expect(v).toMatchObject({ decision: "ask", decider: "person" });
	expect(slept).toStrictEqual([ATTEMPT_TIMEOUT_MS]);
	expect(fetches).toHaveLength(1);
});

test("Any Ask: a forced push goes to Jev too, and a sure yes needs no model call", async () => {
	keepOptions({ decide: "jev" });
	const fetches: Fetch[] = [];
	const asked: Record<string, unknown>[] = [];
	const $ = {
		...jevFake("k", sure, [], fetches),
		model: modelOf(said("<block>no</block>"), asked),
	};

	const v = await check("git push --force", { decision: "allow" }, $);

	expect(v.decision).toBe("allow");
	expect(fetches).toHaveLength(1);
	expect(asked).toStrictEqual([]);
});
