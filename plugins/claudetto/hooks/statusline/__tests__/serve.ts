import type { On } from "claude-code";

import { readState } from "../line/state";

/** Serves the engine calls the live state needs; returns a reader of the state file written. */
export const serve = (on: On, result: unknown = "ok") => {
	const files = new Map<string, string>();
	on("env.get", (_$, e) => ({
		value: e.name === "CLAUDE_CONFIG_DIR" ? "/cfg" : undefined
	}));
	on("session.id", () => ({ value: "s1" }));
	on("clock.now", () => ({ value: 1_000_000 }));
	on("fs.write", (_$, e) => {
		files.set(e.path, e.text);
		return { value: undefined };
	});
	on("tool.check", () => ({ decision: "ask" }));
	on("classic.PermissionRequest", () => ({}));
	on("tool.run", () => ({ result }));
	on("agent.spawn", (_$, e) => ({
		model: "m",
		agentId: `id-${e.description}`
	}));
	on("agent.report", (_$, e) => ({ text: e.text }));
	on("turn.start", (_$, e) => ({ turnId: e.turnId }));
	on("turn.complete", (_$, e) => ({ text: e.answer }));
	return () => readState(files.get("/cfg/claudetto/status/s1.json"));
};
