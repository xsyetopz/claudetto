// Tests that pin the handoff trigger bounds of `plugins/claudetto/modules/session/limits.ts` to the values of the handoff spec.

import { expect, test } from "bun:test";
import path from "node:path";
import {
  bandOf,
  CONTEXT_BLOCK_MARGIN,
  CONTEXT_WINDOW,
  HAIKU_HANDOFF_TRIGGER_TOKENS,
  HANDOFF_TRIGGER_TOKENS,
} from "../../../plugins/claudetto/modules/session/limits.ts";

test("the trigger of Opus, Sonnet, and Fable is 225,000 tokens", () => {
  expect(HANDOFF_TRIGGER_TOKENS).toBe(225_000);
});

test("the trigger of Haiku is 90,000 tokens", () => {
  expect(HAIKU_HANDOFF_TRIGGER_TOKENS).toBe(90_000);
});

test("each trigger is below the client block limit", () => {
  const block = CONTEXT_WINDOW - CONTEXT_BLOCK_MARGIN;
  expect(HANDOFF_TRIGGER_TOKENS).toBeLessThan(block);
  expect(HAIKU_HANDOFF_TRIGGER_TOKENS).toBeLessThan(block);
});

test("no file of `plugins/claudetto/kernel/` other than `node/limits.ts` exports a number", async () => {
  const numeric = /^export const [A-Z_]+ = [\d_]+;/m;
  const outside: string[] = [];
  for await (const f of new Bun.Glob("**/*.ts").scan({
    cwd: "plugins/claudetto/kernel",
  }))
    if (
      f !== "node/limits.ts" &&
      numeric.test(
        await Bun.file(path.join("plugins/claudetto/kernel", f)).text(),
      )
    )
      outside.push(f);
  expect(outside).toStrictEqual([]);
});

test("`bandOf` is green below 40, amber from 40 to 80, and red above 80", () => {
  expect(bandOf(0)).toBe("green");
  expect(bandOf(39.9)).toBe("green");
  expect(bandOf(40)).toBe("amber");
  expect(bandOf(80)).toBe("amber");
  expect(bandOf(80.1)).toBe("red");
  expect(bandOf(250)).toBe("red");
});
