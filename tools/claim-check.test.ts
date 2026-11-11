import { expect, test } from "bun:test";

import {
	type Engine,
	host,
	newCtx,
} from "./claim-check-plugin/hooks/client.ts";
import { runJob } from "./claim-check-plugin/hooks/run.ts";
import { field } from "./claim-check-prices.ts";
import { finalLine } from "./claim-check-report.ts";

const PRICE = { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 };
const MODEL = "claude-haiku-5-5";

const engine = (written: string[]): Engine => ({
	env: { get: () => Promise.resolve("") },
	http: {
		fetch: () =>
			Promise.resolve({ status: 200, ok: true, headers: {}, text: "" }),
	},
	process: { run: () => Promise.reject(new Error("unused")) },
	clock: { sleep: () => Promise.resolve() },
	model: {
		complete: () =>
			Promise.resolve({
				isAnswered: true,
				text: "ok",
				usage: {
					input_tokens: 10,
					output_tokens: 5,
					cache_read_input_tokens: 2,
					cache_creation_input_tokens: 1,
				},
			}),
	},
	ui: { log: () => "" },
	fs: {
		write: (path) => {
			written.push(path);
			return Promise.resolve();
		},
	},
});

test("a request is saved and its tokens are added to its model's total", async () => {
	const written: string[] = [];
	const ctx = newCtx({
		typesafeUrl: "",
		prices: { [MODEL]: PRICE },
		maxUsd: 1,
		outDir: "/out",
	});
	ctx.caseId = "c1";
	ctx.label = "haiku";
	const result = await host(engine(written), ctx).model.complete({
		model: MODEL,
		prompt: "x",
		maxTokens: 8,
	});
	expect(result.isAnswered).toBe(true);
	expect(written).toEqual([
		"/out/c1.haiku.1.json",
		"/out/c1.haiku.1.response.json",
	]);
	expect(ctx.tokens.get(MODEL)?.output_tokens).toBe(5);
	expect(
		finalLine({
			title: "t",
			extra: [],
			roads: new Map(),
			calls: [],
			jev: ctx.jev,
			tokens: ctx.tokens,
			usd: ctx.usd,
			stopped: false,
			failure: undefined,
			logLines: 0,
		}),
	).toContain(`${MODEL} in 10 out 5 cache-read 2 cache-write 1`);
});

test("a request whose worst case passes the cap is not sent", async () => {
	const written: string[] = [];
	const ctx = newCtx({
		typesafeUrl: "",
		prices: { [MODEL]: PRICE },
		maxUsd: 1e-6,
		outDir: "/out",
	});
	const result = await host(engine(written), ctx).model.complete({
		model: MODEL,
		prompt: "x",
		maxTokens: 8,
	});
	expect(result).toMatchObject({ isAnswered: false, reason: "aborted" });
	expect(ctx.stopped).toBe(true);
	expect(written).toEqual([]);
});

const gateCase = (id: string) =>
	JSON.stringify({
		id,
		input: { said: ["Delete old-feature."], branch: "old-feature" },
		expected: true,
	});

test("a model call that gives no answer stops the run with an error", async () => {
	const files = new Map<string, string>();
	await runJob(
		{
			...engine([]),
			model: {
				complete: () =>
					Promise.resolve({
						isAnswered: false,
						reason: "api-error",
						status: 401,
						error: "authentication_failed",
						usage: {
							input_tokens: 0,
							output_tokens: 0,
							cache_read_input_tokens: 0,
							cache_creation_input_tokens: 0,
						},
					}),
			},
			fs: {
				write: (path, text) => {
					files.set(path, text);
					return Promise.resolve();
				},
			},
		},
		{
			kind: "branch-gate",
			cases: `${gateCase("c1")}\n${gateCase("c2")}`,
			prices: { [MODEL]: PRICE },
			maxUsd: 1,
			typesafeUrl: "",
			outDir: "/out",
			summaryPath: "/out/summary.md",
			finalPath: "/out/final.json",
		},
	);
	const final: unknown = JSON.parse(String(files.get("/out/final.json")));
	expect(field(final, "code")).toBe(1);
	expect(field(final, "line")).toContain(
		"A model call of case c1 gave no answer (api-error: authentication_failed)",
	);
	expect(files.get("/out/summary.md")).toContain("Cases scored: 0.");
	expect(files.get("/out/summary.md")).toContain("authentication_failed");
	expect(files.has("/out/c2.decider-fallback.1.json")).toBe(false);
});
