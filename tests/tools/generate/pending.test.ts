// Behavior of the rebuild list `tools/rebuild-pending.txt` (design, "The rebuild branch"), as `tools/generate/pending.ts` reads it.

import { expect, test } from "bun:test";
import {
  isPending,
  parsePending,
  unlisted,
} from "../../../tools/generate/pending.ts";
import { fixtureRoot } from "./fixture.ts";

test("the list has no comment and no blank line, and a line keeps no space at its ends", () => {
  expect(
    parsePending("# P02 guard\nplugins/a/x.ts\n\n  plugins/b/  \n# P03\n"),
  ).toStrictEqual(["plugins/a/x.ts", "plugins/b/"]);
});

test("a line names one file, and a line that ends with `/` names each file in its folder", () => {
  const entries = ["plugins/a/x.ts", "plugins/b/"];
  expect(isPending(entries, "plugins/a/x.ts")).toBeTrue();
  expect(isPending(entries, "plugins/a/x.tsx")).toBeFalse();
  expect(isPending(entries, "plugins/b/deep/y.md")).toBeTrue();
  expect(isPending(entries, "plugins/bb/y.md")).toBeFalse();
});

test("a written file and a listed file pass, and each other file in `plugins/` gets one message", async () => {
  const dir = await fixtureRoot({
    "plugins/q/made.md": "Made.\n",
    "plugins/q/listed.md": "Listed.\n",
    "plugins/q/stray.md": "Stray.\n",
    "tools/rebuild-pending.txt": "plugins/q/listed.md\n",
  });
  const found = await unlisted(dir, ["plugins/q/made.md"]);
  expect(found).toHaveLength(1);
  expect(found[0]).toStartWith("plugins/q/stray.md ");
});

test("with no list, each file in `plugins/` that the generator did not write gets one message", async () => {
  const dir = await fixtureRoot({ "plugins/q/stray.md": "Stray.\n" });
  expect(await unlisted(dir, [])).toHaveLength(1);
});
