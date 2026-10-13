// `main`: an unknown command stops with the usage, and the removed commands are unknown.

import { expect, test } from "bun:test";
import { makeStore, run } from "./read-fixture.ts";

test.each(["bogus", "new", "lane", "retry", "record"])(
  "the command `%s` is unknown: exit 2 with the usage",
  async (name) => {
    const root = await makeStore();
    const r = await run(root, name, "x");
    expect(r.code).toBe(2);
    expect(r.err.join("\n")).toContain("Usage");
  },
);
