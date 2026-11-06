import { expect, test } from "bun:test";
import { planExperiment } from "../../src/ab/ab.ts";
import type { Fixture } from "../../src/fixture/fixture.ts";
import { canaryFor, fit, inJson, judgePrompt, orderFor, outcome, parseGrades, pick, pWorse, replayCase, ruleBody, ruleDiff, ruleEvidence, tally } from "./rules.ts";

const f = (id: string, reply = "Done."): Fixture => ({
	id,
	prefix: [
		{ role: "user", content: "old ask" },
		{ role: "assistant", content: "old reply" },
		{ role: "user", content: "fix it" },
	],
	reply,
	userReply: "you broke the test",
	labels: {},
	source: "written",
});

test("replay seeds every turn but the last and mentions the project file in the prompt", () => {
	const c = replayCase(f("a"));
	expect(c.prefix.map((m) => m.content)).toEqual(["old ask", "old reply"]);
	expect(c.prompt).toBe("fix it\n\n@README.md");
});

test("rule evidence: wanted text must be present, the other arm's text absent", () => {
	const base = [{ name: "c.md", text: "---\npaths:\n  - \"**/*\"\n---\n\n<w>\nOne.\nTwo.\n</w>\n" }];
	const split = [{ name: "a.md", text: "---\npaths: x\n---\n\nOne.\n" }, { name: "b.md", text: "---\npaths: x\n---\n\nTwo.\n" }];
	expect(ruleBody(base[0]?.text ?? "")).toBe("<w>\nOne.\nTwo.\n</w>");
	const ev = ruleEvidence(split, base);
	expect(ev.forbid).toEqual([inJson("<w>\nOne.\nTwo.\n</w>")]);
	const good = [{ messages: [{ content: "One.\n\nTwo." }] }, { x: "One." }];
	expect(ruleDiff([{ m: "One." }, { m: "Two." }], ev)).toEqual([]);
	expect(ruleDiff([{ m: "One." }], ev)).toHaveLength(1);
	expect(ruleDiff([{ m: "One. Two. <w>\nOne.\nTwo.\n</w>" }], ev)).toHaveLength(1);
	expect(good).toHaveLength(2);
});

test("the order is fixed per case, covers every slot, and varies across cases", () => {
	expect(orderFor("a")).toEqual(orderFor("a"));
	expect([...orderFor("a")].sort()).toEqual(["baseline", "canary", "split"]);
	expect(new Set(Array.from({ length: 30 }, (_, i) => orderFor(`c${i}`).join())).size).toBeGreaterThan(3);
});

test("the judge prompt never names an arm and holds the user's next message", () => {
	const p = judgePrompt(f("a"), { baseline: "BASE", split: "SPLIT", canary: "CAN" });
	expect(p).toContain("<next_message>\nyou broke the test");
	expect(p).not.toMatch(/baseline|split|canary/);
	expect(p.indexOf('id="A"')).toBeLessThan(p.indexOf('id="C"'));
});

test("grades map back through the shuffle; a malformed answer is unreadable", () => {
	const order = orderFor("a");
	const g = parseGrades("Reading.\nA: good\nB: partial\nC: bad", "a");
	expect(g?.[order[0] ?? "split"]).toBe("good");
	expect(g?.[order[2] ?? "split"]).toBe("bad");
	expect(parseGrades("A: good\nB: ok\nC: bad", "a")).toBeUndefined();
	expect(outcome(undefined)).toBe("invalid");
});

test("outcome compares split with baseline and voids a case where the canary passes", () => {
	expect(outcome({ baseline: "partial", split: "good", canary: "bad" })).toBe("better");
	expect(outcome({ baseline: "good", split: "partial", canary: "bad" })).toBe("worse");
	expect(outcome({ baseline: "good", split: "good", canary: "partial" })).toBe("same");
	expect(outcome({ baseline: "good", split: "good", canary: "good" })).toBe("invalid");
});

test("the canary is another case's reply", () => {
	const all = [f("a", "AAA"), f("b", "BBB"), f("c", "CCC")];
	expect(canaryFor(all[0] as Fixture, all)).not.toBe("AAA");
	expect(canaryFor(all[0] as Fixture, all)).toBe(canaryFor(all[0] as Fixture, all));
});

test("sign test: 0 worse of 10 is not worse; 9 worse of 10 is", () => {
	expect(pWorse(10, 0)).toBe(1);
	expect(pWorse(1, 9)).toBeLessThan(0.05);
	expect(pWorse(5, 5)).toBeCloseTo(0.623, 2);
	expect(tally(["better", "same", "worse", "invalid"])).toMatchObject({ better: 1, same: 1, worse: 1, invalid: 1 });
	expect(tally(Array(9).fill("worse").concat("better")).verdict).toContain("worse than");
});

test("picking and fitting are deterministic and prefix-stable", () => {
	const all = Array.from({ length: 20 }, (_, i) => f(`c${i}`));
	expect(pick(all, 5).map((x) => x.id)).toEqual(pick(all, 8).slice(0, 5).map((x) => x.id));
	const k = fit(all, 100_000);
	expect(k).toBeGreaterThan(0);
	expect(k).toBeLessThan(20);
});

test("the plan bound follows each case's own bound", () => {
	const e = { name: "x", arms: [{ name: "a" }, { name: "b" }], cases: [{ name: "s", n: 10 }, { name: "l", n: 100 }], n: 1, parallel: 1, tokenBoundPerRun: 1000, boundOf: (c: { n: number }) => c.n };
	expect(planExperiment(e).tokenBound).toBe(220);
});
