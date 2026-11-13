import { expect, test } from "claude-code/testing";

import { bodyOf, jevAnswers, rig, SET, SETTLED } from "./decider.mock";
import { STATE_MAX_CHARS } from "./redact";
import { settle } from "./settle";

const LEAKY = {
	reply: "I set the variable.\nexport API_TOKEN=hunter2hunter2hunter2\nDone.",
	prompt: "Please store it.",
};

test("a secret after a line break in a state field is redacted in the request to Jev", async () => {
	const { $, fetches } = rig({ jev: () => jevAnswers(SETTLED) });

	await settle($, SET, LEAKY);

	const [sent] = fetches;
	const body = JSON.stringify(bodyOf(sent));
	expect(body).not.toContain("hunter2hunter2hunter2");
	expect(body).toContain("[REDACTED]");
	expect(bodyOf(sent)["state"]).toEqual({
		reply: "I set the variable.\nexport API_TOKEN=[REDACTED]\nDone.",
		prompt: "Please store it.",
	});
});

test("every field goes through one scanner process, joined by line breaks as raw text", async () => {
	const { $, scans } = rig({ jev: () => jevAnswers(SETTLED) });

	await settle($, SET, LEAKY);

	expect(scans).toEqual([`${LEAKY.reply}\n${LEAKY.prompt}`]);
});

test("a state with no secret reaches Jev unchanged", async () => {
	const { $, fetches } = rig({ jev: () => jevAnswers(SETTLED) });

	await settle($, SET, { reply: "All done." });

	expect(bodyOf(fetches[0])["state"]).toEqual({ reply: "All done." });
});

test("a failed scan sends nothing to Jev and leaves every question unsettled", async () => {
	const { $, fetches, logs } = rig({ scanFails: true });

	const answers = await settle($, SET, LEAKY);

	expect(fetches).toHaveLength(0);
	expect(answers).toEqual({ done: "unsettled", store: "unsettled" });
	expect(logs.join("\n")).toContain("betterleaks");
});

test("a state over the size bound sends nothing to Jev and logs its length", async () => {
	const long = { reply: "x".repeat(STATE_MAX_CHARS + 1) };
	const { $, fetches, logs } = rig();

	await settle($, SET, long);

	expect(fetches).toHaveLength(0);
	expect(logs.join("\n")).toContain(String(STATE_MAX_CHARS + 1));
});

test("a state at the size bound still reaches Jev", async () => {
	const { $, fetches } = rig({ jev: () => jevAnswers(SETTLED) });

	await settle($, SET, { reply: "x".repeat(STATE_MAX_CHARS) });

	expect(fetches).toHaveLength(1);
});
