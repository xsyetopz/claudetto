// The command `claudetto-decide`: it asks the TypeSafe API for one answer, and prints the answer as text.
// It runs on Bun, so it may use `Bun` and the `node:` modules, and the hooks module runs it as a child process.
// The key comes in the environment as `TYPESAFE_API_KEY`, and never in the argument list, a log, or a test.
//
//   claudetto-decide yes  [--json] [--state <- | text>] [--] "<question>"
//   claudetto-decide pick [--json] [--state <- | text>] [--] "<question>" <key>[=<description>]...
//   claudetto-decide ask < questions.json
//   claudetto-decide box  --image <path> [--image <path>]... [--json] [--state <- | text>] [--] "<what to find>"
//
// The state is text or `-` for stdin, and never a file path, because a path would send a file to the API.
// The one exception is `--image <path>`, which `yes`, `pick`, `ask`, and `box` take, and which repeats.
// It takes a path to a PNG or JPEG file only, and a check of the first bytes must pass (design D8).
// `--json` prints one object with the `text` and the structured `answer`, for a hooks module.
// `ask` takes no `--state` and no `--json`: the JSON on stdin has the state, and the output is JSON.
// `ask` reads one JSON object with the `questions` of the API and an optional `state`, and prints the answers as JSON.
// A `--` ends the flags, so that no word of the model is read as a flag.
// Exit codes: 0 an answer, 1 a failure, 2 a usage fault, 3 a key that is not valid, and 4 an account with no balance.

import { answerOf, boxOf, formatAnswer, formatBox } from "../domain/answers.ts";
import {
  ATTEMPT_TIMEOUT_MS,
  BACKOFF_MS,
  ERROR_BODY_MAX,
  MAX_OPTIONS,
  MIN_OPTIONS,
  TRIES,
} from "../limits.ts";
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
  USAGE,
} from "../prompts.ts";
import { ApiError, EXIT, UsageError } from "./errors.ts";
import {
  type ImageSize,
  imageSize,
  type LoadedImage,
  type ReadOptions,
  readImage,
  type Scaler,
  sizeText,
} from "./image.ts";

export type { ImageSize, LoadedImage, ReadOptions, Scaler };
export { ApiError, EXIT, imageSize, UsageError };

const API = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";
/** The pinned model of a request with a `box` question, which needs Jev 1.14 (design D3). */
const BOX_MODEL = "jev-1.14.0";
/** The header that turns on the images and the `box` question, on each request that uses one (design D1). */
const IMAGES_HEADER = "TypeSafe-Danger-Zone-Images";

/** The parsed arguments: the kind, the words after the flags, the value of `--state`, and the `--json` flag. */
export interface Args {
  readonly kind: "yes" | "pick" | "ask" | "box";
  readonly words: readonly string[];
  readonly state: string | undefined;
  readonly json: boolean;
  readonly images: readonly string[];
}

const KINDS: readonly string[] = ["yes", "pick", "ask", "box"];

/** The flags and the words after the verb. The words after `--` are literal words. */
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
    if (arg === "--state") state = rest[++i] ?? "";
    else if (arg === "--json") json = true;
    else if (arg === "--image") images.push(imagePath(rest[++i]));
    else words.push(arg);
  }
  return { state, json, images, words };
};

/** The path after `--image`, which is a path and never a flag. */
const imagePath = (path: string | undefined): string => {
  if (!path || path.startsWith("-"))
    throw new UsageError(ERROR_IMAGE_PATH({ usage: USAGE }));
  return path;
};

/** The parsed arguments of the command. The words after `--` are literal words. */
export const parseArgs = (argv: readonly string[]): Args => {
  const [verb, ...rest] = argv;
  if (!verb || !KINDS.includes(verb))
    throw new UsageError(ERROR_VERB({ verb: verb ?? "", usage: USAGE }));
  const { state, json, images, words } = parseFlags(rest);
  // `ask` takes its state and its output format from the JSON on stdin, so a flag for them would do nothing.
  if (verb === "ask" && (state !== undefined || json))
    throw new UsageError(ERROR_ASK_FLAGS({ usage: USAGE }));
  return { kind: verb as Args["kind"], words, state, json, images };
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
  if (kind === "box" && args.images.length === 0)
    throw new UsageError(ERROR_BOX_IMAGE({ usage: USAGE }));
  if (
    kind === "pick" &&
    (items.length < MIN_OPTIONS || items.length > MAX_OPTIONS)
  )
    throw new UsageError(ERROR_PICK_OPTIONS);
  const criteria = Object.fromEntries(
    items.map((item) => {
      const at = item.indexOf("=");
      return at > 0 ? [item.slice(0, at), item.slice(at + 1)] : [item, null];
    }),
  );
  const type = { yes: "noul", box: "box", pick: "choice" }[kind];
  return {
    state: text,
    model: MODEL,
    questions: {
      q: {
        type,
        instructions: question,
        ...(kind === "pick" && { criteria }),
      },
    },
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
export const main = async (
  argv: readonly string[],
  options: ReadOptions = {},
): Promise<number> => {
  try {
    const key = Bun.env["TYPESAFE_API_KEY"];
    if (!key) throw new UsageError(ERROR_NO_KEY);
    const args = parseArgs(argv);
    const body = await buildBody(args, () => Bun.stdin.text());
    // `readImage` reads and checks each file here, so that a bad file stops the command before the request.
    const loaded = await Promise.all(
      args.images.map((path) => readImage(path, options)),
    );
    // One line on stderr for each scaled image, so that the stdout of `--json` stays JSON.
    for (const [i, image] of loaded.entries()) {
      if (!(image.scaled && image.size)) continue;
      const path = args.images[i] as string;
      const from = sizeText(image.size);
      console.error(
        image.scaledTo
          ? INFO_IMAGE_SCALED({ path, from, to: sizeText(image.scaledTo) })
          : INFO_IMAGE_SCALED_MAX({ path, from }),
      );
    }
    const images = loaded.map((image) => image.blob);
    // The pixels come from the file that the user named in the first `--image`, which the `box` question names (design D5).
    // The fractions do not depend on the scale, so a scaled copy gives the same box.
    const size = args.kind === "box" ? loaded[0]?.size : undefined;
    const res = (await post(body, key, { images })) as { answers?: unknown };
    console.log(render(args, res.answers, size));
    return EXIT.ok;
  } catch (err) {
    // The message names the fault. It never holds the key, because the key is not in any message.
    console.error(err instanceof Error ? err.message : String(err));
    return exitOf(err);
  }
};
