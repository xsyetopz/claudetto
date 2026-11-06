// The Stop grader's Haiku call, measured on held-out replies: split n is the n-th session of each case and arm of the 17.4 run.
//   bun grader.ts build <n>   writes replies-<n>.json from ../17-4/sessions.jsonl and the run's stdouts
//   bun grader.ts grade <n>   grades each labeled reply once through the hook's own call and writes results-<n>-<time>.json
// Labels live in labels-<n>.json and are committed before any grade run of that split; a reply with no label stops the grade.
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ISSUES_FILE, offeredCodes, WRITERS } from "../../../../../plugins/claudetto/hooks/limits/stop.ts";
import { bashWritesTo } from "../../../../../plugins/claudetto/hooks/pin.ts";
import { type GradeFault, VERIFY_GRADE } from "../../../../../plugins/claudetto/hooks/texts.ts";
import { parseFaults } from "../../../../../plugins/claudetto/hooks/verify.ts";

const HERE = import.meta.dir;
const RUNS = join(process.env.TMPDIR ?? tmpdir(), "claudekit/narration");
/** Replies per paid session: about 4,000 tokens each, so a session stays far under its 300,000-token cap. */
const BATCH = 20;
/** The cap on one paid session. */
const RUN_TOKENS = 300_000;

// stream-json keeps no record of an ask, so a refusal is read from its wording: a plugin deny, the CLI's refused-ask texts, and the
// headless ask reasons these sessions show, which the hook reads as the ask's own reason.
const REFUSAL =
	/^(?:Permission (?:to use|for this)|The user doesn't want to proceed|This (?:Bash )?command[^\n]*(?:requires? approval|can't be checked before it runs))/;

type Turn = { role: "user" | "assistant"; content: string | { type: string; text?: string }[] };
interface Fixture {
	id: string;
	prefix: Turn[];
	reply: string;
	userReply: string;
}
interface Reply {
	id: string;
	runId: string;
	people: string[];
	shown: string[];
	ask: string;
	reply: string;
	looked: boolean;
	wroteIssues: boolean;
	refused: number;
	codes: GradeFault[];
}
type Label = GradeFault | "clean";

const textOf = (t: Turn): string =>
	typeof t.content === "string" ? t.content : t.content.flatMap((b) => (b.type === "text" ? [b.text ?? ""] : [])).join("");

const field = (input: unknown, key: string): string =>
	String(typeof input === "object" && input !== null ? ((input as Record<string, unknown>)[key] ?? "") : "");

const build = async (split: number): Promise<void> => {
	const { fixtures }: { fixtures: Fixture[] } = await Bun.file(join(HERE, "cases.json")).json();
	const byId = new Map(fixtures.map((f) => [f.id, f]));
	const rows: { case: string; arm: string; runId: string }[] = (await Bun.file(join(HERE, "../17-4/sessions.jsonl")).text())
		.split("\n")
		.filter(Boolean)
		.map((l) => JSON.parse(l));
	const first = rows.filter((r, i) => rows.slice(0, i).filter((s) => s.case === r.case && s.arm === r.arm).length === split - 1);
	const replies = await Promise.all(
		first.map(async (r): Promise<Reply> => {
			const f = byId.get(r.case);
			if (f === undefined) throw new Error(`${r.case}: not in cases.json`);
			const events = (await Bun.file(join(RUNS, r.runId, "stdout.txt")).text())
				.split("\n")
				.filter((l) => l.startsWith("{"))
				.map((l) => JSON.parse(l));
			const blocks = (type: string) =>
				events
					.filter((e) => e.type === type && Array.isArray(e.message?.content))
					.flatMap((e) => e.message.content as { type: string; id?: string; tool_use_id?: string; name?: string; input?: unknown; is_error?: boolean; content?: unknown }[]);
			const uses = blocks("assistant").filter((b) => b.type === "tool_use");
			const errors = new Map(
				blocks("user")
					.filter((b) => b.type === "tool_result" && b.is_error)
					.map((b) => [b.tool_use_id, typeof b.content === "string" ? b.content : textOf({ role: "user", content: b.content as { type: string; text?: string }[] })]),
			);
			const refused = new Set(uses.filter((u) => REFUSAL.test(errors.get(u.id) ?? "")).map((u) => u.id));
			const looked = uses.some((u) => u.name !== "ToolSearch" && !refused.has(u.id));
			const wroteIssues = uses.some(
				(u) =>
					!errors.has(u.id) &&
					(u.name === "Bash"
						? bashWritesTo(field(u.input, "command"), (p) => ISSUES_FILE.test(p))
						: (WRITERS as string[]).includes(u.name ?? "") && ISSUES_FILE.test(field(u.input, "file_path"))),
			);
			const said = (role: Turn["role"]) =>
				f.prefix
					.filter((t) => t.role === role)
					.map(textOf)
					.filter((t) => t !== "" && !t.startsWith("<"));
			const result = events.findLast((e) => e.type === "result");
			return {
				id: `rep-${r.case}-${r.arm}`,
				runId: r.runId,
				people: said("user").slice(-30),
				shown: [...said("assistant"), f.reply].slice(-6),
				ask: f.userReply,
				reply: String(result?.result ?? ""),
				looked,
				wroteIssues,
				refused: refused.size,
				codes: offeredCodes(looked, wroteIssues),
			};
		}),
	);
	await Bun.write(join(HERE, `replies-${split}.json`), `${JSON.stringify(replies, null, 1)}\n`);
	console.log(`${replies.length} replies, ${replies.filter((r) => r.looked).length} looked, ${replies.filter((r) => r.refused > 0).length} with a refused call`);
};

/** The 95% Wilson score interval of k successes in n trials. */
const wilson = (k: number, n: number): [number, number] => {
	if (n === 0) return [0, 1];
	const z = 1.96;
	const p = k / n;
	const d = 1 + (z * z) / n;
	const c = p + (z * z) / (2 * n);
	const h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
	return [(c - h) / d, (c + h) / d];
};

const round = ([a, b]: [number, number]) => [Number(a.toFixed(2)), Number(b.toFixed(2))];

// A plugin whose prompt hook makes the Stop grader's call, `$.model.complete` with the same model, cap and time limit, for each prompt in
// the file, six at a time, and logs the results; the session then answers its own prompt with one short reply.
const hook = (dir: string) => `const dir = ${JSON.stringify(dir)};
export const register = (on) => {
	on("prompt.submit", async ($, e, next) => {
		const queue = JSON.parse(await $.fs.read(dir + "/prompts.json"));
		const out = [];
		await Promise.all(Array.from({ length: 6 }, async () => {
			for (let p = queue.shift(); p !== undefined; p = queue.shift()) {
				const r = await $.model.complete({ model: "haiku", prompt: p.prompt, maxTokens: 300, timeoutMs: 15000 }).catch((err) => ({ isAnswered: false, reason: String(err) }));
				out.push({ id: p.id, ...r });
			}
		}));
		await $.fs.write(dir + "/answers.json", JSON.stringify(out));
		return next(e);
	});
};
`;

interface Answer {
	id: string;
	isAnswered: boolean;
	text?: string;
	reason?: string;
	usage?: Record<string, number>;
}

const tokensOf = (u: Record<string, unknown> = {}) =>
	["input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"].reduce((n, k) => n + Number(u[k] ?? 0), 0);

const session = async (dir: string, prompts: { id: string; prompt: string }[]) => {
	await Bun.write(join(dir, "prompts.json"), JSON.stringify(prompts));
	const proc = Bun.spawn(
		["claude", "-p", "Say ok.", "--output-format", "json", "--model", "haiku", "--max-turns", "1", "--no-session-persistence", "--setting-sources", "", "--tools", "", "--plugin-dir", join(dir, "plugin")],
		{ cwd: join(dir, "cwd"), stdin: "ignore", stdout: "pipe", stderr: "pipe", env: { ...process.env, ENABLE_CLAUDEAI_MCP_SERVERS: "false", DISABLE_TELEMETRY: "1" } },
	);
	const out = await new Response(proc.stdout).text();
	await proc.exited;
	const json = JSON.parse(out);
	const answers: Answer[] = await Bun.file(join(dir, "answers.json")).json();
	const tokens = tokensOf(json.usage) + answers.reduce((n, a) => n + tokensOf(a.usage), 0);
	if (tokens > RUN_TOKENS) throw new Error(`a session spent ${tokens} tokens`);
	return { answers, tokens, usd: Number(json.total_cost_usd ?? 0) };
};

const grade = async (split: number): Promise<void> => {
	const replies: Reply[] = await Bun.file(join(HERE, `replies-${split}.json`)).json();
	const { labels }: { labels: Record<string, Label> } = await Bun.file(join(HERE, `labels-${split}.json`)).json();
	const missing = replies.filter((r) => labels[r.id] === undefined).map((r) => r.id);
	if (missing.length > 0) throw new Error(`no label for ${missing.join(", ")}`);
	const dir = mkdtempSync(join(tmpdir(), "grader-17-3-"));
	mkdirSync(join(dir, "cwd"));
	await Bun.write(join(dir, "plugin/.claude-plugin/plugin.json"), JSON.stringify({ name: "grade173", version: "0.0.1", description: "17.3 grade" }));
	await Bun.write(join(dir, "plugin/hooks/hooks.json"), JSON.stringify({ modules: ["./m.ts"] }));
	await Bun.write(join(dir, "plugin/hooks/m.ts"), hook(dir));
	let tokens = 0;
	let usd = 0;
	const answers: Answer[] = [];
	// Batches run one after another, so a spent session is seen before the next one starts.
	for (let i = 0; i < replies.length; i += BATCH) {
		const s = await session(
			dir,
			replies.slice(i, i + BATCH).map((r) => ({ id: r.id, prompt: VERIFY_GRADE(r.people, r.shown, r.ask, r.reply, r.codes, [], []) })),
		);
		answers.push(...s.answers);
		tokens += s.tokens;
		usd += s.usd;
	}
	const readings = replies.map((r) => {
		const a = answers.find((x) => x.id === r.id);
		const answer = a?.isAnswered ? (a.text ?? "") : `unanswered: ${a?.reason ?? "no answer logged"}`;
		return { id: r.id, label: labels[r.id] as Label, codes: r.codes, found: parseFaults(answer, r.codes, r.reply), answer };
	});
	readings.sort((a, b) => a.id.localeCompare(b.id));
	const codes = [...new Set(readings.flatMap((r) => r.codes))].sort();
	const table = codes.map((code) => {
		const positives = readings.filter((r) => r.label === code).length;
		const tp = readings.filter((r) => r.label === code && r.found.includes(code)).length;
		const flagged = readings.filter((r) => r.found.includes(code)).length;
		return { code, positives, tp, flagged, recall: round(wilson(tp, positives)), precision: round(wilson(tp, flagged)) };
	});
	const clean = readings.filter((r) => r.label === "clean");
	const cleanFlagged = clean.filter((r) => r.found.length > 0).length;
	const unanswered = readings.filter((r) => r.answer.startsWith("unanswered")).length;
	const summary = { tokens, unanswered, usd: Number(usd.toFixed(4)), table, cleanFlagged: [cleanFlagged, clean.length, round(wilson(cleanFlagged, clean.length))] };
	const file = join(HERE, `results-${split}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
	await Bun.write(file, `${JSON.stringify({ ...summary, readings }, null, 1)}\n`);
	console.log(JSON.stringify(summary, null, 1));
	console.log(file);
};

const [step, split] = [Bun.argv[2], Number(Bun.argv[3])];
if (!(split >= 1 && split <= 6)) throw new Error("usage: bun grader.ts build|grade <split 1-6>");
if (step === "build") await build(split);
else if (step === "grade") await grade(split);
else throw new Error("usage: bun grader.ts build|grade <split 1-6>");
