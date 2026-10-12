// The override of `biome.json` that loads `tools/lint/arrow-functions.grit` exempts each path of `tools/rebuild-pending.txt`.
// The list file is the one source, so this test fails when the globs of the override and the list differ.

import { expect, test } from "bun:test";
import path from "node:path";
import { PENDING_FILE, parsePending } from "../../tools/generate/pending.ts";
import { REPO } from "./repo.ts";

type Override = { includes?: string[]; plugins?: string[] };

// The negated glob of a list line: a folder line gives each file in the folder.
const globOf = (entry: string): string =>
  entry.endsWith("/") ? `!${entry}**` : `!${entry}`;

test("the exempt globs of `biome.json` are the paths of the rebuild list", async () => {
  const biome = await Bun.file(path.join(REPO, "biome.json")).json();
  const overrides = (biome.overrides ?? []) as Override[];
  const exempt = overrides.find((o) =>
    o.plugins?.some((p) => p.endsWith("arrow-functions.grit")),
  );
  const list = parsePending(
    await Bun.file(path.join(REPO, PENDING_FILE)).text(),
  );
  expect(exempt?.includes).toStrictEqual(["**", ...list.map(globOf)]);
});
