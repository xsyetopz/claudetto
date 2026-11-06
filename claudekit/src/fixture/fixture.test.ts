import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tempDir } from "../shared/temp.ts";
import { fixtureCommand } from "./command.ts";
import { type Fixture, gradeHeldOut, loadFixtures, parseSet } from "./fixture.ts";

const SECRET = "SECRET-CASE-TEXT-4b1e";
const FIXTURE_TS = join(import.meta.dir, "fixture.ts");
const MISSING_USER_REPLY = /fixture 1: userReply: want a non-empty string/;
const BAD_SOURCE = /source "somewhere": want path:line or "written"/;
const REPEATED = /repeated ids: \["a"\]/;
const GRADER_FAILED = /grader failed on case 1 of 3/;
const UNKNOWN = /fixture command "nope": unknown/;

const good = (id: string, reply: string): Fixture => ({
	id,
	prefix: [{ role: "user", content: "Is the test green?" }],
	reply,
	userReply: "Thanks.",
	labels: { tone: "plain" },
	source: "written",
});

const SET = {
	name: "held",
	heldOut: true,
	fixtures: [good("a", `Done. ${SECRET}`), good("b", `Sorry. ${SECRET}`), good("c", `Done. ${SECRET}`)],
};

const GRADER = `export default {
	name: "done",
	fixtures: { good: [], bad: [] },
	grade(f) {
		console.log(f.reply);
		console.error(f.userReply, f.prefix);
		return { pass: f.reply.startsWith("Done"), label: f.reply.startsWith("Done") ? "ok" : "apology", evidence: f.reply };
	},
};`;

const THROWING = `export default { name: "t", fixtures: { good: [], bad: [] }, grade(f) { throw new Error(f.reply); } };`;

const files = async () => {
	const dir = await tempDir("fixture");
	const paths = { set: join(dir, "set.json"), grader: join(dir, "grader.ts"), throwing: join(dir, "throwing.ts") };
	await Bun.write(paths.set, JSON.stringify(SET));
	await Bun.write(paths.grader, GRADER);
	await Bun.write(paths.throwing, THROWING);
	return paths;
};

describe("loadFixtures", () => {
	test("reads a valid set and keeps the held-out mark", async () => {
		const set = await loadFixtures((await files()).set);
		expect(set.heldOut).toBe(true);
		expect(set.fixtures.map((f) => f.id)).toEqual(["a", "b", "c"]);
	});

	test("names each bad field and a repeated id", () => {
		const { userReply: _, ...noUserReply } = good("b", "x");
		const bad = { name: "bad", fixtures: [good("a", "x"), noUserReply, { ...good("a", "x"), source: "somewhere" }] };
		expect(() => parseSet(bad)).toThrow(MISSING_USER_REPLY);
		expect(() => parseSet(bad)).toThrow(BAD_SOURCE);
		expect(() => parseSet(bad)).toThrow(REPEATED);
	});
});

describe("fixtureCommand", () => {
	test("checks and grades a set, and refuses an unknown command", async () => {
		const p = await files();
		expect(await fixtureCommand(["check", p.set])).toBe("held: 3 fixtures, held-out true");
		expect(JSON.parse(await fixtureCommand(["grade", p.set, p.grader]))).toEqual({ n: 3, pass: 2, byLabel: { ok: 2, apology: 1 } });
		await expect(fixtureCommand(["nope", p.set])).rejects.toThrow(UNKNOWN);
	});
});

describe("gradeHeldOut", () => {
	test("returns counts only", async () => {
		const p = await files();
		expect(await gradeHeldOut(p.set, p.grader)).toEqual({ n: 3, pass: 2, byLabel: { ok: 2, apology: 1 } });
	});

	test("the calling process never prints or receives case text, even from a grader that prints it", async () => {
		const p = await files();
		const script = `import { gradeHeldOut } from ${JSON.stringify(FIXTURE_TS)};
console.log(JSON.stringify(await gradeHeldOut(${JSON.stringify(p.set)}, ${JSON.stringify(p.grader)})));`;
		const proc = Bun.spawn(["bun", "-e", script], { stdout: "pipe", stderr: "pipe" });
		const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
		expect(await proc.exited).toBe(0);
		expect(out).toContain('"n":3');
		expect(out).not.toContain(SECRET);
	});

	test("a grader that throws with case text yields an error without it", async () => {
		const p = await files();
		const error = await gradeHeldOut(p.set, p.throwing).catch((e: Error) => e.message);
		expect(error).toMatch(GRADER_FAILED);
		expect(error).not.toContain(SECRET);
	});
});
