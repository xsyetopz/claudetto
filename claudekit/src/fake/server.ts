// Fake Messages API process. Run only as a child (`startFake`), so a caller blocked in spawnSync cannot stall it.
// argv: <plan.json> <dir> [forward-url]. Prints `listening <port>` on stdout once ready.
import { join } from "node:path";
import {
	errorBody,
	fallbackReply,
	type MessagesBody,
	outputTokensOf,
	type Plan,
	pickStep,
	type Reply,
	sse,
	usageFor,
} from "./plan.ts";

const REDACT = new Set(["x-api-key", "authorization"]);

const [planPath, dir, forward] = process.argv.slice(2);
if (!(planPath && dir)) {
	throw new Error("usage: bun server.ts <plan.json> <dir> [forward-url]");
}
const plan: Plan = await Bun.file(planPath).json();
const token = Buffer.from(crypto.getRandomValues(new Uint8Array(4))).toString(
	"hex",
);
const used = new Set<number>();
let seq = 0;
let answers = 0;
let previousCacheable = "";

const save = async (n: number, name: string, data: unknown): Promise<void> => {
	await Bun.write(
		join(dir, `${String(n).padStart(4, "0")}.${name}.json`),
		JSON.stringify(data, null, "\t"),
	);
};

const savedHeaders = (req: Request): Record<string, string> => {
	const out: Record<string, string> = {};
	req.headers.forEach((v, k) => {
		out[k] = REDACT.has(k) ? "[REDACTED]" : v;
	});
	return out;
};

const answer = async (
	n: number,
	body: MessagesBody,
	bodyText: string,
): Promise<Response> => {
	const index = pickStep(plan, used, body);
	if (index >= 0) {
		used.add(index);
	}
	const reply: Reply =
		index >= 0
			? (plan.steps[index]?.reply ?? fallbackReply(plan))
			: fallbackReply(plan);
	answers++;
	const id = reply.id ?? `msg_${token}_${answers}`;
	await save(n, "meta", { step: index, id, stream: true });
	if (reply.delayMs) {
		await Bun.sleep(reply.delayMs);
	}
	if (reply.error) {
		return new Response(errorBody(reply.error), {
			status: reply.error.status,
			headers: { "content-type": "application/json" },
		});
	}
	const u = usageFor(bodyText, previousCacheable, outputTokensOf(reply));
	previousCacheable = u.cacheable;
	const text = sse({
		reply,
		id,
		model: body.model ?? "unknown",
		usage: u.usage,
		toolId: (i) => `toolu_${token}_${answers}_${i}`,
	});
	return new Response(text, {
		headers: { "content-type": "text/event-stream" },
	});
};

const passOn = async (
	req: Request,
	n: number,
	bodyText: string,
	path: string,
): Promise<Response> => {
	const headers = new Headers(req.headers);
	headers.delete("host");
	headers.delete("content-length");
	const res = await fetch(new URL(path, forward), {
		method: req.method,
		headers,
		body: bodyText,
	});
	const out = await res.text();
	await Bun.write(join(dir, `${String(n).padStart(4, "0")}.response.txt`), out);
	await save(n, "meta", { forwarded: true, status: res.status });
	return new Response(out, {
		status: res.status,
		headers: { "content-type": res.headers.get("content-type") ?? "" },
	});
};

const server = Bun.serve({
	port: 0,
	hostname: "127.0.0.1",
	idleTimeout: 0,
	fetch: async (req) => {
		seq++;
		const n = seq;
		const url = new URL(req.url);
		const bodyText = req.method === "POST" ? await req.text() : "";
		const body: MessagesBody = bodyText ? JSON.parse(bodyText) : {};
		await save(n, "body", body);
		await save(n, "headers", {
			method: req.method,
			path: url.pathname + url.search,
			headers: savedHeaders(req),
		});
		if (forward) {
			return passOn(req, n, bodyText, url.pathname + url.search);
		}
		if (url.pathname.endsWith("/count_tokens")) {
			await save(n, "meta", { countTokens: true });
			return Response.json({
				input_tokens: usageFor(bodyText, "", 0).usage.input_tokens,
			});
		}
		if (url.pathname.endsWith("/v1/messages")) {
			return answer(n, body, bodyText);
		}
		await save(n, "meta", { unknownPath: true });
		return Response.json(
			{
				type: "error",
				error: { type: "not_found_error", message: url.pathname },
			},
			{ status: 404 },
		);
	},
});

console.info(`listening ${server.port}`);
