// Fakes and helpers that the tests of `claudetto-decide` (`adapters/cli.ts`) share.

import { spyOn } from "bun:test";
import { mkdtemp, rm, truncate } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stdin as bunStdin, write } from "bun";
import {
	EXIT,
	imageSize,
	main,
	type ReadOptions,
} from "../../../../plugins/claudetto/modules/jev/adapters/cli.ts";

export const KEY = "test-key-not-real";

/** A fake reply of the API with `status` and a JSON or text body. */
export const reply = (status: number, body: unknown = {}): Response =>
	new Response(typeof body === "string" ? body : JSON.stringify(body), {
		status,
	});

/** A fake `fetch` from the function `fn`, with the `preconnect` that Bun adds to the type. */
export const fakeFetch = (
	fn: (
		input: Parameters<typeof fetch>[0],
		init?: RequestInit,
	) => Promise<Response>,
): typeof fetch => Object.assign(fn, { preconnect: () => undefined });

/** The body as a multipart form, or a thrown error. */
export const formOf = (body: unknown): FormData => {
	if (!(body instanceof FormData)) {
		throw new Error("the body is no multipart form");
	}
	return body;
};

/** The file part `name` of the multipart body, or a thrown error. */
export const partOf = (body: unknown, name: string): File => {
	const part = formOf(body).get(name);
	if (!(part instanceof File)) {
		throw new Error(`the form has no file part \`${name}\``);
	}
	return part;
};

/** The JSON of the `request` part of the multipart body. */
export const requestOf = async (body: unknown) =>
	JSON.parse(await partOf(body, "request").text());

/** The body as text, or a thrown error. */
export const textOf = (body: unknown): string => {
	if (typeof body !== "string") {
		throw new Error("the body is no text");
	}
	return body;
};

/** A fake `fetch` that gives the replies in order, and records the count of calls. */
export const replies = (...list: Response[]) => {
	const calls = { count: 0 };
	const fetchFn = fakeFetch(async () => {
		const next = list[calls.count++];
		if (!next) {
			throw new Error("no more replies in the fake");
		}
		return next;
	});
	return { fetchFn, calls };
};

/** A fake `sleep` that records each wait in milliseconds. */
export const waits = () => {
	const ms: number[] = [];
	const sleep = async (n: number) => {
		ms.push(n);
	};
	return { ms, sleep };
};

export const BODY = { state: "", model: "jev-latest", questions: {} };

/** A fake image file with a content type. */
export const image = (type: string, byte: number): Blob =>
	new Blob([new Uint8Array([byte])], { type });

/** Stubs stdin with one `noul` question for `ask`. The caller restores the spy. */
export const stubAskStdin = () =>
	spyOn(bunStdin, "text").mockResolvedValue(
		JSON.stringify({ questions: { q: { type: "noul", instructions: "Ok?" } } }),
	);

/** Runs `main` with a fake `fetch` that records the init of each call, and a key in the environment. */
export const runMain = async (
	argv: string[],
	answers: unknown = {
		q: {
			noul: 0.9,
			choice: "x",
			confidence: 0.8,
			probabilities: { x: 0.8 },
		},
	},
	// No scaler, so that a test never runs `sips` unless it asks to.
	options: ReadOptions = { scale: null },
) => {
	const saved = process.env["TYPESAFE_API_KEY"];
	process.env["TYPESAFE_API_KEY"] = KEY;
	const seen: RequestInit[] = [];
	const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
		fakeFetch(async (_url, init) => {
			seen.push(init ?? {});
			return reply(200, { answers });
		}),
	);
	const logSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
	const errSpy = spyOn(console, "error").mockImplementation(() => undefined);
	try {
		const code = await main(argv, options);
		return {
			code,
			seen,
			out: logSpy.mock.calls.map(([s]) => String(s).trimEnd()),
			err: errSpy.mock.calls.flat().map(String),
		};
	} finally {
		fetchSpy.mockRestore();
		logSpy.mockRestore();
		errSpy.mockRestore();
		if (saved === undefined) {
			delete process.env["TYPESAFE_API_KEY"];
		} else {
			process.env["TYPESAFE_API_KEY"] = saved;
		}
	}
};

/** The first bytes of a PNG file and of a JPEG file, with a little more. */
export const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0,
]);

export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]);

/** Runs `main` with one image file, and gives the code, the messages, and the requests. */
export const runBad = async (
	name: string,
	bytes: Uint8Array | null,
	size?: number,
	options?: ReadOptions,
) => {
	const dir = await mkdtemp(join(tmpdir(), "decide-"));
	try {
		const path = join(dir, name);
		if (bytes) {
			await write(path, bytes);
		}
		if (size !== undefined) {
			await truncate(path, size);
		}
		const { code, seen, err } = await runMain(
			["yes", "--image", path, "--", "Q?"],
			undefined,
			options,
		);
		return { code, seen, text: err.join("\n"), path };
	} finally {
		await rm(dir, { recursive: true });
	}
};

/** What a `runBad` run of an image of `w`x`h` did: its exit code, the number of requests, and whether the message names the size. */
export const refusalOf = (
	r: { code: number; seen: unknown[]; text: string },
	w: number,
	h: number,
) => ({
	code: r.code,
	requests: r.seen.length,
	isNamed: r.text.includes(`${w}x${h}`),
});

/** The `refusalOf` of a run that refused the image with the usage code. */
export const REFUSED = { code: EXIT.usage, requests: 0, isNamed: true };

/** The width and the height of the first image in the request `body`. */
export const sentSize = async (body: unknown) =>
	imageSize(new Uint8Array(await partOf(body, "img1").arrayBuffer()));

export const BOX_ANSWER = {
	type: "box",
	box: { top: 0.1, bottom: 0.5, left: 0.25, right: 0.75 },
	confidence: 0.9,
};

/** A PNG header: the signature, then `IHDR` with the width and the height, big-endian. */
export const pngOf = (w: number, h: number): Uint8Array => {
	const bytes = new Uint8Array(33);
	bytes.set(PNG.slice(0, 8));
	bytes.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
	const view = new DataView(bytes.buffer);
	view.setUint32(16, w);
	view.setUint32(20, h);
	return bytes;
};

export const yes = (path: string) => ["yes", "--image", path, "--", "Q?"];
