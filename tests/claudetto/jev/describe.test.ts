// The mod handler `onDescribe` (`modules/jev/adapters/mod.ts`) changes the description of `AskUserQuestion` only when Jev can answer: the option `decide` is `jev`, and a key is set.
// The key is the sensitive option `TYPESAFE_API_KEY` or the env var of the same name. The engine is a stub, so no test runs `claude-code/testing`.

import { afterEach, expect, test } from "bun:test";
import type { PluginOptions } from "claude-code";
import { keepOptions } from "../../../plugins/claudetto/kernel/options.ts";
import { onDescribe } from "../../../plugins/claudetto/modules/jev/adapters/mod.ts";

const ORIGINAL = { description: "Asks the user.", provider: "engine" };

/** Runs `onDescribe` with the options and the env var, and gives the answer and the count of `next` calls. */
const describeWith = async (
  options: PluginOptions,
  env: string | undefined,
) => {
  keepOptions(options);
  const calls = { next: 0 };
  const engine = { env: { get: async () => env } };
  const next = async () => {
    calls.next++;
    return { ...ORIGINAL };
  };
  const answer = (await (onDescribe as unknown as Handler)(
    engine,
    { tool: "AskUserQuestion" },
    next,
  )) as typeof ORIGINAL;
  return { answer, calls };
};

type Handler = (
  engine: object,
  e: object,
  next: () => Promise<object>,
) => Promise<object>;

afterEach(() => keepOptions({}));

test("`onDescribe` extends the description with the option `jev` and a key in the env", async () => {
  const { answer, calls } = await describeWith({ decide: "jev" }, "env-key");

  expect(calls.next).toBe(1);
  expect(answer.description).toStartWith(ORIGINAL.description);
  expect(answer.description).not.toBe(ORIGINAL.description);
  expect(answer.provider).toBe(ORIGINAL.provider);
});

test("`onDescribe` extends the description with the option `jev` and the option `TYPESAFE_API_KEY` alone", async () => {
  const options = { decide: "jev", TYPESAFE_API_KEY: "option-key" };

  const { answer } = await describeWith(options, undefined);

  expect(answer.description).not.toBe(ORIGINAL.description);
});

test("`onDescribe` leaves the answer as it is with the option `jev` and no key", async () => {
  for (const env of [undefined, ""]) {
    const { answer, calls } = await describeWith(
      { decide: "jev", TYPESAFE_API_KEY: "" },
      env,
    );

    expect(calls.next).toBe(1);
    expect(answer).toEqual(ORIGINAL);
  }
});

test("`onDescribe` leaves the answer as it is when the option `decide` is not `jev`, even with a key", async () => {
  for (const options of [
    { decide: "off", TYPESAFE_API_KEY: "option-key" },
    { decide: "claude", TYPESAFE_API_KEY: "option-key" },
    { TYPESAFE_API_KEY: "option-key" },
  ]) {
    const { answer, calls } = await describeWith(options, "env-key");

    expect(calls.next).toBe(1);
    expect(answer).toEqual(ORIGINAL);
  }
});
