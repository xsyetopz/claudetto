// The command `claudetto-decide`: it asks the TypeSafe API for one answer, and prints the answer as text.
// It runs on Bun, so it may use `Bun` and the `node:` modules, and the hooks module runs it as a child process.
// The key comes in the environment as `TYPESAFE_API_KEY`, and never in the argument list, a log, or a test.
//
//   claudetto-decide yes  [--json] [--state <- | text>] [--] "<question>"
//   claudetto-decide pick [--json] [--state <- | text>] [--] "<question>" <key>[=<description>]...
//   claudetto-decide ask < questions.json
//   claudetto-decide box  [--json] [--state <- | text>] [--image <path>]... [--] "<what to find>"
//
// The state is text or `-` for stdin, and never a file path, because a path would send a file to the API.
// The one exception is `--image <path>`, which `yes`, `pick`, `ask`, and `box` take, and which repeats.
// It takes a path to a PNG or JPEG file only, and a check of the first bytes must pass (design D8).
// `--json` prints one object with the `text` and the structured `answer`, for a hooks module.
// `ask` reads one JSON object with the `questions` of the API and an optional `state`, and prints the answers as JSON.
// A `--` ends the flags, so that no word of the model is read as a flag.
// Exit codes: 0 an answer, 1 a failure, 2 a usage fault, 3 a key that is not valid, and 4 an account with no balance.

import { answerOf, boxOf, formatAnswer, formatBox } from "../domain/answers.ts";
import {
  ATTEMPT_TIMEOUT_MS,
  BACKOFF_MS,
  ERROR_BODY_MAX,
  IMAGE_BYTES_MAX,
  MAX_OPTIONS,
  MIN_OPTIONS,
  TRIES,
} from "../limits.ts";
import {
  ERROR_ASK_QUESTIONS,
  ERROR_ASK_STDIN,
  ERROR_BOX_IMAGE,
  ERROR_IMAGE_FILE,
  ERROR_IMAGE_PATH,
  ERROR_NO_KEY,
  ERROR_PICK_OPTIONS,
  ERROR_QUESTION_MISSING,
  ERROR_VERB,
  USAGE,
} from "../prompts.ts";

const API = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";
/** The pinned model of a request with a `box` question, which needs Jev 1.14 (design D3). */
const BOX_MODEL = "jev-1.14.0";
/** The header that turns on the images and the `box` question, on each request that uses one (design D1). */
const IMAGES_HEADER = "TypeSafe-Danger-Zone-Images";

/** The exit codes of the command. */
export const EXIT = {
  ok: 0,
  failed: 1,
  usage: 2,
  invalidKey: 3,
  noBalance: 4,
} as const;

/** A fault of the arguments or of the key. The command exits with `EXIT.usage`. */
export class UsageError extends Error {}

/** A reply of the API with an error status. The command exits with the code that `exitOf` gives it. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** The parsed arguments: the kind, the words after the flags, the value of `--state`, and the `--json` flag. */
export interface Args {
  readonly kind: "yes" | "pick" | "ask" | "box";
  readonly words: readonly string[];
  readonly state: string | undefined;
  readonly json: boolean;
  /** The paths of the `--image` options, in order. */
  readonly images: readonly string[];
}

/** The parsed arguments of the command. The words after `--` are literal words. */
export const parseArgs = (argv: readonly string[]): Args => {
  const [verb, ...rest] = argv;
  if (verb !== "yes" && verb !== "pick" && verb !== "ask" && verb !== "box")
    throw new UsageError(ERROR_VERB({ verb: verb ?? "", usage: USAGE }));
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
    if (arg === "--state") state = rest[++i] ?? "";
    else if (arg === "--json") json = true;
    else if (arg === "--image") {
      const path = rest[++i];
      if (!path || path.startsWith("-"))
        throw new UsageError(ERROR_IMAGE_PATH({ usage: USAGE }));
      images.push(path);
    } else words.push(arg);
  }
  return { kind: verb, words, state, json, images };
};

/** The first bytes of a PNG file and of a JPEG file (design D4). */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

/** The content type for the first bytes of a file, or `undefined` when they are not PNG or JPEG. */
const imageType = (bytes: Uint8Array): string | undefined => {
  const starts = (magic: number[]) => magic.every((b, i) => bytes[i] === b);
  if (starts(PNG_MAGIC)) return "image/png";
  if (starts(JPEG_MAGIC)) return "image/jpeg";
  return undefined;
};

/**
 * Reads one `--image` file, and checks its size and its first bytes (design D4).
 * A fault is a `UsageError` that names the path and the reason.
 */
export const readImage = async (path: string): Promise<Blob> => {
  const fail = (reason: string) =>
    new UsageError(ERROR_IMAGE_FILE({ path, reason }));
  const file = Bun.file(path);
  if (!(await file.exists())) throw fail("does not exist");
  if (file.size > IMAGE_BYTES_MAX)
    throw fail(`is over ${IMAGE_BYTES_MAX} bytes`);
  let bytes: Uint8Array;
  try {
    bytes = await file.bytes();
  } catch {
    throw fail("cannot be read");
  }
  // The size check above can miss a file that grew, so the read length is checked too.
  if (bytes.length > IMAGE_BYTES_MAX)
    throw fail(`is over ${IMAGE_BYTES_MAX} bytes`);
  const type = imageType(bytes);
  if (!type) throw fail("is not a PNG or JPEG file");
  return new Blob([bytes], { type });
};

/** The size of a picture in pixels. */
export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

/**
 * The size from the `IHDR` chunk of a PNG or the first `SOF` marker of a JPEG (design D5).
 * It gives `undefined` for a file that is cut short or has no `SOF`, and the caller then prints no pixels.
 */
export const imageSize = (bytes: Uint8Array): ImageSize | undefined => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (imageType(bytes) === "image/png")
    return bytes.length >= 24
      ? { width: view.getUint32(16), height: view.getUint32(20) }
      : undefined;
  // Each segment is `FF`, a marker byte, and a length that counts its own two bytes.
  for (let at = 2; at + 4 <= bytes.length; ) {
    if (bytes[at] !== 0xff) return undefined;
    const marker = bytes[at + 1] as number;
    if (marker === 0xff) at++;
    else if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    )
      return at + 9 <= bytes.length
        ? { width: view.getUint16(at + 7), height: view.getUint16(at + 5) }
        : undefined;
    else at += 2 + view.getUint16(at + 2);
  }
  return undefined;
};

/** The request body of `ask`: the JSON object on stdin, with its `questions` and an optional `state`. */
const askBody = async (stdin: () => Promise<string>): Promise<object> => {
  let req: Record<string, unknown> | null;
  try {
    req = JSON.parse(await stdin()) as Record<string, unknown> | null;
  } catch {
    throw new UsageError(ERROR_ASK_STDIN({ usage: USAGE }));
  }
  const { questions, state } = req ?? {};
  if (typeof questions !== "object" || questions === null)
    throw new UsageError(ERROR_ASK_QUESTIONS({ usage: USAGE }));
  return {
    state: typeof state === "string" ? state : "",
    model: MODEL,
    questions,
  };
};

/** The request body of the API for the arguments. `-` reads the state from stdin. */
export const buildBody = async (
  args: Args,
  stdin: () => Promise<string>,
): Promise<object> => {
  if (args.kind === "ask") return askBody(stdin);
  const { kind, words, state } = args;
  const [question, ...items] = words;
  if (!question) throw new UsageError(ERROR_QUESTION_MISSING({ usage: USAGE }));
  const text = state === "-" ? await stdin() : (state ?? "");
  if (kind === "box") {
    if (args.images.length === 0)
      throw new UsageError(ERROR_BOX_IMAGE({ usage: USAGE }));
    return {
      state: text,
      model: MODEL,
      questions: { q: { type: "box", instructions: question } },
    };
  }
  if (kind === "yes")
    return {
      state: text,
      model: MODEL,
      questions: { q: { type: "noul", instructions: question } },
    };
  if (items.length < MIN_OPTIONS || items.length > MAX_OPTIONS)
    throw new UsageError(ERROR_PICK_OPTIONS);
  const criteria = Object.fromEntries(
    items.map((item) => {
      const at = item.indexOf("=");
      return at > 0 ? [item.slice(0, at), item.slice(at + 1)] : [item, null];
    }),
  );
  return {
    state: text,
    model: MODEL,
    questions: { q: { type: "choice", instructions: question, criteria } },
  };
};

/** The exit code of an error: the status of an `ApiError` for 3 and 4, and `EXIT.usage` or `EXIT.failed` otherwise. */
export const exitOf = (err: unknown): number => {
  if (err instanceof UsageError) return EXIT.usage;
  if (err instanceof ApiError && err.status === 401) return EXIT.invalidKey;
  if (err instanceof ApiError && err.status === 402) return EXIT.noBalance;
  return EXIT.failed;
};

/** The request body, and the headers that go with it. The body is a JSON string, or a `FormData` for images. */
export interface Request {
  readonly body: string | FormData;
  readonly headers: Record<string, string>;
}

/**
 * The request for a body and its images (design D1, D2, D3).
 * With no image and no `box` question, it is the JSON string of the body, with no header.
 * Each image gets a UUID in `assets`, a file part `img<n>`, and a state line `Image img<n>: <uuid>`.
 * The model is `jev-1.14.0` when a question has the type `box`, and the model of the body otherwise.
 */
export const buildRequest = (
  body: { state: string; model: string; questions: object },
  images: readonly Blob[],
): Request => {
  const box = Object.values(body.questions).some((q) => q?.type === "box");
  if (!box && images.length === 0)
    return { body: JSON.stringify(body), headers: {} };
  const assets: Record<string, object> = {};
  const lines = images.map((_, i) => {
    const id = crypto.randomUUID();
    assets[id] = { type: "image", part: `img${i + 1}` };
    return `Image img${i + 1}: ${id}`;
  });
  const json = {
    ...body,
    state: [body.state, ...lines].filter(Boolean).join("\n"),
    model: box ? BOX_MODEL : body.model,
    ...(images.length > 0 && { assets }),
  };
  const headers = { [IMAGES_HEADER]: "true" };
  if (images.length === 0) return { body: JSON.stringify(json), headers };
  const form = new FormData();
  form.set(
    "request",
    new Blob([JSON.stringify(json)], { type: "application/json" }),
  );
  for (const [i, blob] of images.entries())
    form.set(`img${i + 1}`, blob, `img${i + 1}`);
  return { body: form, headers };
};

/** The functions that `post` uses, which a test can replace. */
export interface PostOptions {
  /** The image files to send with the body, in the order of `--image`. */
  readonly images?: readonly Blob[];
  readonly fetchFn?: typeof fetch;
  readonly sleep?: (ms: number) => Promise<void>;
}

/**
 * POST the body, with a retry and backoff on 429 and 529.
 * The tries and the waits fit in the time limit of the hook (see `limits.ts`).
 */
export const post = async (
  body: object,
  key: string,
  { fetchFn = fetch, sleep = Bun.sleep, images = [] }: PostOptions = {},
): Promise<unknown> => {
  // One request for all tries, so that a retry sends the same UUIDs.
  const request = buildRequest(
    body as Parameters<typeof buildRequest>[0],
    images,
  );
  for (let i = 0; ; i++) {
    const res = await fetchFn(API, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        // A `FormData` body gets its content type, with the boundary, from `fetch`.
        ...(typeof request.body === "string" && {
          "content-type": "application/json",
        }),
        ...request.headers,
      },
      body: request.body,
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status === 529) && i < TRIES - 1) {
      await sleep(BACKOFF_MS * 2 ** i);
      continue;
    }
    const detail = (await res.text()).slice(0, ERROR_BODY_MAX);
    throw new ApiError(res.status, `TypeSafe API ${res.status}: ${detail}`);
  }
};

/** The output of the command: the answers as JSON for `ask`, the text for Claude, or the text and the answer with `--json`. */
export const render = (
  args: Args,
  answers: unknown,
  size?: ImageSize,
): string => {
  if (args.kind === "ask") return JSON.stringify(answers ?? null);
  if (args.kind === "box") {
    const box = boxOf(answers);
    // `--json` prints the raw answer of the API, which `boxOf` has checked.
    return args.json
      ? JSON.stringify((answers as { q: unknown }).q)
      : formatBox(box, size);
  }
  const text = formatAnswer(args.kind, answers);
  if (!args.json) return text;
  return JSON.stringify({ text, answer: answerOf(args.kind, answers) });
};

/** Runs the command with `argv`, prints the answer or the error, and gives the exit code. */
export const main = async (argv: readonly string[]): Promise<number> => {
  try {
    const key = Bun.env["TYPESAFE_API_KEY"];
    if (!key) throw new UsageError(ERROR_NO_KEY);
    const args = parseArgs(argv);
    const body = await buildBody(args, () => Bun.stdin.text());
    // `readImage` reads and checks each file here, so that a bad file stops the command before the request.
    const images = await Promise.all(args.images.map(readImage));
    // The pixels come from the first image, which the `box` question names (design D5).
    const first = images[0];
    const size = first && imageSize(new Uint8Array(await first.arrayBuffer()));
    const res = (await post(body, key, { images })) as { answers?: unknown };
    console.log(render(args, res.answers, size || undefined));
    return EXIT.ok;
  } catch (err) {
    // The message names the fault. It never holds the key, because the key is not in any message.
    console.error(err instanceof Error ? err.message : String(err));
    return exitOf(err);
  }
};
