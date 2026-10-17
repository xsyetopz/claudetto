// Tests of the four parts of each agent prompt and of the delegation text of the `Agent` tool (design D33).
// The parts are an objective, an output format, the tools, and the limits, and each text asks for bulk output in a file.
// The tests check the sections and the fragments of each source, and that the generated file holds the fragment text.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { REPO } from "../../support/repo.ts";

const SOURCE = path.join(REPO, "src/plugins/claudetto/slices/agents/agents");
const BUILT = path.join(REPO, "plugins/claudetto/agents");
const FRAGMENTS = path.join(REPO, "src/fragments");
const AGENT_TOOL = path.join(
  REPO,
  "src/plugins/claudetto/slices/surface/prompts/tool-agent.md",
);
const AGENT_TOOL_BUILT = path.join(
  REPO,
  "plugins/claudetto/slices/surface/prompts.ts",
);

const names = fs
  .readdirSync(SOURCE)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.slice(0, -3));

const read = (file: string): Promise<string> => Bun.file(file).text();

/** The text of `src/fragments/<name>.md`, with no end newline. */
const fragment = async (name: string): Promise<string> =>
  (await read(path.join(FRAGMENTS, `${name}.md`))).trimEnd();

/** The body of the section `<tag>` of `text`, or `null` when it has none. */
const section = (text: string, tag: string): string | null => {
  const m = new RegExp(`^<${tag}>\\n([\\s\\S]*?)^</${tag}>`, "m").exec(text);
  return m ? (m[1] ?? "") : null;
};

/** The frontmatter and the body of an agent file. */
const split = (text: string): { front: string; body: string } => {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  return { front: m?.[1] ?? "", body: m?.[2] ?? "" };
};

test("the agent folder has agents", () => {
  expect(names.length).toBeGreaterThan(0);
});

for (const name of names) {
  test(`\`${name}\` gives an objective, an output format, the tools, and the limits`, async () => {
    const { front, body } = split(await read(path.join(SOURCE, `${name}.md`)));
    const intro = body.slice(0, body.search(/^</m));
    expect(intro).toMatch(/^Your goal is /m);
    expect(section(body, "report_format")).not.toBeNull();
    expect(front).toMatch(/^tools: \S/m);
    expect(section(body, "rules")).toContain("{{include search-route}}");
    expect(section(body, "scope_of_work")?.trim()).toBeTruthy();
  });

  test(`\`${name}\` asks for bulk output in a file in its report format`, async () => {
    const body = await read(path.join(SOURCE, `${name}.md`));
    expect(section(body, "report_format")).toContain("{{include report-file}}");
    expect(await read(path.join(BUILT, `${name}.md`))).toContain(
      await fragment("report-file"),
    );
  });
}

test("the delegation text of the `Agent` tool asks for the four parts and bulk output in a file", async () => {
  expect(await read(AGENT_TOOL)).toContain("{{include brief-parts}}");
  const built = await read(AGENT_TOOL_BUILT);
  for (const line of (await fragment("brief-parts")).split("\n"))
    expect(built).toContain(line);
});
