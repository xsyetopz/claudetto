// The eval cases ship in the `evals/` folder of each plugin and nowhere else.
// No other file of `plugins/` names a case, a grader, or `case.yaml`,
// so the text of a case does not leak into the context of the agent under test.
// So the name of each case and each grader is unique in `plugins/`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { PLUGINS, walk } from "./repo.ts";

const SKIP = ["node_modules", ".git"];
const files = (dir: string): string[] => walk(dir, { skip: SKIP });

/** The `evals/` folder of each plugin that has one. */
const EVALS = fs
  .readdirSync(PLUGINS)
  .map((plugin) => path.join(PLUGINS, plugin, "evals"))
  .filter((dir) => fs.existsSync(dir));
const inEvals = (p: string): boolean =>
  EVALS.some((dir) => p.startsWith(dir + path.sep));

const cases = EVALS.flatMap(files).filter((p) =>
  p.endsWith(`${path.sep}case.yaml`),
);
const names = (
  await Promise.all(
    cases.map(async (file) => {
      const doc = parse(await Bun.file(file).text()) as {
        name: string;
        graders: { name: string }[];
      };
      return [doc.name, ...doc.graders.map((g) => g.name)];
    }),
  )
).flat();
const outside = files(PLUGINS).filter(
  (p) => !inEvals(p) && !fs.lstatSync(p).isSymbolicLink(),
);

test("the eval folder holds cases", () => {
  expect(cases.length > 0, `${cases.length}`).toBeTruthy();
});

test("a case file sits only in the eval folder", () => {
  const stray = files(PLUGINS).filter(
    (p) => path.basename(p) === "case.yaml" && !inEvals(p),
  );
  expect(stray).toStrictEqual([]);
});

// A lint of the live repository.
test("lint: no file outside the eval folder names `case.yaml`, a case, or a grader", async () => {
  const leaks = [];
  for (const file of outside) {
    const buf = Buffer.from(await Bun.file(file).bytes());
    if (buf.includes(0)) continue;
    const text = buf.toString("utf8");
    const hit = ["case.yaml", ...names].find((n) => text.includes(n));
    if (hit) leaks.push(`${path.relative(PLUGINS, file)}: ${hit}`);
  }
  expect(leaks).toStrictEqual([]);
});
