import { expect, test } from "claude-code/testing";

import {
	blocksOf,
	bodyOf,
	haikuText,
	jevAnswers,
	rig,
	SET,
	SETTLED,
} from "./decider.mock";
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

test("a failed scan sends nothing to Jev and hands the call to the fallback", async () => {
	const { $, fetches, asked, logs } = rig({
		scanFails: true,
		haiku: () => haikuText("{}"),
	});

	await settle($, SET, LEAKY);

	expect(fetches).toHaveLength(0);
	expect(asked).toHaveLength(1);
	expect(logs.join("\n")).toContain("betterleaks");
});

test("a state over the size bound sends nothing to Jev, logs its length, and the fallback answers", async () => {
	const long = { reply: "x".repeat(STATE_MAX_CHARS + 1) };
	const { $, fetches, asked, logs } = rig({ haiku: () => haikuText("{}") });

	await settle($, SET, long);

	expect(fetches).toHaveLength(0);
	expect(asked).toHaveLength(1);
	expect(logs.join("\n")).toContain(String(STATE_MAX_CHARS + 1));
});

test("a state at the size bound still reaches Jev", async () => {
	const { $, fetches } = rig({ jev: () => jevAnswers(SETTLED) });

	await settle($, SET, { reply: "x".repeat(STATE_MAX_CHARS) });

	expect(fetches).toHaveLength(1);
});

test("the fallback gets the state as it is, because its model call is no third-party request", async () => {
	const { $, asked } = rig({ env: {}, haiku: () => haikuText("{}") });

	await settle($, SET, LEAKY);

	const text = blocksOf(asked[0])
		.map((block) => block.text)
		.join("\n");
	expect(text).toContain("hunter2hunter2hunter2");
});
