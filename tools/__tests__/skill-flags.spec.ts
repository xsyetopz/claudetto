import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	MANUAL_KEY,
	pageShips,
	parseSkillRows,
	readShippingSkills,
	readSkillFiles,
	readSkillRows,
	SKILL_HEADING,
	shippingFaults,
	skillFaults,
} from "../skill-flags.ts";

const page = (rows: string): string =>
	`${SKILL_HEADING}\n\nSome prose.\n\n| Skill | Model may call | Reason |\n| --- | --- | --- |\n${rows}\n\nMore prose.\n`;

const manual = { skill: "setup", manual: true };
const callable = { skill: "dedupe", manual: false };

describe("the skill table of the page", () => {
	test("a row reads as the skill, the flag, and the reason", () => {
		const rows = parseSkillRows(
			page("| `setup` | no | The user runs it by name |"),
		);

		expect(rows).toEqual([
			{
				skill: "setup",
				modelMayCall: false,
				reason: "The user runs it by name",
			},
		]);
	});

	test("a page with no such table has no rows", () => {
		const text = `# Other Page

No table here.
`;

		expect(parseSkillRows(text)).toEqual([]);
	});
});

describe("the shipped skill set", () => {
	test("each shipped skill agrees with the table of the page", async () => {
		const faults = skillFaults(await readSkillRows(), await readSkillFiles());

		expect(faults).toEqual([]);
	});
});

describe("the decision pages say which skills ship", () => {
	const ours = (decision: string): string =>
		`SKILL: x\nSET: ours\nRECOMMENDATION: name-only\n${decision}\n`;

	test("a skill of ours with a keep recommendation ships", () => {
		const text = `SKILL: x
SET: ours
RECOMMENDATION: keep
`;

		expect(pageShips(text)).toBe(true);
	});

	test("a user decision of drop outranks a recommendation of name-only", () => {
		expect(pageShips(ours("USER DECISION: drop (the user, 2026-10-27)"))).toBe(
			false,
		);
	});

	test("a user decision of keep outranks a recommendation of drop", () => {
		const text = `SET: ours
RECOMMENDATION: DROP, set by the user
USER DECISION: keep (the user)
`;

		expect(pageShips(text)).toBe(true);
	});

	test("a bundled skill never ships from this tree", () => {
		const text = `SET: bundled
RECOMMENDATION: keep
`;

		expect(pageShips(text)).toBe(false);
	});

	test("a tree with no skill is a fault for each skill that ships", () => {
		expect(shippingFaults(["dedupe"], [])).toEqual([
			"dedupe ships by its decision page in docs/keep/skills and has no plugins/claudetto/skills/dedupe/SKILL.md",
		]);
	});

	test("a shipping skill that is in the tree is no fault", () => {
		expect(shippingFaults(["dedupe"], [callable])).toEqual([]);
	});
});

describe("the decision pages of the repo", () => {
	test("each skill they mark as shipping is in the tree", async () => {
		const faults = shippingFaults(
			await readShippingSkills(),
			await readSkillFiles(),
		);

		expect(faults).toEqual([]);
	});

	test("the pages mark dedupe as shipping", async () => {
		expect(await readShippingSkills()).toContain("dedupe");
	});
});

describe("the check names each fault of a skill", () => {
	test("a manual skill with the flag and a callable skill without it pass", () => {
		const rows = parseSkillRows(
			page(
				`| \`setup\` | no | The user runs it |
| \`dedupe\` | yes | The model starts it after a change |`,
			),
		);

		expect(skillFaults(rows, [callable, manual])).toEqual([]);
	});

	test("a skill with no row", () => {
		const faults = skillFaults([], [manual]);

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain(
			`setup has no row in the table "${SKILL_HEADING}"`,
		);
	});

	test("a row with no reason", () => {
		const rows = parseSkillRows(page("| `setup` | no |  |"));

		expect(skillFaults(rows, [manual])).toEqual([
			"setup has a row with no reason",
		]);
	});

	test("a manual skill that does not set the flag", () => {
		const rows = parseSkillRows(page("| `setup` | no | The user runs it |"));

		expect(skillFaults(rows, [{ skill: "setup", manual: false }])).toEqual([
			`setup is a skill the model need not call, and its SKILL.md does not set ${MANUAL_KEY}`,
		]);
	});

	test("a callable skill that sets the flag", () => {
		const rows = parseSkillRows(
			page("| `dedupe` | yes | The model starts it |"),
		);

		expect(skillFaults(rows, [{ skill: "dedupe", manual: true }])).toEqual([
			`dedupe is a skill the model may call, and its SKILL.md sets ${MANUAL_KEY}`,
		]);
	});

	test("a row whose skill file does not exist", () => {
		const rows = parseSkillRows(page("| `gone` | no | The user runs it |"));

		expect(skillFaults(rows, [])).toEqual([
			"gone has a row and no plugins/claudetto/skills/gone/SKILL.md",
		]);
	});
});

describe("the flag is read from the file", () => {
	let root = "";

	beforeAll(async () => {
		root = await mkdtemp("/tmp/claudetto-skills-");
		await mkdir(join(root, "one"), { recursive: true });
		await mkdir(join(root, "two"), { recursive: true });
		await writeFile(
			join(root, "one", "SKILL.md"),
			`---\nname: one\ndescription: x\n${MANUAL_KEY}\n---\n\nBody.\n`,
		);
		await writeFile(
			join(root, "two", "SKILL.md"),
			`---
name: two
description: x
---

Body.
`,
		);
	});

	afterAll(async () => {
		await rm(root, { recursive: true, force: true });
	});

	test("each folder is one skill, with the flag it carries", async () => {
		expect(await readSkillFiles(root)).toEqual([
			{ skill: "one", manual: true },
			{ skill: "two", manual: false },
		]);
	});

	test("a folder that is not there is an empty skill set", async () => {
		expect(await readSkillFiles(join(root, "no-such"))).toEqual([]);
	});
});
