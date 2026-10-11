// Tests of the prompt variants of design D15: the section structure.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  composeSections,
  variantKey,
} from "../../plugins/dotclaude/features/prompt/select.mjs";
import {
  BLOCK_LINE,
  EVIDENCE_LINE,
} from "../../plugins/dotclaude/features/prompt/shared.mjs";
import {
  spawnBlock,
  VARIANTS,
  variantSections,
} from "../../plugins/dotclaude/features/prompt/variants.mjs";

const KEYS = Object.keys(VARIANTS);

test("`variantKey` maps ids and aliases, and `composeSections` keeps unknown ids in order", () => {
  assert.equal(variantKey("claude-haiku-5-5"), "haiku");
  assert.equal(variantKey("opus"), "opus");
  assert.equal(variantKey("claude-mythos-5-1"), "fable");
  assert.equal(variantKey("gpt-x"), null);
  const ids = composeSections(
    [
      { id: "intro", text: "a", scope: "shared" },
      { id: "doing_tasks", text: "b", scope: "shared" },
      { id: "new_one", text: "c", scope: "shared" },
      { id: "memory", text: "d", scope: "session" },
    ],
    "sonnet",
  ).map((s) => s.id);
  assert.deepEqual(ids.slice(-2), ["new_one", "memory"]);
  assert.deepEqual(
    ids.filter((i) => i === "intro" || i === "doing_tasks"),
    [],
  );
});

test("the block of each model for a subagent holds the evidence line", () => {
  for (const k of KEYS) assert.ok(spawnBlock(k).includes(EVIDENCE_LINE), k);
});

test("the block of each model for a subagent holds the block line", () => {
  for (const k of KEYS) assert.ok(spawnBlock(k).includes(BLOCK_LINE), k);
});

test("the sections of each variant for the main session hold the evidence line that the subagent block holds", () => {
  for (const k of KEYS)
    assert.ok(
      variantSections(k).some((s) => s.text.includes(EVIDENCE_LINE)),
      k,
    );
});

test("the section ids of each variant are `dotclaude:<word>` and unique", () => {
  for (const k of KEYS) {
    const ids = variantSections(k).map((s) => s.id);
    assert.ok(ids.length > 0, k);
    for (const id of ids) assert.match(id, /^dotclaude:\w+$/, `${k} ${id}`);
    assert.equal(new Set(ids).size, ids.length, k);
    assert.ok(!ids.includes("dotclaude:undefined"), k);
  }
});
