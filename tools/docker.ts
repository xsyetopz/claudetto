// `just docker`: runs a recipe of the `justfile` (default: `check`) in a container,
// so the tests, the hook lab, and the other checks use at most `DOCKER_CPUS` CPUs of the host.
// The image has the versions of `ci.yml`: Bun from `packageManager`, `just`, and Claude Code `MIN_CLAUDE_CODE_VERSION`.
// The repository is mounted at `/repo`, and `node_modules` is a volume, because the packages of the host are for macOS.
// The sandbox sessions use the login of the host, so they do not run here.

import path from "node:path";
import { $ } from "bun";
import { DOCKER_CPUS, MIN_CLAUDE_CODE_VERSION } from "./limits.ts";
import { must, REPO, recipe } from "./recipes.ts";

const read = (...parts: string[]) => Bun.file(path.join(REPO, ...parts)).text();

/** The first group of `re` in `text`, or an error that names `what`. */
const found = (text: string, re: RegExp, what: string): string => {
  const value = re.exec(text)?.[1];
  if (value === undefined) throw new Error(`No ${what} found.`);
  return value;
};

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
const args = process.argv.slice(2);

await recipe(async () => {
  await must(
    $`docker build --quiet --tag ${image} --build-arg BUN_VERSION=${bun} --build-arg JUST_VERSION=${just} --build-arg CLAUDE_CODE_VERSION=${MIN_CLAUDE_CODE_VERSION} ${path.join(REPO, "tools", "docker")}`.quiet(),
  );
  await must(
    $`docker run --rm --cpus ${DOCKER_CPUS} --volume ${REPO}:/repo --volume claudetto-node-modules:/repo/node_modules ${image} sh -c ${'bun install --frozen-lockfile && just "$@"'} sh ${args.length > 0 ? args : ["check"]}`,
  );
});
