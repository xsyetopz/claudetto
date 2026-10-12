// Test of the `surface` transforms against the extract of Claude Code 2.1.296: each transform finds its built-in tool text.
// A transform that finds no text changes nothing, so each one must shorten the text of its id, or defer its tool.
// The extract is in `external/` of the main checkout, and git ignores it.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  TOOL_TRANSFORMS,
  toolAnswer,
} from "../../../plugins/dotclaude/slices/surface/domain/tools.ts";
import { REPO } from "../../support/repo.ts";

const TOOLS = path.join(REPO, "external/cc-extract/2.1.296/tool");

for (const transform of TOOL_TRANSFORMS) {
  test(`the transform of \`${transform.id}\` finds its built-in text in the extract`, () => {
    const file = path.join(TOOLS, `${transform.id}.txt`);
    expect(fs.existsSync(file), file).toBe(true);
    const builtIn = fs.readFileSync(file, "utf8");
    const answer = toolAnswer(transform.id, { description: builtIn });
    expect(answer).toBeDefined();
    if (transform.description !== undefined)
      expect(answer?.description.length).toBeLessThan(builtIn.length);
    if (transform.defer) expect(answer?.isDeferred).toBe(true);
  });
}
