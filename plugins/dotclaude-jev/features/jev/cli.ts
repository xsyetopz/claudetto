#!/usr/bin/env -S bun --no-env-file

// A second opinion from TypeSafe Jev, a decision model that answers typed questions about a state:
// yes or no, one option from a set, or a level on a scale.
// The verbs follow the `jev` CLI by pedramamini (MIT).
// The code is our own.
//
// The state is text or `-` for stdin, and never a file path,
// because the model can choose the state and a path would send a file to the API.
// A `--` ends the flags, so that no word of the model is read as a flag.
// In the `Bash` sandbox, set `NODE_USE_ENV_PROXY=1`, because `fetch` uses the sandbox proxy only with it.
//
//   node cli.ts yes  [--state <- | text>] [--] "<question>"
//   node cli.ts pick [--state ...] [--] "<question>" <option>[=<description>]...
//   node cli.ts rate [--state ...] [--] "<question>" <level>...
//   node cli.ts ask  [--state ...] < request.json

import { format } from "./format.ts";
import {
  ATTEMPT_TIMEOUT_MS,
  ERROR_BODY_MAX,
  MAX_LEVELS,
  MAX_OPTIONS,
  MIN_LEVELS,
  MIN_OPTIONS,
  TRIES,
  waitMs,
} from "./limits.ts";

const API = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";
const VERBS: Record<string, string> = {
  yes: "noul",
  noul: "noul",
  pick: "choice",
  choice: "choice",
  rate: "score",
  score: "score",
  ask: "ask",
};
const USAGE =
  'Use `cli.ts yes|pick|rate|ask "<question>" [options or levels] [--state <- | text>]`.';

export class UsageError extends Error {}

/** The result of `parseArgs`: the kind of the verb, the words, and the state. */
export interface ParsedArgs {
  kind: string;
  words: string[];
  state: string | undefined;
}

/** The verb, the words after it, and the `--state` value. */
export function parseArgs(argv: string[]): ParsedArgs {
  const [verb, ...rest] = argv;
  const kind = VERBS[String(verb).toLowerCase()];
  if (!kind)
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
    else if (arg.startsWith("--state=")) state = arg.slice(8);
    else words.push(arg);
  }
  return { kind, words, state };
}

/** The state text: stdin for `-`, else the text itself. A path is never read. */
export async function readState(
  arg: string | undefined,
  stdin: () => Promise<string>,
): Promise<string> {
  switch (arg) {
    case undefined:
      return "";
    case "-":
      return stdin();
    default:
      return arg;
  }
}

/** The `ask` request on stdin, as the TypeSafe API takes it. */
interface AskRequest {
  questions?: unknown;
  state?: string;
  model?: string;
}

/** One question of the request body: the type, the text, and the criteria. */
export interface Question {
  type: string;
  instructions: string;
  criteria?: Record<string, string | null> | string[];
}

/** The request body of a verb: the state and one question under the key `q`. */
export interface VerbBody {
  state: string;
  model: string;
  questions: { q: Question };
}

/** The request body of `ask`: the questions of the caller, as they were given. */
export interface AskBody {
  state: string;
  model: string;
  questions: unknown;
}

/** The request body of `ask`, from the request on stdin. */
export async function askBody(
  { state }: ParsedArgs,
  stdin: () => Promise<string>,
): Promise<AskBody> {
  if (state === "-")
    throw new UsageError(
      "`ask` reads the questions from stdin, so give `--state` text.",
    );
  let req: AskRequest | undefined;
  try {
    req = JSON.parse(await stdin());
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    throw new UsageError(
      "`ask` needs a JSON object of questions on stdin, as in the TypeSafe API.",
    );
  }
  const questions = req?.questions ?? req;
  const text =
    state === undefined ? (req?.state ?? "") : await readState(state, stdin);
  return { state: text, model: req?.model ?? MODEL, questions };
}

/** The request body of a verb, from its words. */
export async function verbBody(
  { kind, words, state }: ParsedArgs,
  stdin: () => Promise<string>,
): Promise<VerbBody> {
  const [question, ...items] = words;
  if (!question) throw new UsageError(`Give the question. ${USAGE}`);
  const q: Question = { type: kind, instructions: question };
  switch (kind) {
    case "choice":
      if (items.length < MIN_OPTIONS || items.length > MAX_OPTIONS)
        throw new UsageError(
          `\`pick\` needs ${MIN_OPTIONS} to ${MAX_OPTIONS} options, each as \`key\` or \`key=description\`.`,
        );
      q.criteria = Object.fromEntries(
        items.map((item) => {
          const at = item.indexOf("=");
          return at > 0
            ? [item.slice(0, at), item.slice(at + 1)]
            : [item, null];
        }),
      );
      break;
    case "score":
      if (items.length < MIN_LEVELS || items.length > MAX_LEVELS)
        throw new UsageError(
          `\`rate\` needs ${MIN_LEVELS} to ${MAX_LEVELS} levels, from the lowest to the highest.`,
        );
      q.criteria = items;
      break;
  }
  return {
    state: await readState(state, stdin),
    model: MODEL,
    questions: { q },
  };
}

/** The request body for the parsed arguments. */
export const buildBody = (
  args: ParsedArgs,
  stdin: () => Promise<string>,
): Promise<AskBody | VerbBody> =>
  args.kind === "ask" ? askBody(args, stdin) : verbBody(args, stdin);

/** The response of the TypeSafe API. The shape of `answers` depends on the kind of the question. */
interface JevResponse {
  answers: unknown;
}

/** The functions that `call` uses, which a test can replace. */
interface CallOptions {
  fetchFn?: typeof fetch;
  sleep?: typeof Bun.sleep;
}

/**
 * POST the body, with a retry and backoff on 429 and 529.
 * The tries, the waits, and the timeout of each try end before the kill bound (see `limits.ts`).
 */
export async function call(
  body: unknown,
  key: string,
  { fetchFn = fetch, sleep = Bun.sleep }: CallOptions = {},
): Promise<JevResponse> {
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
    if (res.ok) return res.json() as Promise<JevResponse>;
    if ((res.status === 429 || res.status === 529) && i < TRIES - 1) {
      await sleep(waitMs(i));
      continue;
    }
    const why =
      res.status === 401
        ? "The key in `TYPESAFE_API_KEY` is not valid. Tell the user."
        : (await res.text()).slice(0, ERROR_BODY_MAX);
    throw new Error(`TypeSafe API ${res.status}: ${why}`);
  }
}

if (import.meta.main) {
  const key = process.env["TYPESAFE_API_KEY"];
  try {
    if (!key)
      throw new UsageError(
        "The user must set `TYPESAFE_API_KEY` before Claude Code starts. A key is at https://console.typesafe.ai.",
      );
    const args = parseArgs(process.argv.slice(2));
    const stdin = () => Bun.stdin.text();
    const res = await call(await buildBody(args, stdin), key);
    console.log(format(args.kind, res.answers));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(err instanceof UsageError ? 2 : 1);
  }
}
