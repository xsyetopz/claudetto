// Tests of each transform against the extracted sections of Claude Code 2.1.296 in `external/`.
// `external/` is git-ignored, because it holds the text of Claude Code, so CI has no extract.
// Each test runs only where the extract exists, such as a local checkout with `external/`.

import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
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
const present = existsSync(SECTIONS);
const files = present ? await readdir(SECTIONS) : [];

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

  test.skipIf(!present)(
    `the transform of \`${id}\` has an extract to read`,
    () => {
      expect(texts.length).toBeGreaterThan(0);
    },
  );

  for (const part of parts) {
    test.skipIf(!present)(
      `an anchor of \`${id}\` finds its part in the extract`,
      () => {
        expect(texts.some((t) => t.search(part.anchor) >= 0)).toBe(true);
      },
    );
  }

  test.skipIf(!present)(
    `the transform of \`${id}\` shortens each extracted text it changes`,
    () => {
      for (const text of texts) {
        const out = TRANSFORMS.get(id)?.(text) ?? text;
        expect(out.length).toBeLessThanOrEqual(text.length);
      }
    },
  );
}
