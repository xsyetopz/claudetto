// The slice `notes` makes no model request (spec `side-notes`, "No Model Request"): no file of it calls `$.model`.

import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(
  import.meta.dir,
  "../../../../plugins/claudetto/modules/work/notes",
);

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(path.join(dir, entry.name))
      : entry.name.endsWith(".ts")
        ? [path.join(dir, entry.name)]
        : [],
  );

test("no file of the slice calls `$.model`", async () => {
  const files = sources(ROOT);
  expect(files.length).toBeGreaterThan(3);
  for (const file of files)
    expect(await Bun.file(file).text()).not.toMatch(
      /\$\.model\b|model\.(complete|fork|classify)/,
    );
});
