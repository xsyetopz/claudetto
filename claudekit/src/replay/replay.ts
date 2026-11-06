import { mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import type { Message } from "../fixture/fixture.ts";

// Claude Code 2.1.318 resumed a hand-written transcript from `<config>/projects/<cwd slug>/<id>.jsonl` and sent its
// turns in request 1, with and without `--fork-session` and under `--no-session-persistence` (DESIGN.md F25).
export const seedTranscript = async (configDir: string, cwd: string, prefix: Message[]): Promise<{ id: string; path: string }> => {
	const id = crypto.randomUUID();
	const work = realpathSync(cwd);
	const dir = join(configDir, "projects", work.replace(/[^A-Za-z0-9]/g, "-"));
	mkdirSync(dir, { recursive: true });
	let parentUuid: string | null = null;
	const lines = prefix.map((m) => {
		const uuid = crypto.randomUUID();
		const message =
			m.role === "user"
				? { role: "user", content: m.content }
				: { id: `msg_${uuid}`, type: "message", role: "assistant", content: [{ type: "text", text: m.content }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } };
		const entry = { sessionId: id, cwd: work, isSidechain: false, userType: "external", type: m.role, uuid, parentUuid, timestamp: new Date().toISOString(), message };
		parentUuid = uuid;
		return JSON.stringify(entry);
	});
	const path = join(dir, `${id}.jsonl`);
	await Bun.write(path, lines.join("\n") + "\n");
	return { id, path };
};
