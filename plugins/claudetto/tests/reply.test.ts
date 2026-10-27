// Lab tests of the `reply` slice: `Stop` blocks one time a reply that opens with filler, as a stubbed model judges it. No paid call runs.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { ran, stubFreshSession, stubState } from "./stubs/process.ts";

const USAGE = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
};

/** Stubs the `Stop` event, the env, the session, and the model, which answers `verdict`. `world.asked` counts the model calls. */
const stub = (on: On, verdict: "yes" | "no") => {
	const world = { asked: 0 };
	on("classic.Stop", () => ({}));
	on("clock.now", () => ({ value: 1000 }));
	on("session.cwd", () => ({ value: "/p" }));
	// Each process finds nothing, so the other `Stop` rules have no project to check.
	on("process.run", () => ran(""));
	stubFreshSession(on);
	stubState(on, new Map());
	on("env.get", () => ({ value: undefined }));
	on("session.messages", () => ({
		value: [{ role: "user", text: "Use `bun check`.", toolUses: [] }],
	}));
	on("model.complete", () => {
		world.asked += 1;
		return {
			value: {
				isAnswered: true,
				text: `<block>${verdict}</block><reason>x</reason>`,
				usage: USAGE,
			},
		};
	});
	return world;
};

const stop = ($: Engine, isActive: boolean, reply: string) =>
	$.classic.Stop({ stop_hook_active: isActive, last_assistant_message: reply });

test("Reply Opening: a reply that the model finds to open with agreement blocks the stop, and the reason asks for the outcome first", async ($: Engine, on: On) => {
	const world = stub(on, "yes");
	const out = await stop($, false, "You're right, and the mistake was mine.");
	expect(out.block).toContain("outcome or the next action");
	expect(out.block).toContain("first words");
	expect(world.asked).toBe(1);
});

test("Reply Opening: a reply with the outcome first lets the stop go", async ($: Engine, on: On) => {
	stub(on, "no");
	const out = await stop($, false, "`bun check` reports 2 faults.");
	expect(out.block).toBeUndefined();
});

test("Reply Opening: a stop that a hook blocked before goes on, with no model call", async ($: Engine, on: On) => {
	const world = stub(on, "yes");
	const out = await stop($, true, "You're right.");
	expect(out.block).toBeUndefined();
	expect(world.asked).toBe(0);
});

test("Reply Opening: a reply with no text makes no model call", async ($: Engine, on: On) => {
	const world = stub(on, "yes");
	expect((await stop($, false, "")).block).toBeUndefined();
	expect(world.asked).toBe(0);
});
