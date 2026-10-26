// Each command of `bin/` imports names that its target module exports. The type check skips these files, because they have no `.ts` extension.

import { expect, test } from "bun:test";
import path from "node:path";

const entries = [...new Bun.Glob("plugins/*/bin/*").scanSync(".")].sort();

test("each plugin has a command in `bin/`", () => {
  expect(entries.length).toBeGreaterThan(0);
});

for (const entry of entries)
  test(`\`${entry}\` imports only exported names`, async () => {
    const text = await Bun.file(entry).text();
    const missing: string[] = [];
    for (const [, names = "", spec = ""] of text.matchAll(
      /import \{([^}]+)\} from "([^"]+)"/g,
    )) {
      const target = await import(path.resolve(path.dirname(entry), spec));
      for (const name of names.split(",").map((n) => n.trim()))
        if (name !== "" && !(name in target))
          missing.push(`${name} of ${spec}`);
    }
    expect(missing).toStrictEqual([]);
  });
