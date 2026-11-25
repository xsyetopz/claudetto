import type { RenderSurface } from "claude-code";
import type { Engine } from "claude-code/testing";
import { expect, mock, test } from "claude-code/testing";

import {
	type Box,
	inOrder,
	MOUNT,
	offered,
	PLUGIN,
	PROPS,
	REPLY,
	settle,
	stepTurn,
	stubSteps,
	submitTyped,
	USAGE
} from "../../__tests__/testkit";

type On = Parameters<typeof offered>[1];

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });

/** A mounted plugin whose model.fork is counted; `surfaces` is what the session reports and `mounts` the surfaces that draw. */
const session = async (
	$: Engine,
	on: On,
	surfaces: RenderSurface[],
	mounts: RenderSurface[]
) => {
	const counted = { forks: 0 };
	mock.clock(on, { now: 1000 });
	mock.store(on);
	on("prompt.submit", (_$, e) => ({ ...e }));
	on("session.id", () => ({ value: "s1" }));
	on("session.surfaces", () => ({ value: surfaces }));
	on("model.fork", () => {
		counted.forks++;
		return { value: { isAnswered: true as const, text: REPLY, usage: USAGE } };
	});
	stubSteps(on);
	await inOrder(mounts, (surface) =>
		$.ui.mount({
			plugin: PLUGIN,
			surface,
			component: "AbovePrompt",
			props: PROPS
		})
	);
	return counted;
};

const step = async (
	$: Engine,
	turnId: string,
	index: number,
	agentId?: string
): Promise<void> => {
	await stepTurn($, turnId, index, agentId);
	await settle();
};

test(
	"a sub-agent step passes straight through and never starts a check (REQ-029)",
	MOUNT,
	async ($, on) => {
		// Arrange
		const counted = await session($, on, ["terminal"], ["terminal"]);

		// Act
		await step($, "t1", 6, "agent-1");
		const afterSubAgent = counted.forks;
		await step($, "t1", 6);

		// Assert
		expect(afterSubAgent).toBe(0);
		expect(counted.forks).toBe(1);
	}
);

test(
	"a surface that draws no band gets no check (REQ-029)",
	MOUNT,
	async ($, on) => {
		// Arrange
		const counted = await session($, on, ["desktop"], []);

		// Act
		await step($, "t1", 6);

		// Assert
		expect(counted.forks).toBe(0);
	}
);

test(
	"a bridge prompt makes the terminal entry not count as a watched band (REQ-029)",
	MOUNT,
	async ($, on) => {
		// Arrange
		const counted = await session($, on, ["terminal"], ["terminal"]);

		// Act
		await submitTyped($, "from the bridge", "bridge");
		await settle();
		await step($, "t2", 6);

		// Assert
		expect(counted.forks).toBe(0);
	}
);

test(
	"a turn that already holds an offer starts no second check, the next turn does (REQ-029)",
	MOUNT,
	async ($, on) => {
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
	}
);

test(
	"a turn starts no check on its first step and checks again as it runs on",
	MOUNT,
	async ($, on) => {
		// Arrange
		const counted = await session($, on, ["terminal"], ["terminal"]);

		// Act
		await step($, "t1", 0);
		const first = counted.forks;
		await step($, "t2", 1);
		await step($, "t3", 2);
		const early = counted.forks;
		await step($, "t4", 3);

		// Assert
		expect(first).toBe(0);
		expect(early).toBe(0);
		expect(counted.forks).toBe(1);
	}
);
