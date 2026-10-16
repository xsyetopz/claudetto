// The image of `just docker`: Bun from `packageManager`, `just` from `ci.yml`, and Claude Code `MIN_CLAUDE_CODE_VERSION`.
// `tools/docker.ts` and `tools/sandbox/linux/run.ts` build it with `checkImage`.

import path from "node:path";
import { $ } from "bun";
import { MIN_CLAUDE_CODE_VERSION } from "../limits.ts";
import { must, REPO } from "../recipes.ts";

const read = (...parts: string[]) => Bun.file(path.join(REPO, ...parts)).text();

/** The first group of `re` in `text`, or an error that names `what`. */
const found = (text: string, re: RegExp, what: string): string => {
  const value = re.exec(text)?.[1];
  if (value === undefined) throw new Error(`No ${what} found.`);
  return value;
};

/** Builds the image of `just docker` when it changed, and gives its tag. */
export const checkImage = async (): Promise<string> => {
  const bun = found(
    await read("package.json"),
    /"packageManager": "bun@([^"]+)"/,
    "Bun version in `package.json`",
  );
  const just = found(
    await read(".github", "workflows", "ci.yml"),
    /just-version: (\S+)/,
    "`just-version` in `ci.yml`",
  );
  const image = `claudetto-check:bun${bun}-cc${MIN_CLAUDE_CODE_VERSION}`;
  await must(
    $`docker build --quiet --tag ${image} --build-arg BUN_VERSION=${bun} --build-arg JUST_VERSION=${just} --build-arg CLAUDE_CODE_VERSION=${MIN_CLAUDE_CODE_VERSION} ${path.join(REPO, "tools", "docker")}`.quiet(),
  );
  return image;
};
