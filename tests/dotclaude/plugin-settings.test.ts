// The pin test of the plugin `settings.json`: it holds only keys of the generated schema, none of the never-set keys,
// and only `agent` and `subagentStatusLine`, the keys that a plugin may set.
// It guards the 0.28.0 plugin file, which `trim` replaces, so this file goes with that file in the rebuild list.

import { expect, test } from "bun:test";
import path from "node:path";
import { REPO } from "../support/repo.ts";
import { problems, type Settings } from "../support/settings-pin.ts";

const FILE = "plugins/dotclaude/settings.json";

const readJson = async (file: string): Promise<Settings> =>
  JSON.parse(await Bun.file(path.join(REPO, file)).text());

// A docs lint: it pins the plugin file, by design (task 25.22).
test(`lint: \`${FILE}\` has only keys of the schema and no never-set key`, async () => {
  expect(problems(await readJson(FILE))).toStrictEqual([]);
});

test("the plugin `settings.json` holds only `agent` and `subagentStatusLine`, the keys that a plugin may set", async () => {
  const allowed = new Set(["agent", "subagentStatusLine"]);
  const extra = Object.keys(await readJson(FILE)).filter(
    (k) => !allowed.has(k),
  );
  expect(extra).toStrictEqual([]);
});
