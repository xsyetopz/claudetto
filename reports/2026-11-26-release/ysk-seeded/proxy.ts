// Seeded-session proxy. Main-loop requests get the case's scripted steps (1.5 s apart, like a real
// turn); the you-should-know side requests (propose and recheck) go to the real Anthropic API, so
// the observer's judgment is a real model's. Other requests (titles and the like) get a stub reply.
// Each side request is logged as one JSON line with its kind, usage and the learn or verdict line.
// Usage: bun proxy.ts <port> <log.jsonl> <case-name> <project-dir>
import { appendFileSync, readdirSync, readFileSync } from "node:fs";

import { streamedReply } from "../../../tools/measure-tools/fake-api";
import { CASES } from "./cases";

const [port, logFile, caseName, dir] = process.argv.slice(2);
const kase = CASES.find((c) => c.name === caseName);
if (kase === undefined || dir === undefined)
	throw new Error(`no case ${caseName}`);
const UPSTREAM = "https://api.anthropic.com";
const OBSERVER = "quiet observer beside a long coding session";
const RECHECK = "A note was shown to the person";

const log = (row: Record<string, unknown>) =>
	appendFileSync(
		logFile ?? "/dev/null",
		`${JSON.stringify({ t: Date.now(), ...row })}\n`
	);

const textOf = (
	sse: string
): { text: string; usage: Record<string, unknown> } => {
	let text = "";
	const usage: Record<string, unknown> = {};
	for (const line of sse.split("\n")) {
		if (!line.startsWith("data: ")) continue;
		try {
			const d = JSON.parse(line.slice(6)) as {
				delta?: { text?: string };
				message?: { usage?: object };
				usage?: object;
			};
			text += d.delta?.text ?? "";
			Object.assign(usage, d.message?.usage ?? {}, d.usage ?? {});
		} catch {}
	}
	return { text, usage };
};

// Replay A/B: with YSK_VARIANTS set to a folder of .txt prompts, each real propose request is sent
// again YSK_REPEAT times per file, with that file's text in place of the propose prompt. The copies
// share the session and its cache, so the prompt is the only difference between them.
const VARIANTS = process.env.YSK_VARIANTS;
const REPEAT = Number(process.env.YSK_REPEAT ?? 3);

async function replay(headers: Headers, url: URL, raw: string): Promise<void> {
	const files = readdirSync(VARIANTS ?? ".").filter((f) => f.endsWith(".txt"));
	const body = JSON.parse(raw) as {
		messages: { content: string | { type: string; text?: string }[] }[];
	};
	const block = body.messages
		.flatMap((m) => (Array.isArray(m.content) ? m.content : []))
		.findLast((c) => c.type === "text" && c.text?.includes(OBSERVER));
	if (block === undefined) {
		log({ kind: "replay-error", error: "no propose block in the messages" });
		return;
	}
	await Promise.all(
		files.flatMap((f) =>
			Array.from({ length: REPEAT }, async () => {
				block.text = readFileSync(`${VARIANTS}/${f}`, "utf8");
				const copy = JSON.stringify(body);
				const res = await fetch(UPSTREAM + url.pathname + url.search, {
					method: "POST",
					headers,
					body: copy
				});
				const { text, usage } = textOf(await res.text());
				log({
					kind: "variant",
					variant: f.replace(/\.txt$/u, ""),
					status: res.status,
					usage,
					line: text.trim().split("\n")[0] ?? "",
					text: text.trim()
				});
			})
		)
	);
}

async function forward(
	req: Request,
	raw: string,
	kind: string
): Promise<Response> {
	const headers = new Headers(req.headers);
	headers.delete("host");
	headers.delete("accept-encoding");
	const url = new URL(req.url);
	const res = await fetch(UPSTREAM + url.pathname + url.search, {
		method: "POST",
		headers,
		body: raw
	});
	const sse = await res.text();
	const { text, usage } = textOf(sse);
	log({
		kind,
		status: res.status,
		usage,
		line: text.trim().split("\n")[0] ?? "",
		text: text.trim()
	});
	if (kind === "propose" && VARIANTS !== undefined)
		void replay(headers, url, raw).catch((e: unknown) =>
			log({ kind: "replay-error", error: String(e) })
		);
	const out = new Headers(res.headers);
	out.delete("content-encoding");
	out.delete("content-length");
	return new Response(sse, { status: res.status, headers: out });
}

const server = Bun.serve({
	port: Number(port),
	hostname: "127.0.0.1",
	idleTimeout: 255,
	async fetch(req) {
		const url = new URL(req.url);
		if (req.method !== "POST" || !url.pathname.startsWith("/v1/messages"))
			return Response.json({});
		const raw = await req.text();
		if (url.pathname.includes("count_tokens"))
			return Response.json({ input_tokens: Math.ceil(raw.length / 4) });
		const body = JSON.parse(raw) as {
			messages?: unknown[];
			system?: unknown;
			tools?: unknown[];
		};
		const text = JSON.stringify([body.system, body.messages]);
		if (text.includes(OBSERVER))
			return forward(req, raw, text.includes(RECHECK) ? "recheck" : "propose");
		if (!body.tools?.length)
			return new Response(streamedReply({ text: "Seeded session" }), {
				headers: { "content-type": "text/event-stream" }
			});
		const n = (
			JSON.stringify(body.messages ?? []).match(/"tool_result"/gu) ?? []
		).length;
		const step = kase.steps[n];
		await Bun.sleep(1500);
		const reply = step === undefined ? { text: kase.reply } : step(dir);
		log({ kind: "main", step: n + 1, end: step === undefined });
		return new Response(streamedReply(reply), {
			headers: { "content-type": "text/event-stream" }
		});
	}
});
console.log(`listening ${server.port}`);
