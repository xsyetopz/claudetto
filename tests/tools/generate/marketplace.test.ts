// Behavior of the marketplace step of `tools/generate/` (`tools/generate/emit/marketplace.ts`).
// Each test works in its own copy of the fixture under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { discover } from "../../../tools/generate/discover.ts";
import { marketplaceOf } from "../../../tools/generate/emit/marketplace.ts";
import { outputs } from "../../../tools/generate/emit/texts.ts";
import { fixtureRoot, textOf, VERSION } from "./fixture.ts";

const source = (plugins: string[]): string =>
  `export const marketplace = { name: "m", owner: { name: "o" }, description: "D.", plugins: ${JSON.stringify(plugins)}, category: "c" } as const;\n`;

test("a root with no `src/marketplace.ts` gets no marketplace file", async () => {
  const dir = await fixtureRoot();
  expect(await marketplaceOf(dir, await discover(dir))).toStrictEqual([]);
});

test("the marketplace file lists each plugin with its source, its description, and the version of `package.json`", async () => {
  const dir = await fixtureRoot({ "src/marketplace.ts": source(["p"]) });
  const made = await marketplaceOf(dir, await discover(dir));
  const json = JSON.parse(textOf(made, ".claude-plugin/marketplace.json"));
  expect(json.metadata).toStrictEqual({ version: VERSION });
  expect(json.plugins).toHaveLength(1);
  expect(json.plugins[0].name).toBe("p");
  expect(json.plugins[0].source).toBe("./plugins/p");
  expect(json.plugins[0].category).toBe("c");
  expect(json.plugins[0].description).toBe(
    "A fixture plugin. It has two sentences.",
  );
});

test("`src/marketplace.ts` gives no copy at the root", async () => {
  const dir = await fixtureRoot({ "src/marketplace.ts": source(["p"]) });
  const files = (await outputs(dir)).map((o) => o.file);
  expect(files).not.toContain("marketplace.ts");
});

test("a plugin with no `description.md` is an error that names the file", async () => {
  const dir = await fixtureRoot();
  fs.rmSync(path.join(dir, "src", "plugins", "p", "description.md"));
  await expect(discover(dir)).rejects.toThrow("src/plugins/p/description.md");
});

test("a list that names a plugin with no `plugin.ts` throws", async () => {
  const dir = await fixtureRoot({ "src/marketplace.ts": source(["p", "q"]) });
  await expect(marketplaceOf(dir, await discover(dir))).rejects.toThrow(
    "remove q",
  );
});

test("a list that leaves out a plugin with a `plugin.ts` throws", async () => {
  const dir = await fixtureRoot({ "src/marketplace.ts": source([]) });
  await expect(marketplaceOf(dir, await discover(dir))).rejects.toThrow(
    "add p",
  );
});

test("a list that names a plugin twice throws", async () => {
  const dir = await fixtureRoot({ "src/marketplace.ts": source(["p", "p"]) });
  await expect(marketplaceOf(dir, await discover(dir))).rejects.toThrow(
    "src/marketplace.ts",
  );
});
