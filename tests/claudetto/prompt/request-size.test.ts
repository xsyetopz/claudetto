// Spec `prompt-base`, "Request Size Only Shrinks": the parts of the first main request that claudetto writes stay at or under their pinned sizes.
// `openspec/changes/0-3-0/evidence.md` has the stub capture of the whole request.

import { expect, test } from "bun:test";
import path from "node:path";
import { CONTEXT_TEXT } from "../../../plugins/claudetto/slices/prompt/domain/compaction.ts";
import { shellFacts } from "../../../plugins/claudetto/slices/prompt/domain/environment.ts";
import { TOOL_TEXTS } from "../../../plugins/claudetto/slices/prompt/domain/tools.ts";
import {
  CONTEXT_BLOCKS_MAX_CHARS,
  MAIN_BODY_MAX_CHARS,
  TOOL_TEXTS_MAX_CHARS,
} from "../../../tools/limits.ts";
import { PLUGINS } from "../../support/repo.ts";

/** The body of `claudetto:main` after its frontmatter, as `system[2]` holds it. */
const body = async () =>
  (await Bun.file(path.join(PLUGINS, "claudetto/agents/main.md")).text())
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .trim();

test("Text Grows: the body of `claudetto:main` is at most `MAIN_BODY_MAX_CHARS`", async () => {
  expect((await body()).length).toBeLessThanOrEqual(MAIN_BODY_MAX_CHARS);
});

test("the tool texts are at most `TOOL_TEXTS_MAX_CHARS`", () => {
  expect(Object.values(TOOL_TEXTS).join("").length).toBeLessThanOrEqual(
    TOOL_TEXTS_MAX_CHARS,
  );
});

test("the context blocks are at most `CONTEXT_BLOCKS_MAX_CHARS`", () => {
  const longest = Math.max(...Object.values(CONTEXT_TEXT).map((t) => t.length));
  expect(longest + shellFacts("darwin", "/bin/zsh").length).toBeLessThanOrEqual(
    CONTEXT_BLOCKS_MAX_CHARS,
  );
});
