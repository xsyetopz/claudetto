// The `box` hook of the `finish` slice with a fake `$` (spec `usage-awareness`, "Cost Report", scenario "Apply Report").

import { expect, test } from "bun:test";
import { onBoxCall } from "../../../plugins/claudetto/slices/finish/adapters/mod.ts";

type Result = { deny?: string; context?: string[] };

const BEFORE = "- [ ] 1.1 Run `just check`\n";
const EDIT = {
  tool: "Edit",
  file_path: "/p/tasks.md",
  old_string: "[ ]",
  new_string: "[x]",
};

/** A fake `$` whose session started at the 5-hour share 20%, with `usage` now, and a passed `just check`. */
const fake = (usage: () => Promise<unknown>) => ({
  fs: { exists: async () => true, read: async () => BEFORE },
  session: {
    messages: async () => [
      {
        role: "assistant",
        text: "",
        handle: "h",
        toolUses: [
          {
            tool: "Bash",
            input: { command: "just check" },
            text: "ok",
            isError: false,
          },
        ],
      },
    ],
    usage,
  },
  state: {
    get: async () => ({ value: { bands: {}, start: { five_hour: 20 } } }),
  },
});

const tick = ($: unknown) =>
  (onBoxCall as unknown as (...a: unknown[]) => Promise<Result>)(
    $,
    EDIT,
    async () => ({}),
  );

test("Apply Report: a tick that goes through adds the cost and `+11%` for the 5-hour share", async () => {
  const got = await tick(
    fake(async () => ({
      cost: { usd: 1.5 },
      rateLimits: [{ kind: "five_hour", percentUsed: 31 }],
    })),
  );
  expect(got.context?.join(" ")).toContain("$1.50");
  expect(got.context?.join(" ")).toContain("5-hour +11%");
});

test("Apply Report: an API key gives the cost only", async () => {
  const got = await tick(
    fake(async () => ({ cost: { usd: 1.5 }, rateLimits: [] })),
  );
  expect(got.context?.join(" ")).toContain("$1.50");
  expect(got.context?.join(" ")).not.toContain("%");
});

test("Apply Report: a fault of the usage read adds nothing and keeps the tick", async () => {
  const got = await tick(
    fake(async () => {
      throw new Error("no usage");
    }),
  );
  expect(got.deny).toBeUndefined();
  expect(got.context).toBeUndefined();
});
