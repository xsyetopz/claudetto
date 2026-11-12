import { expect, test } from "bun:test";

import { $ } from "bun";

import { MINIMUM_VERSION } from "../plugins/claudetto/hooks/command.run/useSetup/settings.ts";

// CI checks the plugin on the oldest Claude Code it supports, from one install step every workflow shares.
test("CI installs Claude Code once, at the minimum version", async () => {
	const installs =
		await $`git grep --untracked -h -o -E "@anthropic-ai/claude-code@[^ ]+" -- .github`
			.cwd(`${import.meta.dir}/..`)
			.text();
	expect(installs.trim().split("\n")).toEqual([
		`@anthropic-ai/claude-code@${MINIMUM_VERSION}`,
	]);
});
