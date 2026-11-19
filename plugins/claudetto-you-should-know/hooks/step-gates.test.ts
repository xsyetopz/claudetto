import type { Engine } from "claude-code/testing";
import { expect, mock, test } from "claude-code/testing";

import { type Box, offered, PLUGIN, PROPS, pause, REPLY, USAGE } from "./testkit";

type On = Parameters<typeof offered>[1];

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });

const settle = async (): Promise<void> => {
	for (let i = 0; i < 12; i++) {
		await pause();
	}
};

/** A mounted plugin whose model.fork is counted; `surfaces` is what the session reports and `mounts` the surfaces that draw. */
const session = async ($: Engine, on: On, surfaces: string[], mounts: string[]) => {
	const counted = { forks: 0 };
	mock.clock(on, { now: 1000 });
	mock.store(on);
	on("prompt.submit", (_$, e) => ({ ...e }) as never);
	on("session.id", () => ({ value: "s1" }));
	on("session.surfaces", () => ({ value: surfaces as never }));
	on("model.fork", () => {
		counted.forks++;
		return { value: { isAnswered: true as const, text: REPLY, usage: USAGE } };
	});
	on("turn.step", async function* (_$, e) {
		yield { kind: "text", index: 0, text: "" };
		return { turnId: e.turnId, index: e.index, answer: "", toolUses: [], stopReason: "end_turn", usage: null };
	});
	for (const surface of mounts) {
		await $.ui.mount({ plugin: PLUGIN, surface: surface as never, component: "AbovePrompt", props: PROPS as never });
	}
	return counted;
};

const step = async ($: Engine, turnId: string, index: number, agentId?: string): Promise<void> => {
	for await (const _chunk of $.turn.step({ turnId, index, model: "m", messageCount: 1, ...(agentId === undefined ? {} : { agentId }) } as never)) {
		// drained so the step completes
	}
	await settle();
};

test("a sub-agent step passes straight through and never starts a check (REQ-029)", async ($, on) => {
	// Arrange
	const counted = await session($, on, ["terminal"], ["terminal"]);

	// Act
	await step($, "t1", 6, "agent-1");
	const afterSubAgent = counted.forks;
	await step($, "t1", 6);

	// Assert
	expect(afterSubAgent).toBe(0);
	expect(counted.forks).toBe(1);
});

test("a surface that draws no band gets no check (REQ-029)", async ($, on) => {
	// Arrange
	const counted = await session($, on, ["desktop"], []);

	// Act
	await step($, "t1", 6);

	// Assert
	expect(counted.forks).toBe(0);
});

test("a bridge prompt makes the terminal entry not count as a watched band (REQ-029)", async ($, on) => {
	// Arrange
	const counted = await session($, on, ["terminal"], ["terminal"]);

	// Act
	await $.prompt.submit({ text: "from the bridge", origin: { kind: "bridge" }, wait: false } as never);
	await settle();
	await step($, "t2", 6);

	// Assert
	expect(counted.forks).toBe(0);
});

test("a turn that already holds an offer starts no second check, the next turn does (REQ-029)", async ($, on) => {
	// Arrange
	const box = fresh();
	const band = await offered($, on, box);
	await band.press({ key: "Knew this already" });
	await settle();
	const afterOffer = box.forks;

	// Act
	await step($, "t1", 12);
	const sameTurn = box.forks;
	await step($, "t2", 6);

	// Assert
	expect(afterOffer).toBe(1);
	expect(sameTurn).toBe(1);
	expect(box.forks).toBe(2);
});
