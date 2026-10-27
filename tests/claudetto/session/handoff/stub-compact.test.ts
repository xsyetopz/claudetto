// The engine accepts the answer of code compaction (task 2.3, checked on Claude Code `2.1.310`).
// A `claude -p /compact` run on a saved session, with the `code` option, against a stub of the Messages API with a fake key.
// The run costs $0: the stub counts each request, and code compaction makes none. The run skips when `claude` is not on `PATH`.

import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file, which } from "bun";
import { PIN_RUNS_TIMEOUT_MS } from "../../../../tools/limits.ts";
import { seedSession, stubCapture } from "../../../support/stub-api.ts";

const PLUGIN = new URL("../../../../plugins/claudetto", import.meta.url)
	.pathname;
const SESSION = "11111111-1111-4111-8111-111111111111";

/** The saved rows of a session with two turns, one rule among them, and filler that the tail budget cuts, as Claude Code writes them. */
const rowsOf = (cwd: string): string =>
	[
		["user", "Build the export. Pin `zod` to `3.23`."],
		["assistant", "Ok, starting."],
		["user", "Do not touch `src/legacy.ts`."],
		["assistant", "Understood."],
		...Array.from({ length: 6 }, (_, i): [string, string] => [
			i % 2 === 0 ? "user" : "assistant",
			`Filler ${i} ${"x".repeat(30_000)}`,
		]),
	]
		.map(([role, text], i) => ({
			parentUuid:
				i === 0 ? null : `00000000-0000-4000-8000-00000000000${i - 1}`,
			isSidechain: false,
			userType: "external",
			cwd,
			sessionId: SESSION,
			version: "2.1.310",
			type: role,
			uuid: `00000000-0000-4000-8000-00000000000${i}`,
			timestamp: new Date(1_700_000_000_000 + i * 1000).toISOString(),
			message:
				role === "user"
					? { role, content: text }
					: {
							id: `msg_${i}`,
							type: "message",
							role,
							model: "claude-sonnet-5-5",
							content: [{ type: "text", text }],
							stop_reason: "end_turn",
							usage: { input_tokens: 1, output_tokens: 1 },
						},
		}))
		.map((row) => JSON.stringify(row))
		.join("\n");

const uuidOf = (i: number): string =>
	`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;

/** The builders of a saved row, as Claude Code writes them: a chain by `parentUuid`, one `uuid` per index. */
const rowKit = (cwd: string) => {
	const base = (i: number, type: string) => ({
		parentUuid: i === 0 ? null : uuidOf(i - 1),
		isSidechain: false,
		userType: "external",
		cwd,
		sessionId: SESSION,
		version: "2.1.310",
		type,
		uuid: uuidOf(i),
		timestamp: new Date(1_700_000_000_000 + i * 1000).toISOString(),
	});
	const assistant = (i: number, content: object[], id = `msg_${i}`) => ({
		...base(i, "assistant"),
		message: {
			id,
			type: "message",
			role: "assistant",
			model: "claude-sonnet-5-5",
			content,
			stop_reason: "end_turn",
			usage: { input_tokens: 1, output_tokens: 1 },
		},
	});
	const user = (i: number, content: string | object[]) => ({
		...base(i, "user"),
		message: { role: "user", content },
	});
	const result = (i: number, n: string, text: string, from: number) => ({
		...user(i, [
			{
				type: "tool_result",
				tool_use_id: n,
				content: [{ type: "text", text }],
				is_error: false,
			},
		]),
		sourceToolAssistantUUID: uuidOf(from),
		toolUseResult: { stdout: text, stderr: "", interrupted: false },
	});
	return { assistant, user, result };
};

/** The first rows of a session: two rules, then filler that the tail budget cuts. */
const HEAD_TEXTS = [
	"Build the export. Pin `zod` to `3.23`.",
	"Ok, starting.",
	"Do not touch `src/legacy.ts`.",
	"Understood.",
	...Array.from({ length: 5 }, (_, i) => `Filler ${i} ${"x".repeat(100_000)}`),
];

const headOf = (kit: ReturnType<typeof rowKit>, texts: readonly string[]) =>
	texts.map((text, i) =>
		i % 2 === 0
			? kit.user(i, text)
			: kit.assistant(i, [{ type: "text", text }]),
	);

/** The saved rows of a session whose kept tail holds two `tool_use`/`tool_result` pairs, after filler that the tail budget cuts, as Claude Code writes them. */
const toolRowsOf = (cwd: string): string => {
	const { assistant, user } = rowKit(cwd);
	const texts = HEAD_TEXTS;
	const head = headOf(rowKit(cwd), texts);
	const pair = (i: number, n: number) => [
		assistant(i, [
			{
				type: "thinking",
				thinking: `kept-thinking-${n}`,
				signature: `sig-${n}`,
			},
			{
				type: "tool_use",
				id: `toolu_kept_${n}`,
				name: "Bash",
				input: { command: `echo kept-${n}` },
			},
		]),
		{
			...user(i + 1, [
				{
					type: "tool_result",
					tool_use_id: `toolu_kept_${n}`,
					content: [
						{ type: "text", text: `kept-${n}` },
						{
							type: "image",
							source: {
								type: "base64",
								media_type: "image/png",
								data: `kept-image-${n}`,
							},
						},
					],
					is_error: false,
				},
			]),
			sourceToolAssistantUUID: uuidOf(i),
			toolUseResult: {
				stdout: `kept-${n}`,
				stderr: "",
				interrupted: false,
				isImage: false,
			},
		},
	];
	const at = texts.length;
	return [
		...head,
		...pair(at, 1),
		...pair(at + 2, 2),
		assistant(at + 4, [{ type: "text", text: "All done." }]),
	]
		.map((row) => JSON.stringify(row))
		.join("\n");
};

/** The saved rows of a session whose one API response made three parallel calls, as Claude Code writes them: one assistant row per call, all with the same `message.id`, each followed by its result. The result of the first call is bulk that the tail budget cuts, so the other two calls start the tail while their sibling stays before the boundary. */
const parallelRowsOf = (cwd: string): string => {
	const kit = rowKit(cwd);
	const at = HEAD_TEXTS.length;
	const call = (i: number, n: number, text: string) => [
		kit.assistant(
			i,
			[
				{
					type: "tool_use",
					id: `toolu_par_${n}`,
					name: "Bash",
					input: { command: `echo par-${n}` },
				},
			],
			"msg_parallel",
		),
		kit.result(i + 1, `toolu_par_${n}`, text, i),
	];
	return [
		...headOf(kit, HEAD_TEXTS),
		...call(at, 1, `par-old-1 ${"y".repeat(100_000)}`),
		...call(at + 2, 2, "par-kept-2"),
		...call(at + 4, 3, "par-kept-3"),
		kit.assistant(at + 6, [{ type: "text", text: "All done." }]),
	]
		.map((row) => JSON.stringify(row))
		.join("\n");
};

/** A row of the saved transcript, as far as this test reads it. */
interface Row {
	subtype?: string;
	uuid?: string;
	parentUuid?: string | null;
	message?: { role?: string; content?: string };
}

/** The user settings of a run with code compaction. The `SessionEnd` hook copies the transcript to `saved`, because the run removes its folders. */
const codeCompaction = (saved: string) => ({
	pluginConfigs: {
		"claudetto@inline": { options: { compaction: "code" } },
	},
	hooks: {
		SessionEnd: [
			{
				hooks: [
					{
						type: "command",
						command: `f=$(sed -n 's/.*"transcript_path":"\\([^"]*\\)".*/\\1/p'); cp "$f" ${saved}`,
					},
				],
			},
		],
	},
});

/** Compacts the session of `makeRows` with `code`, then sends one follow-up `--resume`: the saved rows, the requests of the follow-up, its first request messages as JSON, and the size of the saved rows before the compaction. */
const compactThenResume = async (makeRows: (cwd: string) => string) => {
	const out = await mkdtemp(path.join(os.tmpdir(), "stub-compact-"));
	const saved = path.join(out, "transcript.jsonl");
	let before = 0;
	let cwd = "";
	await stubCapture(codeCompaction(saved), {
		prompt: "/compact",
		args: ["--plugin-dir", PLUGIN, "--resume", SESSION],
		prepare: seedSession(SESSION, (project) => {
			cwd = project;
			const rows = makeRows(project);
			before = rows.length;
			return rows;
		}),
	});
	const compacted = await file(saved).text();
	const rows = compacted
		.split("\n")
		.filter((line) => line.startsWith("{"))
		.map((line): Row => JSON.parse(line));
	const follow = await stubCapture(
		{},
		{
			prompt: "Say hi.",
			args: ["--resume", SESSION],
			prepare: seedSession(SESSION, (project) =>
				compacted.split(cwd).join(project),
			),
		},
	);
	await rm(out, { recursive: true, force: true });
	return {
		rows,
		requests: follow.requests,
		sent: JSON.stringify(follow.requests[0]?.["messages"] ?? null),
		before,
	};
};

describe.skipIf(which("claude") === null)("`claude` on `PATH`", () => {
	test(
		"Engine Accepts the Answer: the transcript after `/compact` starts with the handoff message, and no model request runs",
		async () => {
			const out = await mkdtemp(path.join(os.tmpdir(), "stub-compact-"));
			const saved = path.join(out, "transcript.jsonl");

			const capture = await stubCapture(codeCompaction(saved), {
				prompt: "/compact",
				args: ["--plugin-dir", PLUGIN, "--resume", SESSION],
				prepare: seedSession(SESSION, rowsOf),
			});

			const rows = (await file(saved).text())
				.split("\n")
				.filter((line) => line.startsWith("{"))
				.map((line): Row => JSON.parse(line));
			await rm(out, { recursive: true, force: true });
			const boundary = rows.findIndex((r) => r.subtype === "compact_boundary");
			const first = rows[boundary + 1]?.message;
			expect(capture.requests).toHaveLength(0);
			expect(boundary).toBeGreaterThan(-1);
			expect(first?.role).toBe("user");
			expect(first?.content).toContain("# Handoff");
			expect(first?.content).toContain("Pin `zod` to `3.23`.");
			expect(first?.content).toContain("Do not touch `src/legacy.ts`.");
		},
		PIN_RUNS_TIMEOUT_MS,
	);

	test(
		"Kept Tool Pairs Link After the Boundary: a follow-up `--resume` request holds no bulk from before it, and keeps the tool pair",
		async () => {
			const { rows, requests, sent, before } =
				await compactThenResume(toolRowsOf);
			const boundary = rows.findIndex((r) => r.subtype === "compact_boundary");
			const parents = new Map(rows.map((r) => [r.uuid, r.parentUuid]));
			const old = new Set(rows.slice(0, boundary).map((r) => r.uuid));
			const kept = rows.slice(boundary + 1).filter((r) => r.uuid !== undefined);
			// The uuids that a row passes on its way up to the boundary, or to the root.
			const chainOf = (start: string | undefined): (string | undefined)[] => {
				const chain: (string | undefined)[] = [];
				for (
					let at = start;
					at !== undefined && !chain.includes(at);
					at = parents.get(at) ?? undefined
				) {
					chain.push(at);
					if (at === rows[boundary]?.uuid) {
						break;
					}
				}
				return chain;
			};
			expect(requests).toHaveLength(1);
			// The handoff may quote a clipped line of the filler, so the check is for its bulk.
			expect(sent).not.toContain("x".repeat(2000));
			expect(sent.length).toBeLessThan(before / 4);
			expect(sent).toContain('"tool_use_id":"toolu_kept_1"');
			expect(sent).toContain('"id":"toolu_kept_1"');
			expect(sent).toContain("# Handoff");
			// The root cause: each kept row links after the boundary, never to a row before it.
			expect(boundary).toBeGreaterThan(-1);
			expect(kept.length).toBeGreaterThan(0);
			for (const row of kept) {
				const chain = chainOf(row.uuid);
				expect(chain.at(-1)).toBe(rows[boundary]?.uuid);
				expect(chain.filter((uuid) => old.has(uuid))).toEqual([]);
			}
			// The `thinking` block of a kept `tool_use` row stays, so a next request with thinking on stays valid.
			expect(sent).toContain('"thinking":"kept-thinking-1"');
			expect(sent).toContain('"signature":"sig-1"');
		},
		PIN_RUNS_TIMEOUT_MS,
	);

	test(
		"Parallel Calls Split By The Boundary Do Not Pull Back Their Siblings: a follow-up `--resume` request holds no result from before it",
		async () => {
			const { rows, requests, sent } = await compactThenResume(parallelRowsOf);
			const boundary = rows.findIndex((r) => r.subtype === "compact_boundary");
			expect(boundary).toBeGreaterThan(-1);
			expect(requests).toHaveLength(1);
			// The engine joins the rows of one `message.id` and their results, from before the boundary too.
			expect(sent).not.toContain("par-old-1");
			expect(sent).not.toContain("toolu_par_1");
			expect(sent).toContain('"tool_use_id":"toolu_par_2"');
			expect(sent).toContain('"tool_use_id":"toolu_par_3"');
		},
		PIN_RUNS_TIMEOUT_MS,
	);
});
