// mksession(cwd, msgs) writes a session jsonl into CFG/projects/<enc cwd>/<id>.jsonl and returns id.
import { mkdirSync, writeFileSync } from "node:fs";
export type Turn = { role: "user" | "assistant"; content: string | any[] };
export const mksession = (cwd: string, turns: Turn[], cfg = "/tmp/probe-122/cfg") => {
	const id = crypto.randomUUID();
	const dir = `${cfg}/projects/${cwd.replace(/[^a-zA-Z0-9]/g, "-")}`;
	mkdirSync(dir, { recursive: true });
	let parent: string | null = null;
	const base = Date.now() - 600_000;
	const rows = turns.map((t, i) => {
		const uuid = crypto.randomUUID();
		const row: any = { parentUuid: parent, isSidechain: false, type: t.role, message: t.role === "user" ? { role: "user", content: t.content } : { id: `msg_${uuid.slice(0, 20)}`, type: "message", role: "assistant", model: "claude-opus-5-5", content: typeof t.content === "string" ? [{ type: "text", text: t.content }] : t.content, stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }, uuid, timestamp: new Date(base + i * 1000).toISOString(), userType: "external", entrypoint: "cli", cwd, sessionId: id, version: "2.1.319", gitBranch: "main" };
		parent = uuid;
		return JSON.stringify(row);
	});
	writeFileSync(`${dir}/${id}.jsonl`, rows.join("\n") + "\n");
	return id;
};
