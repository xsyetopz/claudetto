// The agent files of the core plugin, for the tests of `tests/claudetto/agents/`.

import path from "node:path";
import { file as bunFile } from "bun";
import { parse } from "yaml";
import { PLUGINS } from "./repo.ts";

export const AGENTS = path.join(PLUGINS, "claudetto/agents");
const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
const LIST_SEPARATOR = /,\s*/;

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
	const file = bunFile(path.join(AGENTS, `${name}.md`));
	if (!(await file.exists())) {
		return null;
	}
	const body = FRONTMATTER.exec(await file.text())?.[1];
	return body === undefined ? null : parse(body);
};

/** The `tools` list of the agent file `name`. */
export const tools = async (name: string): Promise<string[]> =>
	String((await front(name))?.["tools"] ?? "").split(LIST_SEPARATOR);
