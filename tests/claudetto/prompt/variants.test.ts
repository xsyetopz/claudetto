// Tests of the prompt variants of design D15: the section structure.

import { expect, test } from "bun:test";
import {
  composeSections,
  variantKey,
} from "../../../plugins/claudetto/slices/prompt/domain/apply.ts";
import {
  shellWord,
  VARIANTS,
  variantSections,
} from "../../../plugins/claudetto/slices/prompt/domain/variants.ts";

const KEYS = Object.keys(VARIANTS) as (keyof typeof VARIANTS)[];

const ROOT = "/p";

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
    ROOT,
  ).map((s) => s.id);
  expect(ids.slice(-2)).toStrictEqual(["new_one", "memory"]);
  expect(ids.filter((i) => i === "intro" || i === "doing_tasks")).toStrictEqual(
    [],
  );
});

test("the section ids of each variant are `claudetto:<word>` and unique", () => {
  for (const k of KEYS) {
    const ids = variantSections(k, ROOT).map((s) => s.id);
    expect(ids.length > 0, k).toBeTruthy();
    for (const id of ids) expect(id, `${k} ${id}`).toMatch(/^claudetto:\w+$/);
    expect(new Set(ids).size, k).toBe(ids.length);
    expect(!ids.includes("claudetto:undefined"), k).toBeTruthy();
  }
});

test("the `tools` section names `claudetto-run-checks` by its path under the plugin root, in each variant", () => {
  for (const k of KEYS) {
    const tools = variantSections(k, "/cache/claudetto").find(
      (s) => s.id === "claudetto:tools",
    )?.text;
    expect(tools, k).toContain(
      '`/cache/claudetto/bin/claudetto-run-checks "bun test" "bun run lint"`',
    );
    // A bare name is not on `PATH` in each session (D57), so no command in the section starts with it.
    expect(tools, k).not.toMatch(/`claudetto-run-checks[ `]/);
  }
});

test("`shellWord` keeps a safe path and quotes a path with a space or a quote", () => {
  expect(shellWord("/Users/a-b/.claude/plugins/c@1.0")).toBe(
    "/Users/a-b/.claude/plugins/c@1.0",
  );
  expect(shellWord("/Users/a b/c")).toBe("'/Users/a b/c'");
  expect(shellWord("/it's/c")).toBe("'/it'\\''s/c'");
});
