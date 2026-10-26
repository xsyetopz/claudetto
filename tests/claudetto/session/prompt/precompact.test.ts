// The compaction line of the `built-in` path: the `session.compact` mod hook adds it to `instructions`, with no process spawn.

import { expect, test } from "bun:test";
import { keepOptions } from "../../../../plugins/claudetto/kernel/options.ts";
import { onCompact } from "../../../../plugins/claudetto/modules/session/prompt/adapters/mod.ts";
import { PRECOMPACT_LINE } from "../../../../plugins/claudetto/modules/session/prompt/prompts.ts";

const run = onCompact as never as (
  $: unknown,
  e: { trigger: string; instructions?: string; messages: [] },
  next: (e: unknown) => Promise<unknown>,
) => Promise<unknown>;

/** The `instructions` that `next` gets for the option `compaction` and the text after `/compact`. */
const sent = async (
  compaction: string | undefined,
  instructions?: string,
): Promise<string | undefined> => {
  keepOptions(compaction === undefined ? {} : { compaction });
  let got: { instructions?: string } = {};
  const e = { trigger: "auto", messages: [] as [] };
  await run({}, instructions ? { ...e, instructions } : e, async (e) => {
    got = e as { instructions?: string };
    return { messages: [] };
  });
  return got.instructions;
};

test("the `built-in` path adds the line", async () => {
  expect(await sent("built-in")).toBe(PRECOMPACT_LINE);
});

test("the `built-in` path keeps the text after `/compact`", async () => {
  expect(await sent("built-in", "the plan")).toBe(
    `the plan\n\n${PRECOMPACT_LINE}`,
  );
});

test("the other paths leave `instructions` as they are", async () => {
  expect(await sent("auto")).toBeUndefined();
  expect(await sent("handover", "the plan")).toBe("the plan");
  expect(await sent(undefined)).toBeUndefined();
});

test("`hooks.json` has no `PreCompact` command hook", async () => {
  const hooks = await Bun.file(
    new URL("../../../../plugins/claudetto/hooks/hooks.json", import.meta.url),
  ).json();
  expect(hooks.hooks.PreCompact).toBeUndefined();
});
