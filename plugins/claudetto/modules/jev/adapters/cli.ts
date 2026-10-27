// The command `claudetto-decide`: it asks the TypeSafe API for one answer, and prints it. It runs on Bun, and the mod calls the API itself (`adapters/mod.ts`).
// The key comes in `TYPESAFE_API_KEY`, never in the arguments. The state is text or `-` for stdin, never a file path, because a path would send a file to the API (design D8).
// `ask` takes no `--state` and no `--json`: the JSON on stdin has the state, and the output is JSON. A `--` ends the flags.

import { boxOf, formatAnswer, formatBox } from "../domain/answers.ts";
import {
	ApiError,
	isRecord,
	type JevState,
	jevBody,
	send,
} from "../domain/jev.ts";
import { ATTEMPT_TIMEOUT_MS, MAX_OPTIONS, MIN_OPTIONS } from "../limits.ts";
import {
	ERROR_ASK_FLAGS,
	ERROR_ASK_QUESTIONS,
	ERROR_ASK_STDIN,
	ERROR_BOX_IMAGE,
	ERROR_IMAGE_PATH,
	ERROR_NO_KEY,
	ERROR_PICK_OPTIONS,
	ERROR_QUESTION_MISSING,
	ERROR_VERB,
	INFO_IMAGE_SCALED,
	INFO_IMAGE_SCALED_MAX,
} from "../prompts.ts";
import {
	type ImageSize,
	imageSize,
	type LoadedImage,
	type ReadOptions,
	readImage,
	type Scaler,
	sizeText,
	UsageError,
} from "./image.ts";

export type { ImageSize, LoadedImage, ReadOptions, Scaler };
export { ApiError, imageSize, UsageError };

export const EXIT = {
	ok: 0,
	failed: 1,
	usage: 2,
	invalidKey: 3,
	noBalance: 4,
} as const;

// A `box` question needs Jev 1.14 (design D3), and a request with images or a `box` needs the header (design D1).
const BOX_MODEL = "jev-1.14.0";
const IMAGES_HEADER = "TypeSafe-Danger-Zone-Images";

/** The body that `jevBody` builds. */
export interface JevRequestBody {
	readonly state: JevState;
	readonly model: string;
	readonly questions: object;
}

export interface Args {
	readonly kind: "yes" | "pick" | "ask" | "box";
	readonly words: readonly string[];
	readonly state: string | undefined;
	readonly json: boolean;
	readonly images: readonly string[];
}

const isKind = (verb: string | undefined): verb is Args["kind"] =>
	verb === "yes" || verb === "pick" || verb === "ask" || verb === "box";

const imagePath = (path: string | undefined): string => {
	if (!path || path.startsWith("-")) {
		throw new UsageError(ERROR_IMAGE_PATH);
	}
	return path;
};

const parseFlags = (rest: readonly string[]) => {
	let state: string | undefined;
	let json = false;
	const images: string[] = [];
	const words: string[] = [];
	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i] ?? "";
		if (arg === "--") {
			words.push(...rest.slice(i + 1));
			break;
		}
		switch (arg) {
			case "--state":
				state = rest[++i] ?? "";
				break;
			case "--json":
				json = true;
				break;
			case "--image":
				images.push(imagePath(rest[++i]));
				break;
			default:
				words.push(arg);
		}
	}
	return { state, json, images, words };
};

/** The parsed arguments of the command. The words after `--` are literal words. */
export const parseArgs = (argv: readonly string[]): Args => {
	const [verb, ...rest] = argv;
	if (!isKind(verb)) {
		throw new UsageError(ERROR_VERB({ verb: verb ?? "" }));
	}
	const { state, json, images, words } = parseFlags(rest);
	if (verb === "ask" && (state !== undefined || json)) {
		throw new UsageError(ERROR_ASK_FLAGS);
	}
	return { kind: verb, words, state, json, images };
};

const askBody = async (
	stdin: () => Promise<string>,
): Promise<JevRequestBody> => {
	let req: unknown;
	try {
		req = JSON.parse(await stdin());
	} catch (err) {
		throw new UsageError(ERROR_ASK_STDIN, { cause: err });
	}
	const { questions, state } = isRecord(req) ? req : {};
	if (typeof questions !== "object" || questions === null) {
		throw new UsageError(ERROR_ASK_QUESTIONS);
	}
	return jevBody(
		typeof state === "string" || (typeof state === "object" && state !== null)
			? state
			: "",
		questions,
	);
};

/** The request body of the API for the arguments. `-` reads the state from stdin. */
export const buildBody = async (
	args: Args,
	stdin: () => Promise<string>,
): Promise<JevRequestBody> => {
	if (args.kind === "ask") {
		return askBody(stdin);
	}
	const { kind, words, state } = args;
	const [question, ...items] = words;
	if (!question) {
		throw new UsageError(ERROR_QUESTION_MISSING);
	}
	const text = state === "-" ? await stdin() : (state ?? "");
	if (kind === "box" && args.images.length === 0) {
		throw new UsageError(ERROR_BOX_IMAGE);
	}
	if (
		kind === "pick" &&
		(items.length < MIN_OPTIONS || items.length > MAX_OPTIONS)
	) {
		throw new UsageError(ERROR_PICK_OPTIONS);
	}
	const criteria = Object.fromEntries(
		items.map((item) => {
			const at = item.indexOf("=");
			return at > 0 ? [item.slice(0, at), item.slice(at + 1)] : [item, null];
		}),
	);
	const type = { yes: "noul", box: "box", pick: "choice" }[kind];
	return jevBody(text, {
		q: { type, instructions: question, ...(kind === "pick" && { criteria }) },
	});
};

export const exitOf = (err: unknown): number => {
	if (err instanceof UsageError) {
		return EXIT.usage;
	}
	if (err instanceof ApiError && err.status === 401) {
		return EXIT.invalidKey;
	}
	if (err instanceof ApiError && err.status === 402) {
		return EXIT.noBalance;
	}
	return EXIT.failed;
};

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

export const render = (
	args: Args,
	answers: unknown,
	size?: ImageSize,
): string => {
	if (args.kind === "ask") {
		return JSON.stringify(answers ?? null);
	}
	if (args.kind === "box") {
		const box = boxOf(answers);
		return args.json
			? JSON.stringify(isRecord(answers) ? answers["q"] : undefined)
			: formatBox(box, size);
	}
	return formatAnswer(args.kind, answers, args.json);
};

export const main = async (
	argv: readonly string[],
	options: ReadOptions = {},
): Promise<number> => {
	try {
		const key = globalThis.Bun.env["TYPESAFE_API_KEY"];
		if (!key) {
			throw new UsageError(ERROR_NO_KEY);
		}
		const args = parseArgs(argv);
		const body = await buildBody(args, () => globalThis.Bun.stdin.text());
		const loaded = await Promise.all(
			args.images.map((path) => readImage(path, options)),
		);
		// The note goes to stderr, so the stdout of `--json` stays JSON.
		for (const [i, image] of loaded.entries()) {
			const path = args.images[i];
			if (path === undefined || !(image.scaled && image.size !== undefined)) {
				continue;
			}
			const from = sizeText(image.size);
			console.error(
				image.scaledTo
					? INFO_IMAGE_SCALED({ path, from, to: sizeText(image.scaledTo) })
					: INFO_IMAGE_SCALED_MAX({ path, from }),
			);
		}
		const images = loaded.map((image) => image.blob);
		// The pixels come from the first `--image` as the user named it (design D5), because the fractions do not depend on the scale.
		const size = args.kind === "box" ? loaded[0]?.size : undefined;
		const res = await post(body, key, { images });
		const answers = isRecord(res) ? res["answers"] : undefined;
		process.stdout.write(`${render(args, answers, size)}\n`);
		return EXIT.ok;
	} catch (err) {
		console.error(err instanceof Error ? err.message : String(err));
		return exitOf(err);
	}
};
