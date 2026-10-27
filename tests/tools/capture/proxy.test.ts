// Tests of `claudetto-capture` (task 28.4): the proxy runs as a child against a local fake upstream.
// Nothing here uses the network or a real credential.

import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { file as bunFile, spawn as bunSpawn, serve } from "bun";
import { parts } from "../../../dev/capture/domain/report.ts";
import type { Block, Body } from "../../../dev/capture/domain/types.ts";
import { resolveUpstream } from "../../../dev/capture/domain/upstream.ts";
import { REPO, tmpDir } from "../../support/repo.ts";
import { defined } from "../helpers.ts";

const LOOP_RE = /loop/;
const X_RE = /x+/;
const REQUEST_JSONL_RE = /^request-.*\.jsonl$/;

const TOOL = path.join(REPO, "dev/capture/main.ts");

/** The item at `i`, which the tests below know exists. */
const item = <T>(list: readonly T[], i: number): T => defined(list[i]);

/** The blocks of a message `content`, which the tests below know is a list. */
const blocksOf = (content: unknown): Block[] => {
	if (!Array.isArray(content)) {
		throw new Error("the content is not a list of blocks");
	}
	return content;
};

/** One request that the fake upstream received. */
interface Seen {
	url: string;
	headers: Record<string, string>;
	body: string;
}

/** A fake upstream that records each request and answers with JSON. */
const fakeUpstream = async () => {
	const seen: Seen[] = [];
	const server = serve({
		port: 0,
		hostname: "127.0.0.1",
		async fetch(req) {
			seen.push({
				url: new URL(req.url).pathname,
				headers: Object.fromEntries(req.headers),
				body: await req.text(),
			});
			return new Response('{"ok":true}', {
				headers: { "content-type": "application/json" },
			});
		},
	});
	return { seen, server, url: `http://127.0.0.1:${server.port}` };
};

const freePort = async () => {
	const s = serve({
		port: 0,
		hostname: "127.0.0.1",
		fetch: () => new Response(),
	});
	const { port } = s;
	s.stop();
	return port;
};

/** Start the proxy and wait for its `capture:` line. */
const startProxy = async (upstream: string, out: string) => {
	const port = await freePort();
	const child = bunSpawn(
		[
			process.execPath,
			"--no-env-file",
			TOOL,
			"--port",
			String(port),
			"--out",
			out,
			"--upstream",
			upstream,
			"--no-count",
		],
		{ stdin: "ignore", stdout: "pipe", stderr: "pipe" },
	);
	let text = "";
	await new Promise<void>((resolve, reject) => {
		const watchExit = async () => {
			await child.exited;
			reject(new Error(`proxy exited: ${text}`));
		};
		const read = async (stream: ReadableStream<Uint8Array>) => {
			for await (const chunk of stream) {
				text += Buffer.from(chunk).toString("utf8");
				if (text.includes(`capture: http://127.0.0.1:${port}`)) {
					resolve();
				}
			}
		};
		void watchExit();
		void read(child.stdout);
		void read(child.stderr);
	});
	return { child, base: `http://127.0.0.1:${port}` };
};

/** Runs `run` against a proxy in front of a fake upstream, then stops both. */
const withProxy = async (
	run: (ctx: {
		up: Awaited<ReturnType<typeof fakeUpstream>>;
		out: string;
		base: string;
	}) => Promise<void>,
) => {
	const up = await fakeUpstream();
	const out = await tmpDir("capture");
	const { child, base } = await startProxy(up.url, out);
	try {
		await run({ up, out, base });
	} finally {
		child.kill();
		up.server.stop();
	}
};

/** The files of `out` that hold a saved request. */
const requestFiles = async (out: string) =>
	(await readdir(out)).filter((f) => f.startsWith("request-"));

const body = {
	model: "claude-test",
	system: [{ type: "text", text: "be brief" }],
	messages: [{ role: "user", content: "hello" }],
};

test("the proxy saves the body of each `/v1/messages` request, writes no header, and forwards only allowed headers", async () => {
	await withProxy(async ({ up, out, base }) => {
		const res = await fetch(`${base}/v1/messages`, {
			method: "POST",
			headers: {
				authorization: "Bearer SECRET-TOKEN",
				"x-api-key": "SECRET-KEY",
				"anthropic-version": "2023-06-01",
				"content-type": "application/json",
				cookie: "session=private",
				"x-custom": "private",
			},
			body: JSON.stringify(body),
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toStrictEqual({ ok: true });

		expect(up.seen.length).toBe(1);
		const got = defined(up.seen[0]);
		expect(got.url).toBe("/v1/messages");
		expect(JSON.parse(got.body)).toStrictEqual(body);
		expect(got.headers["authorization"]).toBe("Bearer SECRET-TOKEN");
		expect(got.headers["x-api-key"]).toBe("SECRET-KEY");
		expect(got.headers["anthropic-version"]).toBe("2023-06-01");
		expect(got.headers["cookie"]).toBe(undefined);
		expect(got.headers["x-custom"]).toBe(undefined);

		const files = await readdir(out);
		const saved = files.filter((f) => REQUEST_JSONL_RE.test(f));
		expect(saved.length, files.join(", ")).toBe(1);
		// A JSONL file: one record on one line, with a line end.
		const line = await bunFile(path.join(out, defined(saved[0]))).text();
		expect(line.endsWith("\n")).toBe(true);
		expect(line.trimEnd()).not.toContain("\n");
		expect(
			JSON.parse(await bunFile(path.join(out, defined(saved[0]))).text()),
		).toStrictEqual(body);
		const texts = await Promise.all(
			files.map((f) => bunFile(path.join(out, f)).text()),
		);
		for (const [i, f] of files.entries()) {
			const text = texts[i] ?? "";
			expect(!text.includes("SECRET"), `${f} holds a credential`).toBeTruthy();
			expect(
				!text.includes("session=private"),
				`${f} holds a header`,
			).toBeTruthy();
		}
	});
});

test("a request to another path is forwarded and not saved", async () => {
	await withProxy(async ({ up, out, base }) => {
		const res = await fetch(`${base}/v1/other`, {
			method: "POST",
			body: JSON.stringify(body),
		});
		expect(res.status).toBe(200);
		expect(defined(up.seen[0]).url).toBe("/v1/other");
		expect(JSON.parse(defined(up.seen[0]).body)).toStrictEqual(body);
		expect(await requestFiles(out)).toStrictEqual([]);
	});
});

test("a request splits into parts for the system, the tools, and the messages", () => {
	const request = {
		model: "m",
		system: [
			{ type: "text", text: "first" },
			{ type: "text", text: "second" },
		],
		tools: [{ name: "Bash" }, { name: "Later", defer_loading: true }],
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: "one" },
					{ type: "text", text: "two" },
				],
			},
			{ role: "assistant", content: "only block" },
		],
	};
	const list = parts(request);
	// Each index below is a part of `request`, in the order that `parts` returns.
	const at = (i: number) => defined(list[i]);
	expect(list.map((p) => [p.kind, p.name])).toStrictEqual([
		["system", "text: first"],
		["system", "text: second"],
		["tool", "Bash"],
		["tool (deferred)", "Later"],
		["message 0 (user)", "text: one"],
		["message 0 (user)", "text: two"],
	]);
	// `without` returns the request with one part removed and the rest intact.
	expect(at(1).without().system).toStrictEqual([item(request.system, 0)]);
	expect(at(2).without().tools).toStrictEqual([item(request.tools, 1)]);
	const msgs = (b: Body) => b.messages;
	const first = blocksOf(item(request.messages, 0).content);
	expect(item(msgs(at(4).without()), 0).content).toStrictEqual([
		item(first, 1),
	]);
	expect(msgs(at(4).without())[1]).toStrictEqual(request.messages[1]);
});

test("a long text block splits by section, and the only block of a message stays", () => {
	const filler = "x".repeat(1200);
	const text = `intro\n${filler}\n# Part A\n${filler}\n# Part B\nend`;
	const request = {
		model: "m",
		messages: [{ role: "user", content: [{ type: "text", text }] }],
	};
	const list = parts(request);
	expect(list.length).toBe(3);
	expect(list.map((p) => defined(p.name).replace(X_RE, "x"))).toStrictEqual([
		"section: intro x",
		"section: # Part A x",
		"section: # Part B end",
	]);
	expect(list.map((p) => p.chars)).toStrictEqual([
		`intro\n${filler}`.length,
		`# Part A\n${filler}`.length,
		"# Part B\nend".length,
	]);
	const first = item(defined(list[1]).without().messages, 0);
	const rest = item(blocksOf(first.content), 0).text;
	expect(rest).toBe(`intro\n${filler}\n# Part B\nend`);
});

test("the upstream is the flag, then `ANTHROPIC_BASE_URL`, then the Anthropic API", () => {
	const port = 8787;
	expect(
		resolveUpstream({ flag: "http://a.test/", baseUrl: "http://b.test", port }),
	).toBe("http://a.test");
	expect(resolveUpstream({ baseUrl: "http://b.test", port })).toBe(
		"http://b.test",
	);
	expect(resolveUpstream({ port })).toBe("https://api.anthropic.com");
});

test("an upstream that is the address of the proxy is refused", () => {
	for (const url of [
		"http://127.0.0.1:8787",
		"http://localhost:8787/",
		"http://[::1]:8787",
	]) {
		expect(() => resolveUpstream({ baseUrl: url, port: 8787 })).toThrow(
			LOOP_RE,
		);
		expect(() => resolveUpstream({ flag: url, port: 8787 })).toThrow(LOOP_RE);
	}
	// Another port on the same host is a real upstream.
	expect(
		resolveUpstream({ baseUrl: "http://127.0.0.1:9000", port: 8787 }),
	).toBe("http://127.0.0.1:9000");
});

test("the proxy stops with an error when `ANTHROPIC_BASE_URL` is its own address", async () => {
	const port = await freePort();
	const out = await tmpDir("capture");
	const child = bunSpawn(
		[
			process.execPath,
			"--no-env-file",
			TOOL,
			"--port",
			String(port),
			"--out",
			out,
		],
		{
			env: { ...process.env, ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}` },
			stdout: "ignore",
			stderr: "ignore",
		},
	);
	expect(await child.exited).toBe(1);
});

test("a `/v1/messages` body that is not JSON is forwarded unchanged and not saved", async () => {
	await withProxy(async ({ up, out, base }) => {
		const res = await fetch(`${base}/v1/messages`, {
			method: "POST",
			headers: { "content-type": "text/plain" },
			body: "this is not JSON {",
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toStrictEqual({ ok: true });
		expect(defined(up.seen[0]).body).toBe("this is not JSON {");
		expect(await requestFiles(out)).toStrictEqual([]);
	});
});

test("`--port` that is not a whole number from 1 to 65535 stops the proxy with exit 2", async () => {
	const dir = await tmpDir("capture-port");
	const ports = ["abc", "0", "65536", "-1", "1.5", "--clean"];
	const codes = await Promise.all(
		ports.map(
			(port) =>
				bunSpawn(
					[
						process.execPath,
						"--no-env-file",
						TOOL,
						"--port",
						port,
						"--out",
						dir,
						"--upstream",
						"http://127.0.0.1:9",
					],
					{ stdout: "ignore", stderr: "ignore" },
				).exited,
		),
	);
	expect(codes).toStrictEqual(ports.map(() => 2));
});
