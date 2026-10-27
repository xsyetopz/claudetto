// `tools/findings-check.ts` fails while a row of `findings.md` has no passed check (D38).

import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { write as bunWrite } from "bun";
import { openRows } from "../../tools/findings-check.ts";
import { REPO } from "../support/repo.ts";
import { spawnText } from "./fixture-repo.ts";

const HEAD =
	"| Surface | Fault | Source | Task | Check |\n| --- | --- | --- | --- | --- |\n";
const OPEN = `${HEAD}| \`a\` | none found | lab | none | \`just lab\` |\n| \`b\` | a fault | test | 3.4 | \`just lab\` |\n`;
const CLOSED = `${HEAD}| \`a\` | none found | lab | none | \`just lab\` |\n| \`b\` | a fault | test | 3.4, done in \`abc\` | \`just lab\` |\n| \`c\` | a fault | test | 5.1 (checked) | \`just lab\` |\n`;

test("`openRows` names a row whose task is not done", () => {
	expect(openRows(OPEN)).toEqual([{ line: 4, surface: "`b`", task: "3.4" }]);
});

test("`openRows` finds no row when each task is `none`, done, or checked", () => {
	expect(openRows(CLOSED)).toEqual([]);
});

test("`openRows` names a row whose task says `not done`", () => {
	const row = `${HEAD}| \`b\` | a fault | test | 3.4, not done | \`just lab\` |\n`;
	expect(openRows(row)).toHaveLength(1);
});

test("`openRows` accepts a task list before `done`", () => {
	const row = `${HEAD}| \`b\` | a fault | test | 7.10, 7.11, done in \`abc\` | \`just lab\` |\n`;
	expect(openRows(row)).toEqual([]);
});

const run = async (findings: string) => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "findings-"));
	const file = path.join(dir, "findings.md");
	try {
		await bunWrite(file, findings);
		return await spawnText(
			process.execPath,
			[path.join(REPO, "tools/findings-check.ts"), file],
			{ cwd: REPO },
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
};

test("the tool exits 1 on a fixture with an open row", async () => {
	const result = await run(OPEN);
	expect(result.status).toBe(1);
	expect(result.stderr).toContain("findings.md:4:");
});

test("the tool exits 0 on a fixture with no open row", async () => {
	expect((await run(CLOSED)).status).toBe(0);
});
