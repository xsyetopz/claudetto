// Tests of the prompt variants of design D15: the section structure.

import { expect, test } from "bun:test";
import {
  composeSections,
  variantKey,
} from "../../plugins/dotclaude/features/prompt/select.ts";
import {
  VARIANTS,
  variantSections,
} from "../../plugins/dotclaude/features/prompt/variants.ts";

const KEYS = Object.keys(VARIANTS) as (keyof typeof VARIANTS)[];

test("`variantKey` maps ids and aliases, and `composeSections` keeps unknown ids in order", () => {
  expect(variantKey("claude-haiku-5-5")).toBe("haiku");
  expect(variantKey("opus")).toBe("opus");
  expect(variantKey("claude-mythos-5-1")).toBe("fable");
  expect(variantKey("gpt-x")).toBe(null);
  const ids = composeSections(
    [
      { id: "intro", text: "a", scope: "shared" },
      { id: "doing_tasks", text: "b", scope: "shared" },
      { id: "new_one", text: "c", scope: "shared" },
      { id: "memory", text: "d", scope: "session" },
    ],
    "sonnet",
  ).map((s) => s.id);
  expect(ids.slice(-2)).toStrictEqual(["new_one", "memory"]);
  expect(ids.filter((i) => i === "intro" || i === "doing_tasks")).toStrictEqual(
    [],
  );
});

test("the section ids of each variant are `dotclaude:<word>` and unique", () => {
  for (const k of KEYS) {
    const ids = variantSections(k).map((s) => s.id);
    expect(ids.length > 0, k).toBeTruthy();
    for (const id of ids) expect(id, `${k} ${id}`).toMatch(/^dotclaude:\w+$/);
    expect(new Set(ids).size, k).toBe(ids.length);
    expect(!ids.includes("dotclaude:undefined"), k).toBeTruthy();
  }
});
