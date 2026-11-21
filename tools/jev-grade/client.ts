import { isRecord } from "../measure-tools/measure";
import type { JevRequest } from "./request";

/** Where Jev answers. */
export const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

/** A validated Jev reply. */
export interface JevResponse {
	readonly noul: Readonly<Record<string, number>>;
	readonly inputTokens: number;
	/** The response body as received. */
	readonly raw: unknown;
}

/** The `fetch` shape the client needs. */
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** Waits before a retry. */
export type Sleep = (ms: number) => Promise<void>;

// The API's error docs: 429 and 529 are retried with exponential backoff.
const RETRIES = 3;
const RETRYABLE = new Set([429, 529]);

const parseAnswers = (
	body: unknown,
	ids: readonly string[]
): JevResponse | string => {
	if (!isRecord(body) || !isRecord(body["answers"])) {
		return "response has no answers";
	}
	const noul: Record<string, number> = {};
	for (const id of ids) {
		const answer = body["answers"][id];
		const value = isRecord(answer) ? answer["noul"] : undefined;
		if (typeof value !== "number" || !(value >= 0 && value <= 1)) {
			return `response has no noul from 0 to 1 for question "${id}"`;
		}
		noul[id] = value;
	}
	const usage = body["usage"];
	const tokens = isRecord(usage) ? usage["input_tokens"] : undefined;
	return {
		noul,
		inputTokens: typeof tokens === "number" ? tokens : 0,
		raw: body
	};
};

const post = async (
	request: JevRequest,
	key: string,
	fetchFn: Fetch
): Promise<Response | string> => {
	try {
		return await fetchFn(ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(request)
		});
	} catch (error) {
		return `request failed: ${error instanceof Error ? error.message : String(error)}`;
	}
};

const finish = async (
	response: Response,
	request: JevRequest
): Promise<JevResponse | string> => {
	if (!response.ok) {
		const text = await response.text();
		return `HTTP ${response.status}: ${text.slice(0, 300)}`;
	}
	try {
		const body: unknown = await response.json();
		return parseAnswers(body, Object.keys(request.questions));
	} catch {
		return "response is not JSON";
	}
};

/**
 * Sends one request to Jev.
 *
 * @param request The body to POST.
 * @param key The API key.
 * @param fetchFn The fetch to use.
 * @param sleep The backoff wait.
 * @param attempt The retries used so far.
 * @returns The answers, or a message when the call failed; a failure is never an answer.
 */
export async function callJev(
	request: JevRequest,
	key: string,
	fetchFn: Fetch = fetch,
	sleep: Sleep = (ms) => Bun.sleep(ms),
	attempt = 0
): Promise<JevResponse | string> {
	const response = await post(request, key, fetchFn);
	if (typeof response === "string") {
		return response;
	}
	if (RETRYABLE.has(response.status) && attempt < RETRIES) {
		await sleep(1000 * 2 ** attempt);
		return callJev(request, key, fetchFn, sleep, attempt + 1);
	}
	return finish(response, request);
}
