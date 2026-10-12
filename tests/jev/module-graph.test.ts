// The module graph of the `dotclaude-jev` add-on: its feature files, with no `node:` import and no `Bun` use.
// It guards the 0.28.0 add-on, which `decide` replaces, so it goes with the `tests/jev/` folder.

import { expect, test } from "bun:test";
import {
  type Files,
  parseImports,
  repoFiles,
} from "../support/import-rules.ts";

test("the module graph of `dotclaude-jev` holds its feature files and no `node:` import or `Bun` use", async () => {
  const files = await repoFiles();
  const jev = Object.keys(files).filter((f) =>
    f.startsWith("plugins/dotclaude-jev/"),
  );
  expect(
    jev.includes("plugins/dotclaude-jev/hooks/register.ts"),
    jev.join("\n"),
  ).toBeTruthy();
  expect(
    jev.includes("plugins/dotclaude-jev/features/jev/tool.ts"),
    jev.join("\n"),
  ).toBeTruthy();
  const graph: Files = {};
  for (const f of jev)
    if (!f.endsWith("/cli.ts")) graph[f] = files[f] as string;
  for (const text of Object.values(graph))
    for (const { spec } of parseImports(text))
      expect(spec?.startsWith("node:")).toBe(false);
  // The client is the one file that uses the Bun API, and no module file imports it.
  const client = files["plugins/dotclaude-jev/features/jev/cli.ts"] as string;
  expect(client.includes("Bun."), client).toBeTruthy();
  for (const [f, text] of Object.entries(graph))
    expect(/(?<![\w.$])Bun\b/.test(text), f).toBe(false);
  for (const text of Object.values(graph))
    for (const { spec } of parseImports(text))
      expect(spec?.endsWith("cli.ts")).toBe(false);
});
