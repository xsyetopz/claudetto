import { expect, test } from "bun:test";

import {
	type Engine,
	host,
	newCtx,
} from "./claim-check-plugin/hooks/client.ts";
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
