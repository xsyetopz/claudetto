// The agent files of the core plugin: the roster of five, the description bound, and the `model` and `effort` of the frontmatter.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { SUBAGENT_EFFORTS } from "../../plugins/dotclaude/features/statusline/limits.ts";
import { AGENT_DESCRIPTION_MAX_CHARS } from "../../tools/limits.ts";
import { PLUGINS } from "../support/repo.ts";

const DIR = path.join(PLUGINS, "dotclaude/agents");
const ROSTER = [
  "debugger",
  "implementer",
  "investigator",
  "reviewer",
  "test-runner",
];
const frontMatter = (text: string): Record<string, string> =>
  Object.fromEntries(
    (text.split("\n---")[0] as string)
      .split("\n")
      .slice(1)
      .map((line) => line.match(/^([\w-]+):\s*(.*)$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1] as string, m[2] as string]),
  );
const agents = () =>
  Promise.all(
    fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map(async (f) => {
        const text = await Bun.file(path.join(DIR, f)).text();
        return {
          file: f,
          name: f.replace(/\.md$/, ""),
          text,
          fm: frontMatter(text),
        };
      }),
  );

/** The names of the agents whose description is over `max` characters. */
const tooLong = (
  list: { name: string; fm: Record<string, string> }[],
  max = AGENT_DESCRIPTION_MAX_CHARS,
) =>
  list
    .filter((a) => (a.fm["description"] as string).length > max)
    .map((a) => a.name);

test("the agent files are the five agents of the roster, and no other", async () => {
  expect((await agents()).map((a) => a.name)).toStrictEqual(ROSTER);
  for (const a of await agents()) expect(a.fm["name"]).toBe(a.name);
});

test("no description is over the bound, and a 301-character fixture fails", async () => {
  expect(AGENT_DESCRIPTION_MAX_CHARS).toBe(300);
  expect(tooLong(await agents())).toStrictEqual([]);
  const fixture = [
    { name: "ok", fm: { description: "x".repeat(300) } },
    { name: "long", fm: { description: "x".repeat(301) } },
  ];
  expect(tooLong(fixture)).toStrictEqual(["long"]);
});

test("each agent file sets a roster `model` and an `effort` that the model takes, never `max`", async () => {
  for (const a of await agents()) {
    const list =
      SUBAGENT_EFFORTS[a.fm["model"]?.replace(/^claude-/, "") as string];
    expect(list, a.name).not.toBe(undefined);
    expect(list?.includes(a.fm["effort"] as string), a.name).toBeTruthy();
    expect(a.fm["effort"], a.name).not.toBe("max");
  }
});
