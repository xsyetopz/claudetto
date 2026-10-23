// The call of the TypeSafe API from the mod (`kernel/jev.ts`): the request, the retry on 429 and 529, the bound of each try, and the key.
// The ports are fakes, so no test sends a request or waits.

import { expect, test } from "bun:test";
import {
  ATTEMPT_TIMEOUT_MS,
  BACKOFF_MS,
  ERROR_BODY_MAX,
  TRIES,
} from "../../plugins/claudetto/kernel/budget.ts";
import {
  ApiError,
  JEV_API,
  jevBody,
  noulOf,
  postJev,
} from "../../plugins/claudetto/kernel/jev.ts";

const KEY = "test-key-not-real";

const reply = (status: number, text = "{}") => ({
  status,
  ok: status >= 200 && status < 300,
  text,
});

const OK = reply(200, JSON.stringify({ answers: { q: { noul: 0.9 } } }));

/** Ports that give the `replies` in order and record each request and each wait. */
const ports = (...replies: (ReturnType<typeof reply> | "hang")[]) => {
  const seen = {
    fetches: [] as { url: string; init: unknown }[],
    waits: [] as number[],
  };
  const fake = {
    http: {
      fetch: (url: string, init: unknown) => {
        seen.fetches.push({ url, init });
        const next = replies[seen.fetches.length - 1];
        if (next === undefined) throw new Error("no more replies in the fake");
        return next === "hang"
          ? new Promise<never>(() => {})
          : Promise.resolve(next);
      },
    },
    clock: {
      sleep: async (ms: number) => {
        seen.waits.push(ms);
      },
    },
  };
  return { fake, seen };
};

const BODY = jevBody("state", { q: { type: "noul", instructions: "Ok?" } });

test("the body holds the state, the model `jev-latest`, and the questions", () => {
  expect(BODY).toEqual({
    state: "state",
    model: "jev-latest",
    questions: { q: { type: "noul", instructions: "Ok?" } },
  });
});

test("`postJev` posts the JSON body with the key in the `authorization` header only", async () => {
  const { fake, seen } = ports(OK);
  const answers = await postJev(KEY, BODY, fake.http, fake.clock);
  expect(answers).toEqual({ q: { noul: 0.9 } });
  const [sent] = seen.fetches;
  expect(sent?.url).toBe(JEV_API);
  const init = sent?.init as {
    method: string;
    headers: Record<string, string>;
    body: string;
  };
  expect(init.method).toBe("POST");
  expect(init.headers["authorization"]).toBe(`Bearer ${KEY}`);
  expect(init.body).not.toContain(KEY);
  expect(JSON.parse(init.body)).toEqual(BODY);
});

test("a 429 and then a 529 wait `BACKOFF_MS` and twice that, and the third try answers", async () => {
  const { fake, seen } = ports(reply(429), reply(529), OK);
  await postJev(KEY, BODY, fake.http, fake.clock);
  expect(seen.fetches).toHaveLength(3);
  expect(seen.waits.filter((ms) => ms !== ATTEMPT_TIMEOUT_MS)).toEqual([
    BACKOFF_MS,
    BACKOFF_MS * 2,
  ]);
});

test("a 429 on each try throws an `ApiError` after `TRIES` tries", async () => {
  const { fake, seen } = ports(reply(429), reply(429), reply(429));
  const err = await postJev(KEY, BODY, fake.http, fake.clock).catch(
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).status).toBe(429);
  expect(seen.fetches).toHaveLength(TRIES);
});

test("a 401 is not retried, and the error text is cut and holds no key", async () => {
  const { fake, seen } = ports(reply(401, "x".repeat(ERROR_BODY_MAX * 3)));
  const err = (await postJev(KEY, BODY, fake.http, fake.clock).catch(
    (e: unknown) => e,
  )) as Error;
  expect(seen.fetches).toHaveLength(1);
  expect(err.message.split("x").length - 1).toBe(ERROR_BODY_MAX);
  expect(err.message).not.toContain(KEY);
});

test("a try that never answers ends at `ATTEMPT_TIMEOUT_MS` with no retry", async () => {
  const { fake, seen } = ports("hang");
  const err = await postJev(KEY, BODY, fake.http, fake.clock).catch(
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(Error);
  expect(seen.waits).toEqual([ATTEMPT_TIMEOUT_MS]);
  expect(seen.fetches).toHaveLength(1);
  expect((err as Error).message).not.toContain(KEY);
});

test("`noulOf` gives P(yes) of a named answer, and `undefined` for anything else", () => {
  expect(noulOf({ q: { type: "noul", noul: 0.4 } }, "q")).toBe(0.4);
  expect(noulOf({ q: { noul: 1.2 } }, "q")).toBeUndefined();
  expect(noulOf({ q: { choice: "a" } }, "q")).toBeUndefined();
  expect(noulOf({}, "q")).toBeUndefined();
  expect(noulOf(null, "q")).toBeUndefined();
});
