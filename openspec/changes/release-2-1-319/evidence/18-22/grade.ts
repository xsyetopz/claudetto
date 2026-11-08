import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { VERIFY_GRADE } from "../../../../../plugins/claudetto/hooks/texts.ts";

const dir = "/tmp/probe-18-23b/runs/probe-18-23b";
const rows = readFileSync(`${import.meta.dir}/../18-23/sessions.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const textOf = (c: any): string => (typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => x.text ?? "").join("") : JSON.stringify(c));
const cut = Number(process.argv[2]);
const which = process.argv[3]; // BLOCKED | clean
const limit = Number(process.argv[4] ?? 5);
let k = 0;
for (const r of rows.filter((x) => x.arm === "change" && (x.m.stopBlocks > 0) === (which === "BLOCKED"))) {
	if (k++ >= limit) break;
	const msgs = readFileSync(`${dir}/${r.runId}/stdout.txt`, "utf8").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
	const uses = new Map<string, any>();
	const res: string[] = [];
	let user = "";
	let reply = "";
	for (const m of msgs) {
		if (m.type === "assistant") for (const b of m.message.content) {
			if (b.type === "tool_use") uses.set(b.id, b);
			if (b.type === "text") reply = b.text;
		}
		if (m.type === "user") for (const b of m.message.content ?? []) {
			if (typeof b === "string") continue;
			if (b.type === "text" && !user) user = b.text;
			if (b.type === "tool_result") {
				const u = uses.get(b.tool_use_id);
				const arg = u?.input.command ?? u?.input.file_path ?? u?.input.pattern ?? "";
				res.push(`- ${u?.name} ${String(arg).slice(0, 120)}\n${textOf(b.content).slice(0, cut)}`);
			}
		}
	}
	if (typeof msgs[0] === "undefined") continue;
	if (!user) user = rows.length ? (msgs.find((m) => m.type === "user")?.message.content ?? "").toString() : "";
	const prompt = VERIFY_GRADE([], [], user, reply, ["credited", "fallback", "unfiled", "unseen"], res.slice(-8));
	const out = spawnSync("claude", ["-p", "--model", "claude-sonnet-5-5", "--no-session-persistence", "--setting-sources", "", "--tools", ""], { input: prompt, encoding: "utf8" });
	const faults = /"code"\s*:\s*"(\w+)"/g;
	const found = [...out.stdout.matchAll(faults)].map((x) => x[1]);
	console.log(which, cut, r.task, "faults:", found.join(",") || "none", "| reply head:", reply.replace(/\n/g, " ").slice(0, 80));
}
