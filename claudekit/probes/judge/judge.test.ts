import { expect, test } from "bun:test";
import type { Fixture } from "../../src/fixture/fixture.ts";
import { casePrompt, parseAnswer, sample } from "./judge.ts";

const f = (id: string, reply = "Done."): Fixture => ({
	id,
	prefix: [
		{ role: "user", content: "old" },
		{ role: "user", content: "fix it" },
	],
	reply,
	userReply: "you did not run the test",
	labels: {},
	source: "written",
});

test("parses the reading first and a label on the last line; anything else is unparsed", () => {
	expect(parseAnswer("The test was not run.\ncomplaint")).toEqual({ label: "complaint", reading: "The test was not run." });
	expect(parseAnswer("ok")).toEqual({ label: "ok", reading: "" });
	expect(parseAnswer("The user asked for a merge.\nComplaint: no.").label).toBe("unparsed");
	expect(parseAnswer("complaint\nThe user asked for a merge, which is not an objection.").label).toBe("unparsed");
});

test("the case prompt holds the last ask, the reply, and the user's message, and cuts a long reply from the front", () => {
	const p = casePrompt(f("a", `${"x".repeat(30_000)}END`));
	expect(p).toContain("<ask>\nfix it\n</ask>");
	expect(p).not.toContain("old");
	expect(p).toContain("[10003 characters cut]");
	expect(p).toContain("END\n</reply>");
	expect(p).toContain("<next_message>\nyou did not run the test\n</next_message>");
});

test("the sample is the same for the same set, whatever its order", () => {
	const set = Array.from({ length: 50 }, (_, i) => f(`s:${i}`));
	const one = sample(set, 10).map((x) => x.id);
	expect(one).toHaveLength(10);
	expect(sample([...set].reverse(), 10).map((x) => x.id)).toEqual(one);
	expect(one).not.toEqual(set.slice(0, 10).map((x) => x.id));
});
