// Tests of each transform against the extracted sections of Claude Code 2.1.296 in `external/`.
// `external/` is git-ignored, so this file fails where the extract is missing, and it has no skip.

import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { TRANSFORMS } from "../../../plugins/dotclaude/slices/prompt/transforms/index.ts";
import type { Part } from "../../../plugins/dotclaude/slices/prompt/transforms/parts.ts";
import { REPO } from "../../support/repo.ts";

const SECTIONS = path.join(
  REPO,
  "external",
  "cc-extract",
  "2.1.296",
  "section",
);
const files = await readdir(SECTIONS);

for (const id of TRANSFORMS.keys()) {
  const sectionFiles = files.filter(
    (f) => f === `${id}.txt` || f === `${id}.full.txt`,
  );
  const texts = await Promise.all(
    sectionFiles.map((f) => Bun.file(path.join(SECTIONS, f)).text()),
  );
  const mod = await import(
    `../../../plugins/dotclaude/slices/prompt/transforms/${id}.ts`
  );
  const parts: readonly Part[] = mod.PARTS ?? [];

  test(`the transform of \`${id}\` has an extract to read`, () => {
    expect(texts.length).toBeGreaterThan(0);
  });

  for (const part of parts) {
    test(`an anchor of \`${id}\` finds its part in the extract`, () => {
      expect(texts.some((t) => t.search(part.anchor) >= 0)).toBe(true);
    });
  }

  test(`the transform of \`${id}\` shortens each extracted text it changes`, () => {
    for (const text of texts) {
      const out = TRANSFORMS.get(id)?.(text) ?? text;
      expect(out.length).toBeLessThanOrEqual(text.length);
    }
  });
}
