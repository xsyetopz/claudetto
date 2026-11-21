import { describe, expect, test } from "claude-code/testing";

import {
	answerNote,
	NOT_A_GRANT,
	registerAnswerNote,
	splitAnswer
} from "../answers";

const INPUT = {
	questions: [
		{
			question: "How big a budget?",
			header: "Budget",
			multiSelect: false,
			options: [
				{ label: "Small", description: "Up to 50 files" },
				{ label: "Large", description: "Up to 500 files" }
			]
		},
		{
			question: "Which checks?",
			header: "Checks",
			multiSelect: true,
			options: [
				{ label: "Lint", description: "oxlint" },
				{ label: "Types, strict", description: "tsc" },
				{ label: "Tests", description: "bun test" }
			]
		}
	]
};

const ANSWERED = {
	questions: INPUT.questions,
	answers: {
		"How big a budget?": "Small",
		"Which checks?": "Lint, Types, strict"
	}
};

describe("REQ-REPLY-147 answer note", () => {
	test("splitAnswer reads a label, a multi-select join and typed text", () => {
		const labels = ["Lint", "Types, strict", "Tests"];
		expect(splitAnswer("Lint", labels)).toEqual({
			selected: ["Lint"],
			typed: ""
		});
		expect(splitAnswer("Lint, Types, strict", labels)).toEqual({
			selected: ["Types, strict", "Lint"],
			typed: ""
		});
		expect(splitAnswer("about 70 files", labels)).toEqual({
			selected: [],
			typed: "about 70 files"
		});
		expect(splitAnswer("Lint, and also docs", labels)).toEqual({
			selected: [],
			typed: "Lint, and also docs"
		});
	});

	test("lists the selected labels per question and the reminder", () => {
		const note = answerNote(INPUT, ANSWERED);
		expect(note).toContain('- Budget: selected "Small"');
		expect(note).toContain('- Checks: selected "Types, strict", "Lint"');
		expect(note).toContain(NOT_A_GRANT);
		expect(NOT_A_GRANT.length).toBeLessThanOrEqual(300);
	});

	test("reports typed text and the free-text response", () => {
		const note = answerNote(INPUT, {
			answers: { "How big a budget?": "about 70 files" },
			response: "  keep it small  "
		});
		expect(note).toContain('- Budget: typed "about 70 files"');
		expect(note).toContain('- free text: typed "keep it small"');
	});

	test("returns nothing when the response holds no answer", () => {
		expect(answerNote(INPUT, { answers: {} })).toBeUndefined();
		expect(answerNote(INPUT, "rejected")).toBeUndefined();
	});

	test("the hook adds the note for AskUserQuestion", async ($, on) => {
		on("classic.PostToolUse", () => ({}));
		registerAnswerNote(on);
		const result = await $.classic.PostToolUse({
			tool_name: "AskUserQuestion",
			tool_input: INPUT,
			tool_response: ANSWERED,
			tool_use_id: "u1"
		});
		expect(JSON.stringify(result)).toContain(NOT_A_GRANT);
	});

	test("the hook adds nothing for another tool", async ($, on) => {
		on("classic.PostToolUse", () => ({}));
		registerAnswerNote(on);
		const result = await $.classic.PostToolUse({
			tool_name: "Read",
			tool_input: {},
			tool_response: ANSWERED,
			tool_use_id: "u2"
		});
		expect(JSON.stringify(result)).not.toContain(NOT_A_GRANT);
	});
});
