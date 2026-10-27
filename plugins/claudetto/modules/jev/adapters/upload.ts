// The request of the API for a body and its images, and the POST with a retry (design D1, D2, D3).

import { type JevState, send } from "../domain/jev.ts";
import { ATTEMPT_TIMEOUT_MS } from "../limits.ts";

// A `box` question needs Jev 1.14 (design D3), and a request with images or a `box` needs the header (design D1).
const BOX_MODEL = "jev-1.14.0";
const IMAGES_HEADER = "TypeSafe-Danger-Zone-Images";

/** The body that `jevBody` builds. */
export interface JevRequestBody {
	readonly state: JevState;
	readonly model: string;
	readonly questions: object;
}
/** The body is a JSON string, or a `FormData` for images. */
export interface Request {
	readonly body: string | FormData;
	readonly headers: Record<string, string>;
}

// An object state gets an `images` field and an array gets the lines, so the state keeps its type.
const withImages = (state: JevState, lines: readonly string[]): JevState => {
	if (typeof state === "string") {
		return [state, ...lines].filter(Boolean).join("\n");
	}
	if (lines.length === 0) {
		return state;
	}
	return Array.isArray(state)
		? [...state, ...lines]
		: { ...state, images: lines };
};

/**
 * The request for a body and its images (design D1, D2, D3).
 * Each image gets a UUID in `assets`, a file part `img<n>`, and a state line `Image img<n>: <uuid>`.
 * The model is `jev-1.14.0` when a question has the type `box`.
 */
export const buildRequest = (
	body: JevRequestBody,
	images: readonly Blob[],
): Request => {
	const box = Object.values(body.questions).some((q) => q?.type === "box");
	if (!box && images.length === 0) {
		return { body: JSON.stringify(body), headers: {} };
	}
	const assets: Record<string, object> = {};
	const lines = images.map((_, i) => {
		const id = crypto.randomUUID();
		assets[id] = { type: "image", part: `img${i + 1}` };
		return `Image img${i + 1}: ${id}`;
	});
	const json = {
		...body,
		state: withImages(body.state, lines),
		model: box ? BOX_MODEL : body.model,
		...(images.length > 0 && { assets }),
	};
	const headers = { [IMAGES_HEADER]: "true" };
	if (images.length === 0) {
		return { body: JSON.stringify(json), headers };
	}
	const form = new FormData();
	form.set(
		"request",
		new Blob([JSON.stringify(json)], { type: "application/json" }),
	);
	for (const [i, blob] of images.entries()) {
		form.set(`img${i + 1}`, blob, `img${i + 1}`);
	}
	return { body: form, headers };
};

interface PostOptions {
	readonly images?: readonly Blob[];
	readonly fetchFn?: typeof fetch;
	readonly sleep?: (ms: number) => Promise<void>;
}

/** POST the body, with a retry and backoff on 429 and 529. */
export const post = (
	body: JevRequestBody,
	key: string,
	{
		fetchFn = fetch,
		sleep = globalThis.Bun.sleep,
		images = [],
	}: PostOptions = {},
): Promise<unknown> =>
	// One request for all tries, so a retry sends the same UUIDs.
	send(key, buildRequest(body, images), {
		fetch: async (url, init) => {
			const res = await fetchFn(url, {
				...init,
				signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
			});
			return { status: res.status, ok: res.ok, text: await res.text() };
		},
		sleep,
	});
