import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { OPTIONAL_TOOLS } from "../tools.ts";

const AGENTS = join(import.meta.dir, "../../../../agents");

describe("`OPTIONAL_TOOLS`", () => {
	test("names, for each tool, the agent files whose text names it", async () => {
		const names = (await readdir(AGENTS)).filter((f) => f.endsWith(".md"));
		const agents = await Promise.all(
			names.map(async (name) => ({
				agent: basename(name, ".md"),
				text: await readFile(join(AGENTS, name), "utf8"),
			})),
		);
		for (const tool of OPTIONAL_TOOLS) {
			const naming = agents
				.filter(({ text }) => text.includes(tool.id))
				.map(({ agent }) => agent);
			const byName = (a: string, b: string) => a.localeCompare(b);
			expect(tool.agents.toSorted(byName)).toEqual(naming.toSorted(byName));
		}
	});
});
