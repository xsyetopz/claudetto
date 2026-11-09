// `fetch` and `sleep` come from the caller, so a test passes plain values.

// `POST /v1/systemone` and the model alias `jev-latest`: https://docs.typesafe.ai/api/system-one.md
const JEV_API = "https://api.typesafe.ai/v1/systemone";

const TRIES = 3;
const BACKOFF_MS = 1000;
// `$.http.fetch` waits stop the hook clock and the fetch takes no signal, so each try is raced against this.
const TRY_DEADLINE_MS = 5000;
const ERROR_BODY_MAX = 200;

class JevError extends Error {
	readonly status: number | undefined;

	constructor(message: string, status?: number) {
		super(message);
		this.status = status;
	}
}

interface JevReply {
	readonly status: number;
	readonly ok: boolean;
	readonly text: string;
}

interface JevTransport {
	readonly fetch: (
		url: string,
		init: {
			readonly method: string;
			readonly headers: Record<string, string>;
			readonly body: string;
		},
	) => Promise<JevReply>;
	readonly sleep: (
		ms: number,
		options?: { readonly signal: AbortSignal },
	) => Promise<unknown>;
}

export const isRecord = (x: unknown): x is Record<string, unknown> =>
	typeof x === "object" && x !== null && !Array.isArray(x);

const expires = async (
	sleep: JevTransport["sleep"],
	signal: AbortSignal,
): Promise<never> => {
	await sleep(TRY_DEADLINE_MS, { signal });
	throw new JevError("The TypeSafe API did not answer in time.");
};

const withDeadline = async (
	work: Promise<JevReply>,
	sleep: JevTransport["sleep"],
): Promise<JevReply> => {
	const stop = new AbortController();
	try {
		return await Promise.race([work, expires(sleep, stop.signal)]);
	} finally {
		stop.abort();
	}
};

/** Only a 429 or 529 is retried, with doubling backoff (https://docs.typesafe.ai/api/errors.md); a missed deadline is not. */
export const postJev = (
	key: string,
	body: object,
	transport: JevTransport,
): Promise<unknown> => {
	const init = {
		method: "POST",
		headers: {
			authorization: `Bearer ${key}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({ model: "jev-latest", ...body }),
	};
	const attempt = async (i: number): Promise<unknown> => {
		const res = await withDeadline(
			transport.fetch(JEV_API, init),
			transport.sleep,
		);
		if (res.ok) {
			const parsed: unknown = JSON.parse(res.text);
			return isRecord(parsed) ? parsed["answers"] : undefined;
		}
		if ((res.status === 429 || res.status === 529) && i < TRIES - 1) {
			await transport.sleep(BACKOFF_MS * 2 ** i);
			return attempt(i + 1);
		}
		throw new JevError(
			`TypeSafe API ${res.status}: ${res.text.slice(0, ERROR_BODY_MAX)}`,
			res.status,
		);
	};
	return attempt(0);
};
