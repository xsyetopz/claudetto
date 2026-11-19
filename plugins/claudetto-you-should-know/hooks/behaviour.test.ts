import type { EngineInterface } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { looksToSkipAfter, mayBeDriven, switchOf } from "./backoff";
import { parseExplanation } from "./cards";
import { fitLine, lineCellsAtMost } from "./fit";
import { proseMarkdown } from "./markdown";
import { isOffCommand } from "./off";
import { parseProposedLine, withKnown } from "./parse";
import { isCheckStep } from "./step";

describe("mayBeDriven", () => {
	let vars: Record<string, string> = {};
	const engine = () => ({ env: { get: async (n: string) => vars[n] } }) as unknown as EngineInterface;
	test("is false with none of the driver variables set", async () => {
		vars = {};
		expect(await mayBeDriven(engine())).toBe(false);
	});

	test("is true for a session kind, a job dir or a child session", async () => {
		for (const name of ["CLAUDE_CODE_SESSION_KIND", "CLAUDE_JOB_DIR", "CLAUDE_CODE_CHILD_SESSION"]) {
			vars = { [name]: "x" };
			expect(await mayBeDriven(engine())).toBe(true);
		}
	});

	test("CLAUDECODE alone is not enough, with the history skip it is", async () => {
		vars = { CLAUDECODE: "1" };
		expect(await mayBeDriven(engine())).toBe(false);
		vars = { CLAUDECODE: "1", CLAUDE_CODE_SKIP_PROMPT_HISTORY: "1" };
		expect(await mayBeDriven(engine())).toBe(true);
	});
});

describe("switchOf", () => {
	test("reads 1, true, yes, on in any case and trimmed; all else and failures are off", async () => {
		for (const v of ["1", "true", "YES", " On "]) {
			expect(await switchOf(Promise.resolve(v))).toBe(true);
		}
		for (const v of ["0", "no", "", "2"]) {
			expect(await switchOf(Promise.resolve(v))).toBe(false);
		}
		expect(await switchOf(Promise.resolve(undefined))).toBe(false);
		expect(await switchOf(Promise.reject(new Error("x")))).toBe(false);
	});
});

describe("looksToSkipAfter", () => {
	test("is 0,0,0 then 1,2,4,8 and caps at 16", () => {
		expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 20].map(looksToSkipAfter)).toEqual([0, 0, 0, 1, 2, 4, 8, 16, 16, 16]);
	});
});

describe("isCheckStep gating", () => {
	test("fires only on steps 3, 6 and 12 of 0..13", () => {
		const fired = Array.from({ length: 14 }, (_, i) => i).filter(isCheckStep);
		expect(fired).toEqual([3, 6, 12]);
	});
});

describe("isOffCommand", () => {
	test("takes the plugin's own name and the three builtin names, bare or at builtin", () => {
		const names = ["claudetto-you-should-know", "cc-plugin-you-should-know", "suggest-learning", "you-should-know"];
		for (const n of names) {
			expect(isOffCommand(`/plugin disable ${n}`)).toBe(true);
			expect(isOffCommand(`/plugin disable ${n}@builtin`)).toBe(true);
		}
	});

	test("refuses other plugins, other verbs and a missing name", () => {
		expect(isOffCommand("/plugin disable other")).toBe(false);
		expect(isOffCommand("/plugin enable you-should-know")).toBe(false);
		expect(isOffCommand("/plugin disable")).toBe(false);
		expect(isOffCommand("plugin disable you-should-know")).toBe(false);
	});
});

describe("withKnown", () => {
	test("drops a repeat in any case, and keeps the newest 50", () => {
		expect(withKnown(["Tests run in order."], "tests RUN in order.", 50)).toBeUndefined();
		const full = Array.from({ length: 50 }, (_, i) => `l${i}`);
		const next = withKnown(full, "new", 50);
		expect(next?.length).toBe(50);
		expect(next?.at(-1)).toBe("new");
		expect(next?.includes("l0")).toBe(false);
	});
});

describe("parseProposedLine edge cases", () => {
	test("reads a bullet, a quote-wrapped line and a dash tag", () => {
		const out = parseProposedLine("- learn: \"Cache is shared\"\n> tag - Heads up");
		expect(out).toEqual(expect.objectContaining({ kind: "line", tag: "Heads up" }));
	});

	test("reads a continuation line of learn", () => {
		const out = parseProposedLine("learn: First part\nsecond part.\ntag: You should know");
		expect(out).toEqual(expect.objectContaining({ kind: "line", line: "First part second part." }));
	});

	test("treats none, with punctuation, as declined", () => {
		for (const r of ["none", "None.", "learn: none"]) {
			expect(parseProposedLine(r).kind).not.toBe("line");
		}
	});
});

describe("parseExplanation", () => {
	test("clips a long caption at a word with an ellipsis", () => {
		const long = `**T**\n${"word ".repeat(1500)}`;
		const cards = parseExplanation(long);
		const lead = cards[0]?.lead ?? "";
		expect(lead.length).toBeLessThanOrEqual(4001);
		expect(lead.endsWith("…")).toBe(true);
	});

	test("starts a new card on a second fence and drops blank prose", () => {
		const cards = parseExplanation("```\na\n```\n\n```\nb\n```");
		expect(cards.length).toBe(2);
	});

	test("keeps at most 12 sketch lines and a title of a card with a line feed", () => {
		const text = `**T**\n\`\`\`\n${Array.from({ length: 20 }, (_, i) => `r${i}`).join("\n")}\n\`\`\``;
		expect(parseExplanation(text)[0]?.sketch.length).toBe(12);
	});
});

describe("display width", () => {
	test("counts narrow ranges as 1 and wide glyphs as 2, and fits with an ellipsis", () => {
		expect(lineCellsAtMost("ab→─")).toBe(4);
		expect(lineCellsAtMost("漢")).toBe(2);
		expect(lineCellsAtMost("◽")).toBe(2);
		expect(fitLine("abcdefgh", 5)).toBe("abcd…");
		expect(fitLine("abc", 5)).toBe("abc");
	});
});

describe("proseMarkdown", () => {
	test("escapes specials, turns markers into dashes and ends with a blank line", () => {
		const out = proseMarkdown("* one\n* two\nplain *x*", "A_B");
		expect(out.startsWith("**A\\_B**")).toBe(true);
		expect(out).toContain("- one");
		expect(out).toContain("\\*x\\*");
		expect(out.endsWith("\n\n")).toBe(true);
	});

	test("gives empty output for empty input", () => {
		expect(proseMarkdown("", "")).toBe("");
	});
});
