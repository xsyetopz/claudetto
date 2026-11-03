// `/claudetto:setup` offers the general rules as a marked section of the user's `CLAUDE.md`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
	userSettingsLab,
	type Written,
} from "../../src/blocks/__tests__/lab-support.ts";
import {
	GENERAL_RULES,
	GENERAL_SECTION,
	SECTION_END,
	SECTION_START,
} from "../../src/blocks/general-rules/rules.ts";
import {
	APPEND,
	GENERAL_RULES_ID,
	REPLACE,
} from "../../src/blocks/setup-command/general-rules.ts";
import { answering, processResult, run } from "./support.ts";

const USER_MD = "/home/u/.claude/CLAUDE.md";

/** A home whose settings file is `{}` and whose `CLAUDE.md` holds `userMd`, or is absent. */
const lab = (on: On, userMd: string | undefined): readonly Written[] => {
	on("process.run", () => processResult("Darwin\n", 0));
	return userSettingsLab(on, "{}", undefined, new Map([[USER_MD, userMd]]));
};

/** The question that asks whether to append the section or replace the whole file. */
const isHowQuestion = (question: string): boolean =>
	question.includes(APPEND) && question.includes(REPLACE);

/**
 * Keeps `GENERAL_RULES_ID` when `keep` and it is offered, answers the append or replace question with `how`,
 * and nothing otherwise; returns the questions asked.
 */
const answeringRules = (on: On, keep: boolean, how = APPEND): string[] => {
	const asked: string[] = [];
	answering(on, asked, (question) => {
		if (isHowQuestion(question)) {
			return how;
		}
		return keep && question.includes(`- ${GENERAL_RULES_ID}:`)
			? GENERAL_RULES_ID
			: "";
	});
	return asked;
};

const userMdWrites = (files: readonly Written[]): readonly Written[] =>
	files.filter((file) => file.path === USER_MD);

test("the dialog shows the exact text of the rules before anything is written", async ($: Engine, on: On) => {
	lab(on, undefined);
	const asked = answeringRules(on, false);

	await run($);

	const dialog = asked.find((q) => q.includes(`- ${GENERAL_RULES_ID}:`));
	expect(dialog).toContain(GENERAL_RULES);
});

test("no yes writes nothing to `CLAUDE.md`", async ($: Engine, on: On) => {
	const files = lab(on, "# Mine\n");
	answeringRules(on, false);

	await run($);

	expect(userMdWrites(files)).toEqual([]);
});

const HELD = `# Mine

Keep this.
`;

test("a yes appends the section and keeps the text the file held", async ($: Engine, on: On) => {
	const files = lab(on, HELD);
	answeringRules(on, true);

	const text = await run($);

	expect(userMdWrites(files)).toEqual([
		{ path: USER_MD, text: `${HELD}\n${GENERAL_SECTION}\n` },
	]);
	expect(text).toContain(`Wrote ${USER_MD}.`);
});

test("a yes with no `CLAUDE.md` writes the section alone, without asking to append or replace", async ($: Engine, on: On) => {
	const files = lab(on, undefined);
	const asked = answeringRules(on, true);

	await run($);

	expect(asked.some(isHowQuestion)).toBe(false);
	expect(userMdWrites(files)).toEqual([
		{ path: USER_MD, text: `${GENERAL_SECTION}\n` },
	]);
});

test("a re-run replaces only its own older section and keeps the text around it", async ($: Engine, on: On) => {
	const old = `${SECTION_START}\nAn older rule.\n${SECTION_END}`;
	const files = lab(on, `# Mine\n\n${old}\n\nAfter.\n`);
	answeringRules(on, true);

	await run($);

	expect(userMdWrites(files)).toEqual([
		{ path: USER_MD, text: `# Mine\n\n${GENERAL_SECTION}\n\nAfter.\n` },
	]);
});

test("a `CLAUDE.md` that already holds the shipped section is not offered", async ($: Engine, on: On) => {
	const files = lab(on, `# Mine\n\n${GENERAL_SECTION}\n`);
	const asked = answeringRules(on, true);

	await run($);

	expect(asked.some((q) => q.includes(`- ${GENERAL_RULES_ID}:`))).toBe(false);
	expect(userMdWrites(files)).toEqual([]);
});

test("a yes with a `CLAUDE.md` that holds other text asks to append or replace, and shows the exact section", async ($: Engine, on: On) => {
	lab(on, HELD);
	const asked = answeringRules(on, true);

	await run($);

	expect(asked.find(isHowQuestion)).toContain(GENERAL_SECTION);
});

test("a replace writes the section alone in place of the text the file held", async ($: Engine, on: On) => {
	const files = lab(on, HELD);
	answeringRules(on, true, REPLACE);

	const text = await run($);

	expect(userMdWrites(files)).toEqual([
		{ path: USER_MD, text: `${GENERAL_SECTION}\n` },
	]);
	expect(text).toContain(`Wrote ${USER_MD}.`);
});

test("a dismissed append or replace question writes nothing to `CLAUDE.md`", async ($: Engine, on: On) => {
	const files = lab(on, HELD);
	answering(on, [], (question) => {
		if (isHowQuestion(question)) {
			throw new Error("dismissed");
		}
		return question.includes(`- ${GENERAL_RULES_ID}:`) ? GENERAL_RULES_ID : "";
	});

	await run($);

	expect(userMdWrites(files)).toEqual([]);
});
