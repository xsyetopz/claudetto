import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { serve, write } from "bun";
import { sizeRequest, sizingLines } from "../domain/report.ts";
import type { Body } from "../domain/types.ts";
import { resolveUpstream } from "../domain/upstream.ts";
import { BODY_NOT_JSON, OUT_MISSING, PORT_INVALID, USAGE } from "../prompts.ts";

const DIGITS = /^\d+$/;

/** The name of the scratch folder of `claudetto-capture` in the temp folder. */
const CAPTURE_TEMP = "claudetto-capture";

// Only these headers go upstream, and the proxy never writes a request header, because the headers carry the credential.
const PASS =
	/^(authorization|x-api-key|anthropic-.*|content-type|user-agent|x-app|x-stainless-.*)$/i;

const passHeaders = (headers: Headers): Headers => {
	const kept = new Headers();
	for (const [name, value] of headers) {
		if (PASS.test(name)) {
			kept.set(name, value);
		}
	}
	return kept;
};

const messageOf = (e: unknown): string =>
	e instanceof Error ? e.message : String(e);

// HEAD records any JSON value that is not `null`, so this guard only rejects `null`.
const isBody = (v: unknown): v is Body => v !== null;

export const main = async (
	args: string[],
	env: NodeJS.ProcessEnv = process.env,
): Promise<number> => {
	if (args.includes("--help") || args.includes("-h")) {
		process.stdout.write(`${USAGE}\n`);
		return 0;
	}
	const flag = (name: string, fallback: string | null): string | null => {
		const i = args.indexOf(name);
		return i === -1 ? fallback : (args[i + 1] ?? null);
	};
	const portArg = flag("--port", "8787") ?? "";
	const port = DIGITS.test(portArg) ? Number(portArg) : 0;
	if (port < 1 || port > 65_535) {
		console.error(PORT_INVALID({ port: portArg }));
		return 2;
	}
	const defaultOut = path.join(env["TMPDIR"] || os.tmpdir(), CAPTURE_TEMP);
	const out = flag("--out", defaultOut);
	if (out === null) {
		console.error(OUT_MISSING);
		return 2;
	}
	const baseUrl = env["ANTHROPIC_BASE_URL"];
	let upstream: string;
	try {
		// `resolveUpstream` throws when the upstream is the proxy itself, because requests would loop.
		upstream = resolveUpstream({
			flag: flag("--upstream", null),
			...(baseUrl === undefined ? {} : { baseUrl }),
			port,
		});
	} catch (e) {
		console.error(`capture: ${messageOf(e)}`);
		return 1;
	}
	const count = !args.includes("--no-count");
	await mkdir(out, { recursive: true });

	const run = new Date().toISOString().replace(/[:.]/g, "-");
	let seen = 0;
	let counted = false;

	const save = (name: string, text: string) =>
		write(path.join(out, name), `${text}\n`);

	const size = (n: string, body: Body, req: Request): void => {
		counted = true;
		void (async () => {
			try {
				const sizing = await sizeRequest(
					upstream,
					body,
					Object.fromEntries(passHeaders(req.headers)),
					new URL(req.url).search,
				);
				await save(`report-${n}.jsonl`, JSON.stringify(sizing));
				for (const line of sizingLines(n, sizing)) {
					process.stdout.write(`${line}\n`);
				}
			} catch (e) {
				console.error(String(e));
				await save(
					`error-${n}.txt`,
					e instanceof Error ? (e.stack ?? String(e)) : String(e),
				);
			}
		})();
	};

	const record = async (raw: Buffer, req: Request): Promise<void> => {
		let body: Body | null = null;
		try {
			const parsed: unknown = JSON.parse(raw.toString("utf8"));
			body = isBody(parsed) ? parsed : null;
		} catch {
			body = null;
		}
		if (body === null) {
			console.error(BODY_NOT_JSON);
			return;
		}
		const n = `${run}-${++seen}`;
		await save(`request-${n}.jsonl`, JSON.stringify(body));
		process.stdout.write(
			`request ${n}: ${body.model}, ${raw.byteLength} bytes, saved\n`,
		);
		if (count && !counted && body.tools?.length) {
			size(n, body, req);
		}
	};

	const handle = async (req: Request): Promise<Response> => {
		const url = new URL(req.url);
		const headers = passHeaders(req.headers);
		const raw =
			req.method === "GET" || req.method === "HEAD"
				? undefined
				: Buffer.from(await req.arrayBuffer());
		if (url.pathname === "/v1/messages" && raw) {
			await record(raw, req);
		}
		// A client that goes away, such as an Esc in Claude Code, ends the upstream request too.
		const back_ = await fetch(`${upstream}${url.pathname}${url.search}`, {
			method: req.method,
			headers,
			body: raw,
			signal: req.signal,
		});
		// fetch decodes the body, so the encoding and length headers no longer apply.
		const back = new Headers(back_.headers);
		back.delete("content-encoding");
		back.delete("content-length");
		return new Response(back_.body, { status: back_.status, headers: back });
	};

	try {
		serve({
			port,
			hostname: "127.0.0.1",
			idleTimeout: 0,
			fetch: (req) =>
				handle(req).catch((e: Error) => {
					if (e.name === "AbortError") {
						return new Response(null);
					}
					console.error(String(e));
					return new Response(null, { status: 500 });
				}),
		});
	} catch (e) {
		console.error(
			`capture: cannot listen on 127.0.0.1:${port}: ${messageOf(e)}`,
		);
		return 1;
	}
	process.stdout.write(
		`capture: http://127.0.0.1:${port} -> ${upstream}, bodies in ${out}\n`,
	);
	return 0;
};
