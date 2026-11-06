import { expect, test } from "bun:test";
import { join } from "node:path";
import { tempDir } from "../shared/temp.ts";
import { fixtureCommand } from "./command.ts";
import { loadFixtures, parseSet } from "./fixture.ts";
import { mine, split } from "./mine.ts";

const u = (content: unknown, extra = {}) => JSON.stringify({ type: "user", message: { role: "user", content }, ...extra });
const a = (content: unknown[], extra = {}) => JSON.stringify({ type: "assistant", message: { role: "assistant", content }, ...extra });

const lines = [
	u("start"),
	a([{ type: "text", text: "Started." }]),
	u("fix the bug"),
	a([{ type: "text", text: "Reading it." }, { type: "tool_use", id: "t1", name: "Read", input: {} }]),
	u([{ type: "tool_result", tool_use_id: "t1", content: "x" }]),
	a([{ type: "text", text: "sub" }], { isSidechain: true }),
	u("sub ask", { isSidechain: true }),
	u("meta", { isMeta: true }),
	u("<command-name>/clear</command-name>"),
	a([{ type: "text", text: "Fixed." }]),
	u([{ type: "text", text: "you did not run the test" }]),
];

test("pairs a turn's text with the next typed message, keeps earlier turns as the prefix, and skips entries the user did not type", () => {
	const got = mine("s.jsonl", lines.join("\n"), 4);
	expect(got).toHaveLength(2);
	expect(got[1]).toEqual({
		id: "s:11",
		prefix: [
			{ role: "user", content: "start" },
			{ role: "assistant", content: "Started." },
			{ role: "user", content: "fix the bug" },
		],
		reply: "Reading it.\n\nFixed.",
		userReply: "you did not run the test",
		labels: { tools: "1" },
		source: "s.jsonl:10",
	});
	expect(parseSet({ name: "mined", fixtures: got }).fixtures).toHaveLength(2);
});

test("skips shell runs and messages whose recorded origin is not a human", () => {
	const noise = [
		u("<bash-input>git status</bash-input>"),
		u("<bash-stdout>clean</bash-stdout><bash-stderr></bash-stderr>"),
		u("plugin text", { origin: { kind: "plugin", name: "claudetto" }, turnOrigin: "system" }),
		u("agent text", { turnOrigin: "peer" }),
		u("done", { origin: { kind: "task-notification" } }),
	];
	const got = mine("s.jsonl", [u("go"), a([{ type: "text", text: "Done." }]), ...noise, u("wrong file")].join("\n"), 4);
	expect(got.map((f) => f.userReply)).toEqual(["wrong file"]);
});

test("skips the summary a compaction writes after its boundary, and only that entry", () => {
	const boundary = JSON.stringify({ type: "system", subtype: "compact_boundary" });
	const text = [u("go"), a([{ type: "text", text: "Working." }]), boundary, u("# Continuation summary"), a([{ type: "text", text: "Done." }]), u("thanks")];
	expect(mine("s.jsonl", text.join("\n"), 4).map((f) => [f.reply, f.userReply])).toEqual([["Working.\n\nDone.", "thanks"]]);
});

test("keeps at most the last `keep` messages before the ask", () => {
	expect(mine("s.jsonl", lines.join("\n"), 0)[1]?.prefix).toEqual([{ role: "user", content: "fix the bug" }]);
});

const sessionLines = (n: number) => [u(`ask ${n}`), a([{ type: "text", text: `SECRET reply ${n}` }]), u(`answer ${n}`)].join("\n");

test("split sends whole sessions one way, the same way for the same seed", () => {
	const fixtures = Array.from({ length: 40 }, (_, n) => mine(`s${n}.jsonl`, sessionLines(n), 4)).flat();
	const one = split(fixtures, "seed-a", 0.5);
	expect(one.tuning.length + one.heldOut.length).toBe(40);
	expect(one.heldOut.length).toBeGreaterThan(0);
	expect(one.tuning.length).toBeGreaterThan(0);
	expect(split(fixtures, "seed-a", 0.5)).toEqual(one);
	expect(split(fixtures, "seed-b", 0.5)).not.toEqual(one);
});

test("fixture split writes the held-out set beside a kept seed and prints only counts", async () => {
	const dir = await tempDir("split");
	const held = join(dir, "held");
	const sessions = await Promise.all(
		Array.from({ length: 30 }, async (_, n) => {
			const p = join(dir, `${n}.jsonl`);
			await Bun.write(p, sessionLines(n));
			return p;
		}),
	);
	const out = join(dir, "tuning.json");
	const said = await fixtureCommand(["split", out, held, ...sessions]);
	expect(said).not.toContain("SECRET");
	const tuning = await loadFixtures(out);
	const heldOut = await loadFixtures(join(held, "held-out.json"));
	expect([tuning.heldOut, heldOut.heldOut]).toEqual([false, true]);
	expect(tuning.fixtures.length + heldOut.fixtures.length).toBe(30);
	expect(said).toBe(`30 fixtures from 30 sessions: ${tuning.fixtures.length} tuning -> ${out}, ${heldOut.fixtures.length} held out`);
	const seed = await Bun.file(join(held, "seed")).text();
	await fixtureCommand(["split", out, held, ...sessions]);
	expect(await Bun.file(join(held, "seed")).text()).toBe(seed);
	expect((await loadFixtures(out)).fixtures).toEqual(tuning.fixtures);
});
