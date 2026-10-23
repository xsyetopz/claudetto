// The call of the TypeSafe API that the CLI `claudetto-decide` and the mod share: the model, the retry on 429 and 529, and the reading of a yes or no answer.
// No `node:` import and no `Bun`, for the hooks module. A function here gets the `fetch` and the `sleep` of its caller, and never `$`.

import {
  ATTEMPT_TIMEOUT_MS,
  BACKOFF_MS,
  ERROR_BODY_MAX,
  TRIES,
} from "./budget.ts";

export const JEV_API = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = "jev-latest";

/** A reply of the API with an error status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** The part of a reply that the retry reads. */
export interface JevReply {
  readonly status: number;
  readonly ok: boolean;
  readonly text: string;
}

/** `$.http` in the mod. */
export interface JevHttp {
  readonly fetch: (
    url: string,
    init: {
      readonly method: string;
      readonly headers: Record<string, string>;
      readonly body: string;
    },
  ) => Promise<JevReply>;
}

/** `$.clock` in the mod. */
export interface JevClock {
  readonly sleep: (
    ms: number,
    options?: { readonly signal: AbortSignal },
  ) => Promise<unknown>;
}

/** The request body for a state and named questions. */
export const jevBody = (state: string, questions: object) => ({
  state,
  model: JEV_MODEL,
  questions,
});

/** The JSON of the first `ok` reply of `send`. A 429 or a 529 waits `BACKOFF_MS`, doubled for each retry, up to `TRIES` tries. */
export const retried = async (
  send: () => Promise<JevReply>,
  sleep: (ms: number) => Promise<unknown>,
): Promise<unknown> => {
  for (let i = 0; ; i++) {
    const res = await send();
    if (res.ok) return JSON.parse(res.text);
    if ((res.status === 429 || res.status === 529) && i < TRIES - 1) {
      await sleep(BACKOFF_MS * 2 ** i);
      continue;
    }
    const detail = res.text.slice(0, ERROR_BODY_MAX);
    throw new ApiError(res.status, `TypeSafe API ${res.status}: ${detail}`);
  }
};

/** `work`, or a throw after `ATTEMPT_TIMEOUT_MS`, because `HttpInit` has no timeout. The timer stops when `work` settles. */
const bounded = async <T>(work: Promise<T>, clock: JevClock): Promise<T> => {
  const stop = new AbortController();
  try {
    return await Promise.race([
      work,
      clock.sleep(ATTEMPT_TIMEOUT_MS, { signal: stop.signal }).then(() => {
        throw new Error("The TypeSafe API did not answer in time.");
      }),
    ]);
  } finally {
    stop.abort();
  }
};

/** The `answers` of the reply to `body`. The key goes only in the `authorization` header. It throws on a failure and on a timeout. `http` and `clock` are `$.http` and `$.clock` in the mod. */
export const postJev = async (
  key: string,
  body: object,
  http: JevHttp,
  clock: JevClock,
): Promise<unknown> => {
  const json = JSON.stringify(body);
  const headers = {
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };
  const reply = (await retried(
    () =>
      bounded(
        http.fetch(JEV_API, { method: "POST", headers, body: json }),
        clock,
      ),
    (ms) => clock.sleep(ms),
  )) as { answers?: unknown };
  return reply.answers;
};

/** P(yes) of the yes or no answer `name` in `answers`, or `undefined` when the answer is missing or not a probability. */
export const noulOf = (answers: unknown, name: string): number | undefined => {
  const answer = (
    answers as Record<string, { noul?: unknown } | undefined> | null
  )?.[name];
  const p = answer?.noul;
  return typeof p === "number" && p >= 0 && p <= 1 ? p : undefined;
};
