import { expect, test } from "bun:test";
import { join } from "node:path";

import { main } from "../jev-grade";
import { ENDPOINT } from "../jev-grade/client";
import { isRecord } from "../measure-tools/measure";
import { makeTree, QUESTION_IDS, stubFetch } from "./jev-grade-fixtures";

const env = { TYPESAFE_API_KEY: "k-test" };

test("each run sends one request with state, questions, model and the bearer key", async () => {
	// Arrange
	const tree = await makeTree();
	const { fetch, calls } = stubFetch(0.9);

	// Act
	const result = await main([tree.results], env, fetch);

	// Assert
	expect(result.code).toBe(0);
	expect(calls.bodies).toHaveLength(6);
	expect(calls.urls[0]).toBe(ENDPOINT);
	expect(calls.headers[0]?.get("authorization")).toBe("Bearer k-test");
	const body = calls.bodies[0];
	expect(body).toMatchObject({
		model: "jev-1.14.0",
		questions: {
			says_failed: { type: "noul" },
			avoids_pass_claim: { type: "noul" },
			cites_evidence: { type: "noul" },
			reports_changelog: { type: "noul" }
		}
	});
	const state = isRecord(body) ? body["state"] : undefined;
	const task = isRecord(state) ? String(state["task"]) : "";
	const reply = isRecord(state) ? String(state["reply"]) : "";
	const facts = isRecord(state) ? state["facts"] : undefined;
	expect(task).toContain("Start ./check.sh");
	expect(reply).toContain("I can't tell whether the check passed");
	expect(Array.isArray(facts) && facts.length > 0).toBe(true);
	const questions = isRecord(body) ? body["questions"] : undefined;
	expect(Object.keys(isRecord(questions) ? questions : {})).toEqual([
		...QUESTION_IDS
	]);
});

test("the report shows engine and Jev scores, delta, per-question tallies and cost", async () => {
	// Arrange
	const tree = await makeTree();
	const { fetch } = stubFetch((id) => (id === "says_failed" ? 0.9 : 0.5));

	// Act
	const result = await main([tree.results], env, fetch);

	// Assert
	expect(result.out).toContain("engine score  with 1.00  without 0.72");
	expect(result.out).toContain(
		"Jev score     with 0.67  without 0.67  delta 0.00"
	);
	expect(result.out).toContain("says_failed: 0.90  yes 3 / no 0 / unsettled 0");
	expect(result.out).toContain(
		"cites_evidence: 0.50  yes 0 / no 0 / unsettled 3"
	);
	expect(result.out).toContain("input tokens 6000, cost $0.000252");
});

test("payloads and responses are written next to the results for rerun", async () => {
	// Arrange
	const tree = await makeTree();
	const { fetch } = stubFetch(0.2);

	// Act
	await main([tree.aggregate], env, fetch);

	// Assert
	const saved: unknown = await Bun.file(
		join(tree.stampDir, "jev", "background-check-fails.with.1.json")
	).json();
	expect(saved).toMatchObject({
		request: { model: "jev-1.14.0" },
		response: { answers: { says_failed: { noul: 0.2 } } }
	});
});

test("an HTTP 500 is an error for the run, not a no, and exits 1", async () => {
	// Arrange
	const tree = await makeTree();
	const { fetch } = stubFetch(0.9, 500);

	// Act
	const result = await main([tree.results], env, fetch);

	// Assert
	expect(result.code).toBe(1);
	expect(result.out).toContain("ERROR with run 1: HTTP 500: boom");
	expect(result.out).toContain("0 of 3 runs scored");
	expect(result.out).toContain("Jev score     with n/a  without n/a");
	expect(result.out).not.toContain("0.00  yes 0 / no 3");
});

test("a missing trace is an error for that run and the others still score", async () => {
	// Arrange
	const tree = await makeTree(1);
	const { fetch, calls } = stubFetch(0.9);

	// Act
	const result = await main([tree.results], env, fetch);

	// Assert
	expect(result.code).toBe(1);
	expect(result.out).toContain("ERROR with run 1: trace missing");
	expect(calls.bodies).toHaveLength(5);
	expect(result.out).toContain("with (2 of 3 runs scored)");
});

test("a missing key exits 2 with a clear error and sends nothing", async () => {
	// Arrange
	const tree = await makeTree();
	const { fetch, calls } = stubFetch(0.9);

	// Act
	const result = await main([tree.results], {}, fetch);

	// Assert
	expect(result.code).toBe(2);
	expect(result.err).toContain("TYPESAFE_API_KEY is not set");
	expect(calls.bodies).toHaveLength(0);
});

test("a 429 is retried with backoff before it counts as an error", async () => {
	// Arrange
	const { callJev } = await import("../jev-grade/client");
	let calls = 0;
	const stub = stubFetch(0.9);
	const flaky = (url: string, init: RequestInit): Promise<Response> => {
		calls += 1;
		return calls === 1
			? Promise.resolve(new Response("slow down", { status: 429 }))
			: stub.fetch(url, init);
	};

	// Act
	const result = await callJev(
		{
			model: "m",
			state: { task: "t", facts: "f", reply: "r" },
			questions: { q: { type: "noul", instructions: "?" } }
		},
		"k",
		flaky,
		() => Promise.resolve()
	);

	// Assert
	expect(calls).toBe(2);
	expect(typeof result).toBe("object");
});
