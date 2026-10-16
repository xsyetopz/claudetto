// The command `claudetto-decide`: it asks the TypeSafe API for one answer, and prints the answer as text.
// It runs on Bun, so it may use `Bun` and the `node:` modules, and the hooks module runs it as a child process.
// The key comes in the environment as `TYPESAFE_API_KEY`, and never in the argument list, a log, or a test.
//
//   claudetto-decide yes  [--json] [--state <- | text>] [--] "<question>"
//   claudetto-decide pick [--json] [--state <- | text>] [--] "<question>" <key>[=<description>]...
//   claudetto-decide ask < questions.json
//
// The state is text or `-` for stdin, and never a file path, because a path would send a file to the API.
// `--json` prints one object with the `text` and the structured `answer`, for a hooks module.
// `ask` reads one JSON object with the `questions` of the API and an optional `state`, and prints the answers as JSON.
// A `--` ends the flags, so that no word of the model is read as a flag.
// Exit codes: 0 an answer, 1 a failure, 2 a usage fault, 3 a key that is not valid, and 4 an account with no balance.

import { answerOf, formatAnswer } from "../domain/answers.ts";
import {
  ATTEMPT_TIMEOUT_MS,
  BACKOFF_MS,
  ERROR_BODY_MAX,
  MAX_OPTIONS,
  MIN_OPTIONS,
  TRIES,
} from "../limits.ts";
import {
  ERROR_ASK_QUESTIONS,
  ERROR_ASK_STDIN,
  ERROR_NO_KEY,
  ERROR_PICK_OPTIONS,
  ERROR_QUESTION_MISSING,
  ERROR_VERB,
  USAGE,
} from "../prompts.ts";

const API = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";

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
  readonly kind: "yes" | "pick" | "ask";
  readonly words: readonly string[];
  readonly state: string | undefined;
  readonly json: boolean;
}

/** The parsed arguments of the command. The words after `--` are literal words. */
export const parseArgs = (argv: readonly string[]): Args => {
  const [verb, ...rest] = argv;
  if (verb !== "yes" && verb !== "pick" && verb !== "ask")
    throw new UsageError(ERROR_VERB({ verb: verb ?? "", usage: USAGE }));
  let state: string | undefined;
  let json = false;
  const words: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] ?? "";
    if (arg === "--") {
      words.push(...rest.slice(i + 1));
      break;
    }
    if (arg === "--state") state = rest[++i] ?? "";
    else if (arg === "--json") json = true;
    else words.push(arg);
  }
  return { kind: verb, words, state, json };
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

/** The output of the command: the answers as JSON for `ask`, the text for Claude, or the text and the answer with `--json`. */
export const render = (args: Args, answers: unknown): string => {
  if (args.kind === "ask") return JSON.stringify(answers ?? null);
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
    const res = (await post(body, key)) as { answers?: unknown };
    console.log(render(args, res.answers));
    return EXIT.ok;
  } catch (err) {
    // The message names the fault. It never holds the key, because the key is not in any message.
    console.error(err instanceof Error ? err.message : String(err));
    return exitOf(err);
  }
};
