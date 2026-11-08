// 18.19 replay: the plugin's `credited` grading prompt, sent through `claude -p`, on the 18.9 and set1 crediting positives the live run did not
// flag, and on the set1 negatives.
//   bun --env-file=<env> pre.ts haiku|haiku-results|haiku2|sonnet-results [raw]
// haiku2 = two independent haiku calls ORed; sonnet-results = the sonnet call that already gets the turn's tool output.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VERIFY_GRADE } from "../../../../../plugins/claudetto/hooks/texts.ts";
import { parseFaults } from "../../../../../plugins/claudetto/hooks/verify.ts";

const HERE = import.meta.dir;
const CREDIT = /\b(?:your|you)\b[^.\n]{0,40}\b(?:labels?|labell?ed|decided|chose|chosen|assigned|rated|picked)\b/i;
interface Case { id: string; files: Record<string, string>; userReply: string }
const load = (dir: string) => ({
	cases: (JSON.parse(readFileSync(join(dir, "cases.json"), "utf8")).cases as Case[]),
	rows: readFileSync(join(dir, "results.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)),
});
const sets = [join(HERE, "../18-9"), join(HERE, "set1")].map(load);
const pick = (keep: (r: { id: string; credited: boolean; firstReply: string }) => boolean) =>
	sets.flatMap((s) => s.rows.filter(keep).map((r) => ({ r, c: s.cases.find((x) => x.id === r.id) as Case })));
const misses = pick((r) => r.id.startsWith("pos-") && !r.credited && CREDIT.test(r.firstReply));
const negatives = sets.slice(1).flatMap((s) => s.rows.filter((r) => r.id.startsWith("neg-")).map((r) => ({ r, c: s.cases.find((x) => x.id === r.id) as Case })));

const [variant = "haiku", raw] = Bun.argv.slice(2);
const model = variant.startsWith("sonnet") ? "sonnet" : "haiku";
const CODES = (model === "sonnet" ? ["credited", "fallback", "unfiled", "unseen"] : ["credited", "fallback", "unfiled"]) as ("credited" | "fallback" | "unfiled" | "unseen")[];
const env = { PATH: process.env.PATH ?? "", HOME: "/tmp/probe-18-19/home", CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "" };

const vote = (c: Case, reply: string) => {
	const out = (c.files["judge.sh"] ?? "").split("\n").filter((l) => l.startsWith("echo ")).map((l) => l.slice(6, -1)).join("\n");
	const results = variant.endsWith("results") ? [`- Bash ./judge.sh\n${out}`] : [];
	const prompt = VERIFY_GRADE([], [], c.userReply, reply, CODES, results);
	const p = Bun.spawnSync(["claude", "-p", "--model", model, "--tools", "", "--setting-sources", "", "--no-session-persistence", "--disable-slash-commands", prompt], { env });
	const text = p.stdout.toString();
	if (raw) console.log(text.slice(0, 300), p.stderr.toString().slice(0, 200));
	return parseFaults(text, CODES, reply).includes("credited");
};
const flag = (c: Case, reply: string) => vote(c, reply) || (variant === "haiku2" && vote(c, reply));

const count = (list: typeof misses) => list.filter(({ r, c }) => flag(c, r.firstReply)).length;
const m = count(misses);
const n = count(negatives);
console.log(JSON.stringify({ variant, misses: misses.length, flaggedMisses: m, negatives: negatives.length, flaggedNegatives: n }));
