import type { On } from "claude-code";
import { describe, type Engine, expect, mock, test } from "claude-code/testing";

import { decide, NO_AT, read, YES_AT } from "../decide";
import { ratingsFrom } from "../judge";
import { JUDGMENTS } from "../questions";

const [VERDICT, FACT] = JUDGMENTS;

describe("pre-decide truth table", () => {
	test("reads 0.7 and above as yes, 0.3 and below as no, between as unsettled", () => {
		expect(read(YES_AT)).toBe("yes");
		expect(read(NO_AT)).toBe("no");
		expect(read(0.5)).toBe("unsettled");
	});

	test("a yes adds its note, a no or an unsettled rating adds none", () => {
		expect(
			decide({ asks_verdict_only: 0.9, states_checkable_fact: 0.1 })
		).toEqual([VERDICT?.note]);
		expect(
			decide({ asks_verdict_only: 0.5, states_checkable_fact: 0.3 })
		).toEqual([]);
		expect(
			decide({ asks_verdict_only: 0.8, states_checkable_fact: 0.99 })
		).toEqual([VERDICT?.note, FACT?.note]);
	});

	test("a rating outside 0..1 or missing is an error, not a no", () => {
		expect(() =>
			ratingsFrom(JUDGMENTS, { asks_verdict_only: 2, states_checkable_fact: 0 })
		).toThrow();
		expect(() => ratingsFrom(JUDGMENTS, { asks_verdict_only: 0.2 })).toThrow();
	});
});

/** The bottom of the chain: the prompt as it entered. */
const enter = (on: On): void => {
	on("prompt.submit", (_$, e) => ({
		text: e.text,
		...(e.context === undefined ? {} : { context: e.context })
	}));
};

const submit = ($: Engine, text: string) =>
	$.prompt.submit({ text, wait: false, origin: { kind: "composer" } });

const USAGE = {
	input_tokens: 1,
	output_tokens: 1,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0
} as const;

const PROMPT = "Good idea to cache the nonce at load time?";

describe("pre-decide hook", () => {
	test("a failed Jev call routes to the fallback, whose yes adds the note", async ($, on) => {
		// Arrange
		on("env.get", () => ({ value: "synthetic-test-key" }));
		on("http.fetch", () => ({
			value: { status: 500, ok: false, headers: {}, text: "boom" }
		}));
		on("model.complete", () => ({
			value: {
				isAnswered: true,
				text: '{"asks_verdict_only": 0.95, "states_checkable_fact": 0.02}',
				usage: USAGE
			}
		}));
		on("ui.log", () => ({ value: undefined }));
		mock.clock(on, { now: 1000 });
		enter(on);

		// Act
		const r = await submit($, PROMPT);

		// Assert
		expect(r.context).toEqual([VERDICT?.note]);
	});

	test("Jev's ratings decide without the fallback", async ($, on) => {
		// Arrange
		on("env.get", () => ({ value: "synthetic-test-key" }));
		on("http.fetch", () => ({
			value: {
				status: 200,
				ok: true,
				headers: {},
				text: JSON.stringify({
					answers: {
						asks_verdict_only: { type: "noul", noul: 0.1 },
						states_checkable_fact: { type: "noul", noul: 0.9 }
					}
				})
			}
		}));
		on("ui.log", () => ({ value: undefined }));
		mock.clock(on, { now: 1000 });
		enter(on);

		// Act
		const r = await submit($, "The port is 3000, fix the README.");

		// Assert
		expect(r.context).toEqual([FACT?.note]);
	});

	test("both services failing leaves the prompt unchanged", async ($, on) => {
		// Arrange
		on("env.get", () => ({ value: "synthetic-test-key" }));
		on("http.fetch", () => ({
			value: { status: 500, ok: false, headers: {}, text: "" }
		}));
		on("model.complete", () => ({
			value: {
				isAnswered: false,
				reason: "api-error",
				status: 500,
				error: "server_error",
				usage: USAGE
			}
		}));
		on("ui.log", () => ({ value: undefined }));
		mock.clock(on, { now: 1000 });
		enter(on);

		// Act
		const r = await submit($, PROMPT);

		// Assert
		expect(r.context).toBeUndefined();
	});
});
