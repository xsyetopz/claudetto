// The pin test of the settings snippet of the wiki.
// Each JSON block of the snippet must hold only keys of the generated schema, and none of the never-set keys.
// The never-set list and the checks are in `tests/support/settings-pin.ts`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { REPO } from "../support/repo.ts";
import {
  neverSetViolations,
  problems,
  SCHEMA,
  type Settings,
} from "../support/settings-pin.ts";
import { validate } from "../support/validate.ts";

const SNIPPET = "wiki/claudetto/reference/Settings-Snippet.md";

/** The parsed JSON blocks of a Markdown file, or an empty list when the file is absent. */
const jsonBlocks = async (file: string): Promise<Settings[]> => {
  const full = path.join(REPO, file);
  if (!fs.existsSync(full)) return [];
  const text = await Bun.file(full).text();
  return [...text.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) =>
    JSON.parse(m[1] as string),
  );
};

// A docs lint: it pins the JSON blocks of the wiki settings snippet, by design (task 25.22).
test(`lint: each JSON block of \`${SNIPPET}\` has only keys of the schema and no never-set key`, async () => {
  for (const block of await jsonBlocks(SNIPPET))
    expect(problems(block)).toStrictEqual([]);
});

test("a fixture with `CLAUDE_CODE_EFFORT_LEVEL` fails, and the failure names it", () => {
  const fixture = {
    env: { CLAUDE_CODE_EFFORT_LEVEL: "high" },
    disableAllHooks: true,
  };
  expect(neverSetViolations(fixture)).toStrictEqual([
    "disableAllHooks",
    "env.CLAUDE_CODE_EFFORT_LEVEL",
  ]);
  const found = problems(fixture);
  expect(found).toHaveLength(2);
  expect(found[0]).toContain("disableAllHooks");
  expect(found[1]).toContain("env.CLAUDE_CODE_EFFORT_LEVEL");
});

test("a fixture with an `attribution` block fails, because the hook adds the lines", () => {
  const found = problems({ attribution: { commit: "x" } });
  expect(found).toHaveLength(1);
  expect(found[0]).toContain("attribution");
});

test("a fixture with an unknown key fails, and the failure names the key", () => {
  const found = problems({ notAClaudeKey: true });
  expect(found).toHaveLength(1);
  expect(found[0]).toContain("notAClaudeKey");
});

test("a fixture with a key of the schema and a never-set env entry passes the schema check and fails the pin", () => {
  const fixture = { model: "x", env: { CLAUDE_CODE_SIMPLE: "1" } };
  expect(validate(fixture, SCHEMA)).toStrictEqual([]);
  const found = problems(fixture);
  expect(found).toHaveLength(1);
  expect(found[0]).toContain("env.CLAUDE_CODE_SIMPLE");
});

test("a never-set entry with a banned value is flagged only for that value", () => {
  expect(
    neverSetViolations({ env: { CLAUDE_CODE_ENABLE_TASKS: "0" } }),
  ).toStrictEqual(["env.CLAUDE_CODE_ENABLE_TASKS"]);
  expect(
    neverSetViolations({ env: { CLAUDE_CODE_ENABLE_TASKS: "1" } }),
  ).toStrictEqual([]);
});
