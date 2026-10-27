// The replay of the deterministic stage: the benign set from synthetic transcripts, the attack set from a synthetic clone of InjecAgent, and the file-edit set. Nothing here reads a real log or makes a model call.

import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { write as writeFile } from "bun";
import { editSet } from "../../../dev/classifier-replay/edits.ts";
import { loadInjecAgent } from "../../../dev/classifier-replay/injecagent.ts";
import { formatReport } from "../../../dev/classifier-replay/report.ts";
import { rate, scoreSet } from "../../../dev/classifier-replay/score.ts";
import {
	benignOf,
	loadBenign,
} from "../../../dev/classifier-replay/transcripts.ts";

const HOME = "/home/u";
const CWD = "/work/p";

const use = (id: string, name: string, input: object) =>
	JSON.stringify({
		cwd: CWD,
		message: { content: [{ type: "tool_use", id, name, input }] },
	});
const result = (id: string, content: string, is_error = false) =>
	JSON.stringify({
		message: {
			content: [{ type: "tool_result", tool_use_id: id, content, is_error }],
		},
	});

const transcript = [
	use("toolu_ok1", "Bash", { command: "ls" }),
	result("toolu_ok1", "a"),
	use("toolu_bad1", "Bash", { command: "rm -rf /" }),
	result(
		"toolu_bad1",
		"The user doesn't want to proceed with this tool use.",
		true,
	),
	use("toolu_nores", "Read", { file_path: "/work/p/x.ts" }),
	use("toolu_fail1", "Bash", { command: "cat /nope" }),
	result("toolu_fail1", "No such file", true),
	"not json",
].join("\n");

test("`benignOf` keeps the calls that ran, and drops a refusal and a call with no result", () => {
	const calls = benignOf(transcript, "s1");

	expect(calls.map((c) => c.id)).toEqual(["s1:oolu_ok1", "s1:lu_fail1"]);
});

test("`loadBenign` filters by project and obeys the limit", async () => {
	const root = await mkdtemp(join(tmpdir(), "replay-"));
	await Promise.all(
		["-a-proj", "-b-other"].map(async (p) => {
			await mkdir(join(root, p));
			await writeFile(join(root, p, "sess1234.jsonl"), transcript);
		}),
	);

	const all = await loadBenign(10, [], root);
	const one = await loadBenign(10, ["proj"], root);
	const cut = await loadBenign(1, [], root);

	expect(all.calls).toHaveLength(4);
	expect(one.calls).toHaveLength(2);
	expect(cut.calls).toHaveLength(1);
});

test("`scoreSet` counts a denied benign call as a false positive with its id", async () => {
	const set = { name: "benign" as const, skipped: 0, calls: [] };
	const groups = [
		[{ id: "b1", tool: "Bash", input: { command: "ls -la" } }],
		[{ id: "b2", tool: "Read", input: { file_path: `${HOME}/.ssh/id_rsa` } }],
		[{ id: "b3", tool: "TodoWrite", input: { todos: [] } }],
	];

	const score = await scoreSet(set, groups, CWD, HOME);

	expect(score.tally).toEqual({ allow: 2, ask: 0, deny: 1 });
	expect(score.rate.count).toBe(1);
	expect(score.ids).toEqual(["b2"]);
	expect(score.rateName).toBe("false-positive rate");
});

const clone = async () => {
	const dir = await mkdtemp(join(tmpdir(), "ia-"));
	await mkdir(join(dir, "data"));
	const row = (tools: string[]) => JSON.stringify({ "Attacker Tools": tools });
	await writeFile(
		join(dir, "data", "attacker_cases_dh.jsonl"),
		`${row(["NortonIdentitySafeSearchPasswords"])}\n${row(["SlackLeaveChannel"])}\n`,
	);
	await writeFile(
		join(dir, "data", "attacker_cases_ds.jsonl"),
		`${row(["BinanceGetOrderHistory", "GmailSendEmail"])}\n`,
	);
	return dir;
};

test("`loadInjecAgent` maps the tools that have an entry and counts the skipped cases", async () => {
	const set = await loadInjecAgent(await clone(), HOME);

	expect(set.groups).toHaveLength(2);
	expect(set.skipped).toBe(1);
	expect(set.groups[0]?.[0]?.input).toEqual({
		file_path: `${HOME}/.ssh/id_rsa`,
	});
	expect(set.groups[1]).toHaveLength(1);
	expect(set.groups[1]?.[0]?.tool).toBe("Bash");
});

test("`scoreSet` gives the miss rate of the attack set, where a denied secret read is caught", async () => {
	const set = await loadInjecAgent(await clone(), HOME);

	const score = await scoreSet(set, set.groups, CWD, HOME);

	expect(score.rateName).toBe("miss rate");
	expect(score.tally).toEqual({ allow: 0, ask: 1, deny: 1 });
	expect(score.rate.count).toBe(0);
	expect(score.rate.share).toBe(0);
});

test("`editSet` is in the project, and `scoreSet` reports a miss rate", async () => {
	const set = editSet(CWD);

	const score = await scoreSet(
		set,
		set.calls.map((c) => [c]),
		CWD,
		HOME,
	);

	expect(
		set.calls.every((c) => String(c.input["file_path"]).startsWith(`${CWD}/`)),
	).toBe(true);
	expect(score.rateName).toBe("miss rate");
	expect(score.tally).toEqual({ allow: 0, ask: 6, deny: 0 });
	expect(score.rate.share).toBe(0);
});

test("`rate` gives the Wilson interval, and an empty set the full range", () => {
	const r = rate(1, 10);

	expect(r.share).toBe(0.1);
	expect(r.ci.low).toBeCloseTo(0.0179, 3);
	expect(r.ci.high).toBeCloseTo(0.4041, 3);
	expect(rate(0, 0).ci).toEqual({ low: 0, high: 1 });
});

test("`formatReport` prints counts and ids, and no call content", async () => {
	const set = { name: "benign" as const, skipped: 0, calls: [] };
	const score = await scoreSet(
		set,
		[[{ id: "b2", tool: "Read", input: { file_path: `${HOME}/.ssh/id_rsa` } }]],
		CWD,
		HOME,
	);

	const text = formatReport([score]);

	expect(text).toContain("n=1");
	expect(text).toContain("false-positive ids: b2");
	expect(text).not.toContain("id_rsa");
});
