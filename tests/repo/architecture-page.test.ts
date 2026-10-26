// Each path that the page `Architecture.md` names exists (spec `plugin-architecture`, "Architecture Page").

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { REPO } from "../support/repo.ts";

const PLUGIN = path.join(REPO, "plugins/claudetto");
const PAGE = await Bun.file(
  path.join(REPO, "src/wiki/claudetto/Architecture.md"),
).text();

/** The paths in the code spans of `page` that exist under none of `roots`. A span with a `<placeholder>` is not a path. */
const missingPaths = (page: string, roots: string[]): string[] =>
  [...page.matchAll(/`([^`\s<>]+\/[^`\s<>]*)`/g)]
    .map((m) => m[1] as string)
    .filter((p) => !/^https?:|^\$/.test(p))
    .filter((p) => !roots.some((r) => fs.existsSync(path.join(r, p))));

const modules = fs
  .readdirSync(path.join(PLUGIN, "modules"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

test("each path that the page names exists", () => {
  // A module part, such as `domain/`, is a path under a module folder.
  const roots = [REPO, PLUGIN, path.join(PLUGIN, "kernel")].concat(
    modules.map((m) => path.join(PLUGIN, "modules", m)),
  );
  expect(missingPaths(PAGE, roots)).toEqual([]);
});

test("the check names a path that does not exist", () => {
  expect(missingPaths("`modules/styles/` and `kernel/`", [PLUGIN])).toEqual([
    "modules/styles/",
  ]);
});
