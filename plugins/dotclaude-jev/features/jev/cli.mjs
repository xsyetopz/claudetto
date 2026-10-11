#!/usr/bin/env node
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
//   node cli.mjs yes  [--state <- | text>] [--] "<question>"
//   node cli.mjs pick [--state ...] [--] "<question>" <option>[=<description>]...
//   node cli.mjs rate [--state ...] [--] "<question>" <level>...
//   node cli.mjs ask  [--state ...] < request.json

import { readFileSync } from "node:fs";
import { setTimeout as sleepMs } from "node:timers/promises";
import {
  ATTEMPT_TIMEOUT_MS,
  ERROR_BODY_MAX,
  MAX_LEVELS,
  MAX_OPTIONS,
  MIN_CONFIDENCE,
  MIN_LEVELS,
  MIN_OPTIONS,
  TRIES,
  waitMs,
  YES_NO_UNSURE_BAND,
} from "./limits.mjs";

const API = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";
const VERBS = {
  yes: "noul",
  noul: "noul",
  pick: "choice",
  choice: "choice",
  rate: "score",
  score: "score",
  ask: "ask",
};
const USAGE =
  'Use `cli.mjs yes|pick|rate|ask "<question>" [options or levels] [--state <- | text>]`.';

export class UsageError extends Error {}

/** The verb, the words after it, and the `--state` value. */
export function parseArgs(argv) {
  const [verb, ...rest] = argv;
  const kind = VERBS[String(verb).toLowerCase()];
  if (!kind)
    throw new UsageError(`The verb \`${verb ?? ""}\` is not known. ${USAGE}`);
  let state;
  const words = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--") {
      words.push(...rest.slice(i + 1));
      break;
    }
    if (rest[i] === "--state") state = rest[++i] ?? "";
    else if (rest[i].startsWith("--state=")) state = rest[i].slice(8);
    else words.push(rest[i]);
  }
  return { kind, words, state };
}

/** The state text: stdin for `-`, else the text itself. A path is never read. */
export function readState(arg, stdin) {
  switch (arg) {
    case undefined:
      return "";
    case "-":
      return stdin();
    default:
      return arg;
  }
}

/** The request body for the parsed arguments. */
export function buildBody({ kind, words, state }, stdin) {
  if (kind === "ask") {
    if (state === "-")
      throw new UsageError(
        "`ask` reads the questions from stdin, so give `--state` text.",
      );
    let req;
    try {
      req = JSON.parse(stdin());
    } catch (err) {
      if (!(err instanceof SyntaxError)) throw err;
      throw new UsageError(
        "`ask` needs a JSON object of questions on stdin, as in the TypeSafe API.",
      );
    }
    const questions = req?.questions ?? req;
    const text =
      state === undefined ? (req?.state ?? "") : readState(state, stdin);
    return { state: text, model: req?.model ?? MODEL, questions };
  }
  const [question, ...items] = words;
  if (!question) throw new UsageError(`Give the question. ${USAGE}`);
  const q = { type: kind, instructions: question };
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
  return { state: readState(state, stdin), model: MODEL, questions: { q } };
}

const n = (x) => Number(x).toFixed(2);

/** The answer as short text for Claude. */
export function format(kind, answers) {
  if (kind === "ask") return JSON.stringify(answers, null, 2);
  const a = answers.q;
  if (kind === "noul") {
    const unsure = Math.abs(a.noul - 0.5) < YES_NO_UNSURE_BAND;
    return `P(yes) = ${n(a.noul)}${unsure ? "\nP(yes) is near 0.5, so Jev is not sure." : ""}`;
  }
  const head =
    kind === "choice"
      ? `${a.choice} (confidence ${n(a.confidence)})`
      : `score ${n(a.score)} on levels 0 to ${Object.keys(a.legend).length - 1} (confidence ${n(a.confidence)})`;
  const rows = Object.entries(a.probabilities)
    .sort((x, y) => y[1] - x[1])
    .map(
      ([k, p]) => `  ${n(p)} ${kind === "score" ? `${k} ${a.legend[k]}` : k}`,
    );
  const low =
    a.confidence < MIN_CONFIDENCE
      ? [`The confidence is under ${MIN_CONFIDENCE}, so Jev is not sure.`]
      : [];
  return [head, ...rows, ...low].join("\n");
}

/**
 * POST the body, with a retry and backoff on 429 and 529.
 * The tries, the waits, and the timeout of each try end before the kill bound (see `limits.mjs`).
 */
export async function call(
  body,
  key,
  { fetchFn = fetch, sleep = sleepMs } = {},
) {
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
  const key = process.env.TYPESAFE_API_KEY;
  try {
    if (!key)
      throw new UsageError(
        "The user must set `TYPESAFE_API_KEY` before Claude Code starts. A key is at https://console.typesafe.ai.",
      );
    const args = parseArgs(process.argv.slice(2));
    const stdin = () => readFileSync(0, "utf8");
    const res = await call(buildBody(args, stdin), key);
    console.log(format(args.kind, res.answers));
  } catch (err) {
    console.error(err.message);
    process.exit(err instanceof UsageError ? 2 : 1);
  }
}
