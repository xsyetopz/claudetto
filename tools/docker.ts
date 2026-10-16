// `just docker`: runs a recipe of the `justfile` (default: `check`) in a container,
// so the tests, the hook lab, and the other checks use at most `DOCKER_CPUS` CPUs of the host.
// The image is the one of `tools/docker/image.ts`.
// The repository is mounted at `/repo`, and `node_modules` is a volume, because the packages of the host are for macOS.
// The sandbox sessions use the login of the host, so they do not run here, and `just sandbox-linux` gives its login to its own container.

import { $ } from "bun";
import { checkImage } from "./docker/image.ts";
import { DOCKER_CPUS } from "./limits.ts";
import { must, REPO, recipe } from "./recipes.ts";

const args = process.argv.slice(2);

await recipe(async () => {
  const image = await checkImage();
  await must(
    $`docker run --rm --cpus ${DOCKER_CPUS} --volume ${REPO}:/repo --volume claudetto-node-modules:/repo/node_modules ${image} sh -c ${'bun install --frozen-lockfile && just "$@"'} sh ${args.length > 0 ? args : ["check"]}`,
  );
});
