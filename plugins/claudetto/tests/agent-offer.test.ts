// `main` is the thread's own body under the `agent` setting, so the harness's line for it in the
// agent listing names a type no session delegates to. Refusing the offer takes that line out of the
// first message.

import type { AgentOfferInput, On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const offer = (agent: string): AgentOfferInput => ({
	agent,
	description: "Does the work of one step.",
	source: "plugin",
	provider: { plugin: "claudetto", tier: "core" },
});

const listed = (on: On): void => {
	on("agent.offer", () => ({ isOffered: true }));
};

test("the main thread's own agent type is not offered", async ($: Engine, on: On) => {
	listed(on);

	const out = await $.agent.offer(offer("claudetto:main"));

	expect(out.isOffered).toBe(false);
});

test("another agent type of the plugin is still offered", async ($: Engine, on: On) => {
	listed(on);

	const out = await $.agent.offer(offer("claudetto:Hephaestus"));

	expect(out.isOffered).toBe(true);
});
