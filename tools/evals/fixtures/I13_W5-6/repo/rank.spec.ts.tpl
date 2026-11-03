import { expect, test } from "bun:test";

test("a model ranks the ranges", async () => {
	const key = process.env["ANTHROPIC_API_KEY"];
	if (key === undefined) {
		throw new Error("this test makes a paid API call and needs a key");
	}
	const reply = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
		body: JSON.stringify({
			model: "claude-haiku-5-5",
			max_tokens: 16,
			messages: [{ role: "user", content: "Rank 1-3 against 4-9." }],
		}),
	});
	expect(reply.ok).toBe(true);
});
