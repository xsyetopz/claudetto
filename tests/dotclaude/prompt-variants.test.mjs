// Tests of the prompt variants of design D15: the section structure.

import { expect, test } from "bun:test";
import {
  composeSections,
  variantKey,
} from "../../plugins/dotclaude/features/prompt/select.mjs";
import {
  VARIANTS,
  variantText,
} from "../../plugins/dotclaude/features/prompt/variants.mjs";

const KEYS = Object.keys(VARIANTS);

test("a variant uses XML tags and no section is empty", () => {
  for (const k of KEYS)
    for (const s of VARIANTS[k].sections) {
      expect(s).toMatch(/^<\w+>\n/);
      expect(s).toMatch(/\n<\/\w+>$/);
    }
});

test("`variantKey` maps ids and aliases, and `composeSections` keeps unknown ids in order", () => {
  expect(variantKey("claude-haiku-5-5")).toBe("haiku");
  expect(variantKey("opus")).toBe("opus");
  expect(variantKey("gpt-x")).toBeNull();
  const ids = composeSections(
    [
      { id: "intro", text: "a", scope: "shared" },
      { id: "doing_tasks", text: "b", scope: "shared" },
      { id: "new_one", text: "c", scope: "shared" },
      { id: "memory", text: "d", scope: "session" },
    ],
    "sonnet",
  ).map((s) => s.id);
  expect(ids.slice(-2)).toEqual(["new_one", "memory"]);
  expect(ids.filter((i) => i === "intro" || i === "doing_tasks")).toEqual([]);
});
