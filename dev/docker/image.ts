// The image of `just docker`: Bun from `packageManager`, `just` from `JUST_VERSION` of `tools/limits.ts`, and Claude Code `MIN_CLAUDE_CODE_VERSION`.
// `dev/docker.ts` and `dev/sandbox/linux/run.ts` build it with `checkImage`.

import path from "node:path";
import { $, file, which } from "bun";
import { JUST_VERSION, MIN_CLAUDE_CODE_VERSION } from "../../tools/limits.ts";
import { fail, must, REPO } from "../../tools/recipes.ts";

const PACKAGE_MANAGER = /"packageManager": "bun@([^"]+)"/;

const read = (...parts: string[]) => file(path.join(REPO, ...parts)).text();

/** The first group of `re` in `text`, or an error that names `what`. */
const found = (text: string, re: RegExp, what: string): string => {
	const value = re.exec(text)?.[1];
	if (value === undefined) {
		throw new Error(`No ${what} found.`);
	}
	return value;
};

/** Builds the image of `just docker` when it changed, and gives its tag. */
export const checkImage = async (): Promise<string> => {
	if (!which("docker")) {
		console.error(
			"The `docker` CLI is not on `PATH`. Start OrbStack with `open -a OrbStack` or `orb start`, then run the recipe again.",
		);
		fail(1);
	}
	const bun = found(
		await read("package.json"),
		PACKAGE_MANAGER,
		"Bun version in `package.json`",
	);
	const image = `claudetto-check:bun${bun}-cc${MIN_CLAUDE_CODE_VERSION}`;
	await must(
		$`docker build --quiet --tag ${image} --build-arg BUN_VERSION=${bun} --build-arg JUST_VERSION=${JUST_VERSION} --build-arg CLAUDE_CODE_VERSION=${MIN_CLAUDE_CODE_VERSION} ${path.join(REPO, "dev", "docker")}`.quiet(),
	);
	return image;
};
