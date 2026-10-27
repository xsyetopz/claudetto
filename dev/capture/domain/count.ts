import { COUNT_ATTEMPTS, COUNT_BACKOFF_MS } from "../../../tools/limits.ts";
import type { Body, Wait } from "./types.ts";

const AUTH_HEADER = /^(?:authorization|x-api-key)$/i;
const BEARER_PREFIX = /^Bearer\s+/i;

export const countable = (body: Body) => {
	const { model, system, tools, messages, thinking, tool_choice } = body;
	return { model, system, tools, messages, thinking, tool_choice };
};

const credentials = (headers: Record<string, string>): string[] =>
	Object.entries(headers)
		.filter(([name]) => AUTH_HEADER.test(name))
		.flatMap(([, value]) => [value, value.replace(BEARER_PREFIX, "")])
		.filter((value) => value.length > 0);

// The credential of the request never reaches an error text.
export const redact = (
	text: string,
	headers: Record<string, string>,
): string => {
	let out = text;
	for (const secret of credentials(headers)) {
		out = out.split(secret).join("[redacted]");
	}
	return out;
};

/** The `message` of `e` when it is a string, such as on a thrown object that is not an `Error`, and else the text of `e`. */
const messageText = (e: unknown): string => {
	if (e instanceof Error) {
		return e.message;
	}
	if (typeof e === "object" && e !== null && "message" in e) {
		return typeof e.message === "string" ? e.message : String(e);
	}
	return String(e);
};

/** The error `e` with its text redacted, and with no `cause`, because `e` can hold the login headers. */
const redactedError = (e: unknown, headers: Record<string, string>): Error =>
	new Error(redact(messageText(e), headers));

export const readCount = (text: string): number => {
	const parsed: unknown = JSON.parse(text);
	const count =
		typeof parsed === "object" && parsed !== null && "input_tokens" in parsed
			? parsed.input_tokens
			: undefined;
	if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
		throw new Error(
			`count_tokens reply has no input_tokens: ${text.slice(0, 300)}`,
		);
	}
	return count;
};

export const countTokens = async (
	upstream: string,
	body: Body,
	headers: Record<string, string>,
	query: string,
	wait: Wait,
): Promise<number> => {
	const send = () =>
		fetch(`${upstream}/v1/messages/count_tokens${query}`, {
			method: "POST",
			headers,
			body: JSON.stringify(countable(body)),
		});
	const retry = async (
		res: Response,
		delay: number,
		tries: number,
	): Promise<Response> => {
		if (res.status !== 429 || tries >= COUNT_ATTEMPTS) {
			return res;
		}
		await wait(delay);
		return retry(await send(), delay * 2, tries + 1);
	};
	try {
		const res = await retry(await send(), COUNT_BACKOFF_MS, 1);
		// Read the text before the status, so a reply that is not JSON keeps its status.
		const text = await res.text();
		if (!res.ok) {
			throw new Error(`count_tokens ${res.status}: ${text.slice(0, 300)}`);
		}
		return readCount(text);
	} catch (e) {
		throw redactedError(e, headers);
	}
};
