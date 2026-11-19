import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

function world(on: On, env: Record<string, string> = {}, fork: unknown = { isAnswered: true, text: "HANDOVER", usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }, rows: { role: "user" | "assistant"; text: string; toolUses: never[] }[] = []) {
	const store = new Map<string, unknown>();
	const ran: string[] = [];
	on("env.get", (_$, e) => ({ value: env[e.name] }));
	on("ui.status", () => ({ value: undefined }));
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, e.value);
		return { value: undefined };
	});
	on("store.delete", (_$, e) => {
		store.delete(e.key);
		return { value: undefined };
	});
	on("model.fork", () => ({ value: fork as never }));
	on("session.messages", () => ({ value: rows }));
	on("process.run", () => ({ value: { exitCode: 0, stdout: "", stderr: "", isStdoutTruncated: false, isStderrTruncated: false } }));
	on("command.run", (_$, e) => {
		ran.push(e.command);
		return { text: "" };
	});
	on("prompt.context", (_$, e) => ({ blocks: e.blocks }));
	return { store, ran };
}

const CLEAR = { command: "clear", args: "", origin: { kind: "composer" }, presentation: { isFullscreen: false, columns: 80 } } as const;

describe("manual clear", () => {
	test("a typed /clear runs and its handover goes out once", async ($, on) => {
		const w = world(on);
		await $.command.run(CLEAR);
		expect(w.ran).toEqual(["clear"]);
		const first = await $.prompt.context({ blocks: [] });
		expect(first.blocks.find((b) => b.name === "claudetto:handover")?.text).toContain("HANDOVER");
		const second = await $.prompt.context({ blocks: [] });
		expect(second.blocks.length).toBe(0);
	});
	test("CLAUDETTO_DISABLE_HANDOVER writes nothing", async ($, on) => {
		const w = world(on, { CLAUDETTO_DISABLE_HANDOVER: "1" });
		await $.command.run(CLEAR);
		expect(w.ran).toEqual(["clear"]);
		expect(w.store.size).toBe(0);
	});
	test("auto handover off keeps the /clear handover", async ($, on) => {
		const w = world(on, { CLAUDETTO_DISABLE_AUTO_HANDOVER: "1" });
		await $.command.run(CLEAR);
		expect(w.store.size).toBe(1);
	});
	test("a recorded pause still holds in the first request after /clear", async ($, on) => {
		// Arrange: no fork text, so the free extract of the transcript writes the handover.
		const pause = "Pause: do not implement anything until I say go.";
		world(on, {}, { isAnswered: false, reason: "nothing-to-fork" }, [{ role: "user", text: pause, toolUses: [] }]);

		// Act
		await $.command.run(CLEAR);
		const first = await $.prompt.context({ blocks: [] });

		// Assert
		expect(first.blocks.find((b) => b.name === "claudetto:handover")?.text).toContain(pause);
	});
	test("a clear that a plugin started writes no handover", async ($, on) => {
		const w = world(on);
		await $.command.run({ ...CLEAR, origin: { kind: "plugin", name: "other" } });
		expect(w.ran).toEqual(["clear"]);
		expect(w.store.size).toBe(0);
	});
});
