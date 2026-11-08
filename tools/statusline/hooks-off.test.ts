import { afterAll, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { statusWithFiles } from "../../plugins/claudetto/statusline/main.ts";
import { plain } from "../../plugins/claudetto/statusline/width.ts";
import { BASE, NOW } from "./support.ts";

const ROOT = await mkdtemp(join(tmpdir(), "claudetto-hooks-off-"));
afterAll(() => rm(ROOT, { recursive: true, force: true }));

const MINUTE = 60_000;
const WARNING = "✗ claudetto hooks off: /reload-plugins";

let projects = 0;

interface Setup {
	/** The heartbeat's time, or `undefined` for no heartbeat file. */
	beat?: number;
	/** Each transcript entry as its `type` and its time. */
	entries: [string, number][];
	/** How long the session has run, as `cost.total_duration_ms`. */
	ranMs?: number;
}

/** The status line text for a project whose heartbeat and transcript are set up as `setup` says. */
const statusFor = async ({
	beat,
	entries,
	ranMs = 60 * MINUTE,
}: Setup): Promise<string> => {
	const dir = join(ROOT, `p${projects++}`);
	await mkdir(join(dir, ".claude/claudetto/heartbeat"), { recursive: true });
	if (beat !== undefined) {
		await writeFile(
			join(dir, ".claude/claudetto/heartbeat/s-1.txt"),
			String(beat),
		);
	}
	const transcript = join(dir, "s-1.jsonl");
	const lines = entries.map(([type, at]) =>
		JSON.stringify({ type, timestamp: new Date(at).toISOString() }),
	);
	await writeFile(transcript, `${lines.join("\n")}\n`);
	const input = {
		...BASE,
		workspace: { current_dir: dir, project_dir: dir },
		session_id: "s-1",
		transcript_path: transcript,
		cost: { total_cost_usd: 0, total_duration_ms: ranMs },
	};
	return plain(
		await statusWithFiles(
			JSON.stringify(input),
			{ COLUMNS: "200", NO_COLOR: "1" },
			NOW,
		),
	);
};

test("a reply more than 5 minutes newer than the heartbeat shows the warning", async () => {
	const status = await statusFor({
		beat: NOW - 20 * MINUTE,
		entries: [
			["user", NOW - 21 * MINUTE],
			["assistant", NOW - 14 * MINUTE],
		],
	});
	expect(status).toContain(WARNING);
});

test("a reply within 5 minutes of the heartbeat shows no warning", async () => {
	const status = await statusFor({
		beat: NOW - 20 * MINUTE,
		entries: [["assistant", NOW - 16 * MINUTE]],
	});
	expect(status).not.toContain("hooks off");
});

test("an entry the hooks do not precede, such as an idle summary, shows no warning", async () => {
	const status = await statusFor({
		beat: NOW - 30 * MINUTE,
		entries: [
			["assistant", NOW - 30 * MINUTE],
			["system", NOW - MINUTE],
		],
	});
	expect(status).not.toContain("hooks off");
});

test("no heartbeat and a reply more than 5 minutes into the session shows the warning", async () => {
	const status = await statusFor({
		entries: [["assistant", NOW - MINUTE]],
		ranMs: 10 * MINUTE,
	});
	expect(status).toContain(WARNING);
});

test("no heartbeat and a reply in the session's first 5 minutes shows no warning", async () => {
	const status = await statusFor({
		entries: [["assistant", NOW - MINUTE]],
		ranMs: 3 * MINUTE,
	});
	expect(status).not.toContain("hooks off");
});

test("a session with no reply yet shows no warning", async () => {
	const status = await statusFor({
		entries: [["user", NOW - MINUTE]],
		ranMs: 60 * MINUTE,
	});
	expect(status).not.toContain("hooks off");
});

test("a missing transcript shows no warning", async () => {
	const status = plain(
		await statusWithFiles(
			JSON.stringify({
				...BASE,
				session_id: "s-1",
				transcript_path: join(ROOT, "none.jsonl"),
				workspace: { project_dir: ROOT },
			}),
			{ COLUMNS: "200", NO_COLOR: "1" },
			NOW,
		),
	);
	expect(status).not.toContain("hooks off");
});
