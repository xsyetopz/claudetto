import type { On } from "claude-code";

import { fieldOf } from "../../shared/field";

interface Answer {
	value: Record<string, unknown>;
}

/** The engine's answer to a settings read of `key`; `sleep` waits on the test clock. */
type Read = (
	key: unknown,
	sleep: (ms: number) => Promise<void>
) => Promise<Answer> | Answer;

/** Serves a settings file and a store to a session start; records writes and the store. */
export const serve = (
	on: On,
	file: string,
	seed: Record<string, unknown> = {},
	read: Read = () => ({ value: {} })
) => {
	const writes: string[] = [];
	const commands: string[] = [];
	const logs: string[] = [];
	const store = new Map<string, unknown>(Object.entries(seed));
	let current = file;
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined
	}));
	on("settings.read", (h, e) =>
		read(fieldOf(e, "key"), (ms) => h.clock.sleep(ms))
	);
	on("fs.exists", () => ({ value: true }));
	on("fs.read", () => ({ value: current }));
	on("fs.write", (_$, e) => {
		writes.push(e.text);
		current = e.text;
		return { value: undefined };
	});
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, e.value);
		return { value: undefined };
	});
	on("ui.log", (_$, e) => {
		logs.push(e.text);
		return { value: undefined };
	});
	on("command.run", (_$, e) => {
		commands.push(e.command);
		return { text: "Reloaded" };
	});
	const edit = (text: string): void => {
		current = text;
	};
	return { writes, store, commands, logs, edit };
};
