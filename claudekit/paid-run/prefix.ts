// What a cache hit needs from a request: the same tools, system, and leading messages as the warm one.

import { fieldOf } from "../api/json.ts";

/** Whether each part of a request equals the same part of the warm request. */
export interface PrefixMatch {
	readonly tools: boolean;
	readonly system: boolean;
	readonly messages: boolean;
}

const withoutCacheControl = (value: unknown): string =>
	JSON.stringify(value, (key, item: unknown) =>
		key === "cache_control" ? undefined : item,
	);

const asBlocks = (message: unknown): unknown => {
	const content = fieldOf(message, "content");
	return typeof content === "string"
		? { ...new Object(message), content: [{ type: "text", text: content }] }
		: message;
};

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// The first system block carries a billing header that changes per request.
const sharedSystem = (request: unknown): unknown[] =>
	list(fieldOf(request, "system")).slice(1);

/** Compares `tools`, `system` without its first block, and the first messages of `later` with those of `warm`, as many as `warm` holds. */
export const comparePrefix = (warm: unknown, later: unknown): PrefixMatch => {
	const warmMessages = list(fieldOf(warm, "messages"));
	const take = (request: unknown): string =>
		withoutCacheControl(
			list(fieldOf(request, "messages"))
				.slice(0, warmMessages.length)
				.map(asBlocks),
		);
	const same = (a: unknown, b: unknown): boolean =>
		withoutCacheControl(a) === withoutCacheControl(b);
	return {
		tools: same(fieldOf(warm, "tools"), fieldOf(later, "tools")),
		system: same(sharedSystem(warm), sharedSystem(later)),
		messages: take(warm) === take(later),
	};
};
