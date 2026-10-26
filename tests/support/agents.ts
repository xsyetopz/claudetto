// The agent files of the core plugin, for the tests of `tests/claudetto/agents/`.

import path from "node:path";
import { parse } from "yaml";
import { PLUGINS } from "./repo.ts";

export const AGENTS = path.join(PLUGINS, "claudetto/agents");
export const ROSTER = [
  "Artemis",
  "Zeus",
  "Athena",
  "Hermes",
  "Hephaestus",
  "Apollo",
];

/** The frontmatter of the agent file `name`, or `null` when the file is absent. */
export const front = async (
  name: string,
): Promise<Record<string, unknown> | null> => {
  const file = Bun.file(path.join(AGENTS, `${name}.md`));
  if (!(await file.exists())) return null;
  const m = /^---\n([\s\S]*?)\n---/.exec(await file.text());
  return m ? parse(m[1] as string) : null;
};

/** The `tools` list of the agent file `name`. */
export const tools = async (name: string): Promise<string[]> =>
  String((await front(name))?.["tools"] ?? "").split(/,\s*/);
