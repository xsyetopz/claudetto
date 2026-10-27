// The classifier stage of the `tool.check` and `classic.PermissionRequest` handlers: the model allows or blocks an `ask`, a fault leaves it to a person, and a streak of denials trips the breaker.

import { beforeEach, expect, test } from "bun:test";
import { keepOptions } from "../../../plugins/claudetto/kernel/options.ts";
import { onPermission } from "../../../plugins/claudetto/modules/gate/adapters/mod.ts";
import {
	CLASSIFIER_MODEL,
	CLASSIFIER_STREAK_MAX,
} from "../../../plugins/claudetto/modules/gate/limits.ts";
import { check, classifierFake, isHandler, said } from "./engine-fake.ts";

// A test that needs the classifier stage turns it on, so no other test depends on a fault of the stage.
beforeEach(() => keepOptions({ classifier: "off" }));

test("Classifier Allows: the model allows an `ask` at the `high` effort, and its prompt holds the call and the newest request of the user", async () => {
	keepOptions({});
	const asked: Record<string, unknown>[] = [];
	const $ = classifierFake(
		said("<block>no</block><reason>The user asked for the push.</reason>"),
		asked,
		["force-push the rebased branch"],
	);

	const v = await check("git push --force", { decision: "allow" }, $);

	expect(v.decision).toBe("allow");
	expect(v.reason).toContain("The user asked for the push.");
	expect(asked).toMatchObject([{ model: CLASSIFIER_MODEL, effort: "high" }]);
	const prompt = String(asked[0]?.["prompt"]);
	expect(prompt).toContain("git push --force");
	expect(prompt).toContain("force-push the rebased branch");
});

test("Classifier Blocks: a `yes` block denies the call with the reason of the model", async () => {
	keepOptions({});
	const $ = classifierFake(
		said("<block>yes</block><reason>No request names a forced push.</reason>"),
	);

	const v = await check("git push --force", { decision: "allow" }, $);

	expect(v.decision).toBe("deny");
	expect(v.reason).toContain("No request names a forced push.");
});

for (const [name, reply] of [
	[
		"an API error",
		async () => ({
			isAnswered: false,
			reason: "api-error",
			status: 529,
			error: "overloaded",
			usage: {},
		}),
	],
	[
		"an empty reply",
		async () => ({ isAnswered: false, reason: "empty-reply", usage: {} }),
	],
	["a text with no block", said("I think it is fine.")],
	["a text with two blocks", said("<block>no</block><block>yes</block>")],
	["a call that throws", () => Promise.reject(new Error("down"))],
] as const) {
	test(`Classifier Fault: ${name} leaves the \`ask\` to a person`, async () => {
		keepOptions({});

		const v = await check(
			"git push --force",
			{ decision: "allow" },
			classifierFake(reply),
		);

		expect(v).toMatchObject({ decision: "ask", decider: "person" });
	});
}

test("Classifier Off: the option `off` sends no request, and a person decides", async () => {
	keepOptions({ classifier: "off" });
	const asked: Record<string, unknown>[] = [];

	const v = await check(
		"git push --force",
		{ decision: "allow" },
		classifierFake(said("<block>no</block>"), asked),
	);

	expect(v).toMatchObject({ decision: "ask", decider: "person" });
	expect(asked).toStrictEqual([]);
});

test("Breaker: after `CLASSIFIER_STREAK_MAX` denials in a row the next `ask` goes to a person with no request, and the one after goes to the model again", async () => {
	keepOptions({});
	const asked: Record<string, unknown>[] = [];
	const $ = classifierFake(
		said("<block>yes</block><reason>No.</reason>"),
		asked,
	);

	const decisions = await Array.fromAsync(
		{ length: CLASSIFIER_STREAK_MAX + 2 },
		async (_, i) =>
			(await check(`git push --force origin b${i}`, { decision: "allow" }, $))
				.decision,
	);

	expect(decisions).toStrictEqual([
		...new Array<string>(CLASSIFIER_STREAK_MAX).fill("deny"),
		"ask",
		"deny",
	]);
	expect(asked).toHaveLength(CLASSIFIER_STREAK_MAX + 1);
});

test("One Call, One Classification: `classic.PermissionRequest` of the same call reads the verdict of `tool.check`", async () => {
	keepOptions({});
	const asked: Record<string, unknown>[] = [];
	const $ = classifierFake(
		said("<block>no</block><reason>Asked.</reason>"),
		asked,
	);
	const input = { command: "git push --force" };
	if (!isHandler<unknown[], Promise<{ decision?: unknown }>>(onPermission)) {
		throw new Error("`onPermission` is not a function");
	}

	await check(input.command, { decision: "allow" }, $);
	const answer = await onPermission(
		$,
		{ tool_name: "Bash", tool_input: input },
		async () => ({}),
	);

	expect(answer.decision).toStrictEqual({ behavior: "allow" });
	expect(asked).toHaveLength(1);
});

test("Classifier Blocks: `classic.PermissionRequest` gets a `deny` with the reason", async () => {
	keepOptions({});
	const $ = classifierFake(
		said("<block>yes</block><reason>Not asked.</reason>"),
	);
	if (
		!isHandler<
			unknown[],
			Promise<{ decision?: { behavior: string; message?: string } }>
		>(onPermission)
	) {
		throw new Error("`onPermission` is not a function");
	}

	const answer = await onPermission(
		$,
		{ tool_name: "Bash", tool_input: { command: "git push --force" } },
		async () => ({}),
	);

	expect(answer.decision?.behavior).toBe("deny");
	expect(answer.decision?.message).toContain("Not asked.");
});
