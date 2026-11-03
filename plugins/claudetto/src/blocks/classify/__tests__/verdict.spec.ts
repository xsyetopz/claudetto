import { expect, test } from "bun:test";
import type { ModelCompleteResult } from "claude-code";
import {
	frameFault,
	secondLook,
	verdictOf,
	verdictRequest,
} from "../verdict.ts";

const USAGE = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
} as const;

const reply = (text: string): ModelCompleteResult => ({
	isAnswered: true,
	text,
	usage: USAGE,
});

test("a block names the rule and the reason in two sentences, with no chain of colons", () => {
	const v = verdictOf(
		reply(`<block>yes</block>
<rule>Weaken a Guard</rule>
<reason>the edit removes the ask on \`git -c\` keys.</reason>`),
	);

	expect(v).toStrictEqual({
		deny: "The claudetto classifier blocked this call under the rule Weaken a Guard. The edit removes the ask on `git -c` keys.",
	});
});

test("a block with no rule gives the reason alone, and ends it with a period", () => {
	const v = verdictOf(
		reply(`<block>yes</block>
<reason>the target is unknown</reason>`),
	);

	expect(v).toStrictEqual({
		deny: "The claudetto classifier blocked this call. The target is unknown.",
	});
});

test("a reply with no text blocks and says the model replied with none", () => {
	const v = verdictOf({
		isAnswered: false,
		reason: "empty-reply",
		usage: USAGE,
	});

	expect(v).toStrictEqual({
		deny: "The claudetto classifier blocked this call. The model replied with no text, so no verdict was reached.",
	});
});

test("an empty reply that spent the whole cap on thinking says it was cut, not that the model gave nothing", () => {
	const v = verdictOf({
		isAnswered: false,
		reason: "empty-reply",
		usage: { ...USAGE, output_tokens: 3048 },
	});

	expect(v).toStrictEqual({
		deny: "The claudetto classifier blocked this call. The model spent all 3048 output tokens on thinking and wrote no text, so no verdict was reached.",
	});
});

test("an API error blocks and names its status and kind", () => {
	const v = verdictOf({
		isAnswered: false,
		reason: "api-error",
		status: 529,
		error: "overloaded",
		usage: USAGE,
	});

	expect(v).toStrictEqual({
		deny: "The claudetto classifier blocked this call. The model call failed with HTTP 529 (`overloaded`), so no verdict was reached.",
	});
});

test("an API error with no response says so", () => {
	const v = verdictOf({
		isAnswered: false,
		reason: "api-error",
		status: null,
		error: "unknown",
		usage: USAGE,
	});

	expect(v).toStrictEqual({
		deny: "The claudetto classifier blocked this call. The model call failed with no response (`unknown`), so no verdict was reached.",
	});
});

test("a cut call blocks and names the time limit", () => {
	const v = verdictOf({ isAnswered: false, reason: "aborted", usage: USAGE });

	expect(v).toStrictEqual({
		deny: "The claudetto classifier blocked this call. The model call was cut by an abort or the 30-second limit, so no verdict was reached.",
	});
});

test("the `haiku` verdict asks for `medium` effort, since its thinking cannot be turned off and at `high` it can fill the reply cap with no text", () => {
	const r = verdictRequest("haiku", "", "Bash {}");

	expect(r).toMatchObject({ model: "claude-haiku-5-5", effort: "medium" });
});

test("`no` allows", () => {
	expect(verdictOf(reply("<block>no</block>"))).toStrictEqual({ allow: true });
});

test("a block under a rule of a block list keeps the frame", () => {
	expect(
		frameFault(
			reply(
				"<reason>the push targets main</reason><rule>Destroy Work</rule><block>yes</block>",
			),
		),
	).toBeUndefined();
});

test("an allow keeps the frame", () => {
	expect(frameFault(reply("<block>no</block>"))).toBeUndefined();
});

test("a block under no rule breaks the frame, since a call no rule matches is allowed", () => {
	expect(
		frameFault(
			reply(
				"<reason>the action only reads a test file and changes nothing</reason><block>yes</block>",
			),
		),
	).toBe("it blocks under no rule");
});

test("a block under a rule of the allow list breaks the frame", () => {
	expect(
		frameFault(
			reply(
				"<reason>read-only</reason><rule>Local Work</rule><block>yes</block>",
			),
		),
	).toBe("it blocks under Local Work, which is on neither block list");
});

test("a reply with no verdict breaks the frame", () => {
	expect(frameFault(reply("<reason>fine</reason>"))).toBe(
		"it holds no verdict",
	);
});

test("an unanswered call is no frame fault, since asking again cannot mend an outage", () => {
	expect(
		frameFault({ isAnswered: false, reason: "aborted", usage: USAGE }),
	).toBeUndefined();
});

test("the second look keeps the request and adds the first reply and its fault", () => {
	const first = verdictRequest("haiku", "User: hi", "Bash {}");
	const again = secondLook(
		first,
		"<block>yes</block>",
		"it blocks under no rule",
	);

	expect(again).toMatchObject({
		model: first.model,
		effort: first.effort,
		system: first.system,
	});
	expect(again.prompt.startsWith(first.prompt)).toBe(true);
	expect(again.prompt).toContain(`<first_reply>
<block>yes</block>
</first_reply>`);
	expect(again.prompt).toContain("it blocks under no rule");
});
