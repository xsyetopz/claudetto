// The command `dotclaude-decide`: it asks the TypeSafe API for one answer, and prints the answer as text.
// It runs on Bun, so it may use `Bun` and the `node:` modules, and the hooks module runs it as a child process.
// The key comes in the environment as `TYPESAFE_API_KEY`, and never in the argument list, a log, or a test.
//
//   dotclaude-decide yes  [--state <- | text>] [--] "<question>"
//   dotclaude-decide pick [--state <- | text>] [--] "<question>" <key>[=<description>]...
//
// The state is text or `-` for stdin, and never a file path, because a path would send a file to the API.
// A `--` ends the flags, so that no word of the model is read as a flag.
// Exit codes: 0 an answer, 1 a failure, 2 a usage fault, 3 a key that is not valid, and 4 an account with no balance.

import { formatAnswer } from "../domain/answers.ts";
import {
  ATTEMPT_TIMEOUT_MS,
  BACKOFF_MS,
  ERROR_BODY_MAX,
  MAX_OPTIONS,
  MIN_OPTIONS,
  TRIES,
} from "../limits.ts";

const API = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";
const USAGE =
  'Use `dotclaude-decide yes|pick [--state <- | text>] [--] "<question>" [options]`.';

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

/** The parsed arguments: the kind, the words after the flags, and the value of `--state`. */
export interface Args {
  readonly kind: "yes" | "pick";
  readonly words: readonly string[];
  readonly state: string | undefined;
}

/** The parsed arguments of the command. The words after `--` are literal words. */
export const parseArgs = (argv: readonly string[]): Args => {
  const [verb, ...rest] = argv;
  if (verb !== "yes" && verb !== "pick")
    throw new UsageError(`The verb \`${verb ?? ""}\` is not known. ${USAGE}`);
  let state: string | undefined;
  const words: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] ?? "";
    if (arg === "--") {
      words.push(...rest.slice(i + 1));
      break;
    }
    if (arg === "--state") state = rest[++i] ?? "";
    else words.push(arg);
  }
  return { kind: verb, words, state };
};

/** The request body of the API for the arguments. `-` reads the state from stdin. */
export const buildBody = async (
  { kind, words, state }: Args,
  stdin: () => Promise<string>,
): Promise<object> => {
  const [question, ...items] = words;
  if (!question) throw new UsageError(`Give the question. ${USAGE}`);
  const text = state === "-" ? await stdin() : (state ?? "");
  if (kind === "yes")
    return {
      state: text,
      model: MODEL,
      questions: { q: { type: "noul", instructions: question } },
    };
  if (items.length < MIN_OPTIONS || items.length > MAX_OPTIONS)
    throw new UsageError(
      `\`pick\` needs ${MIN_OPTIONS} to ${MAX_OPTIONS} options, each as \`key\` or \`key=description\`.`,
    );
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

/** The functions that `post` uses, which a test can replace. */
export interface PostOptions {
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
  { fetchFn = fetch, sleep = Bun.sleep }: PostOptions = {},
): Promise<unknown> => {
  for (let i = 0; ; i++) {
    const res = await fetchFn(API, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
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

/** Runs the command with `argv`, prints the answer or the error, and gives the exit code. */
export const main = async (argv: readonly string[]): Promise<number> => {
  try {
    const key = Bun.env["TYPESAFE_API_KEY"];
    if (!key)
      throw new UsageError(
        "The variable `TYPESAFE_API_KEY` is not set. Set it before Claude Code starts.",
      );
    const args = parseArgs(argv);
    const body = await buildBody(args, () => Bun.stdin.text());
    const res = (await post(body, key)) as { answers?: unknown };
    console.log(formatAnswer(args.kind, res.answers));
    return EXIT.ok;
  } catch (err) {
    // The message names the fault. It never holds the key, because the key is not in any message.
    console.error(err instanceof Error ? err.message : String(err));
    return exitOf(err);
  }
};
