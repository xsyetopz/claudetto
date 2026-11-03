import { describe, expect, test } from "bun:test";
import { type ParallelApi, startParallelApi } from "../parallel.ts";

const toolNames = (stream: string): string[] =>
	[...stream.matchAll(/"type":"tool_use","id":"[^"]+","name":"([^"]+)"/g)].map(
		(match) => match[1] ?? "",
	);

const post = async (api: ParallelApi, text: string, results = 0) =>
	(
		await fetch(`${api.url}/v1/messages`, {
			method: "POST",
			body: JSON.stringify({
				stream: true,
				tools: [{ name: "Bash" }],
				messages: [
					{ role: "user", content: text },
					...Array.from({ length: results }, () => ({
						role: "user",
						content: [{ type: "tool_result", content: "ok" }],
					})),
				],
			}),
		})
	).text();

describe("the fake Messages API with parallel calls", () => {
	test("answers the first marked main request with every agent, write, and command at once, and only that one", async () => {
		const api = startParallelApi({ agents: 2, rounds: 1, work: "/w" });
		try {
			const first = await post(api, "PARALLEL go");
			const second = await post(api, "PARALLEL go");

			expect(toolNames(first)).toEqual([
				"Agent",
				"Agent",
				"Write",
				"Write",
				"Write",
				"Bash",
			]);
			expect(toolNames(second)).toEqual([]);
		} finally {
			await api.stop();
		}
	});

	test("gives a subagent one tool call per round, then ends its turn", async () => {
		const api = startParallelApi({ agents: 1, rounds: 2, work: "/w" });
		try {
			const rounds = await Promise.all(
				[0, 1, 2].map((results) => post(api, "SUBTASK 0", results)),
			);

			expect(rounds.map(toolNames)).toEqual([["Bash"], ["Read"], []]);
		} finally {
			await api.stop();
		}
	});
});
