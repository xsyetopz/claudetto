// The Docker step of setup: the sandbox blocks the Docker socket, so a project that uses Docker needs `sandbox.network.allowUnixSockets` with that socket.
// Measured on 2026-10-19 with sandbox-runtime 0.0.80: the socket rule is enough, and `excludedCommands` is not needed on macOS.
// Claude Code ignores `allowUnixSockets` on Linux, so there the step uses the `excludedCommands` fallback (see `adapters/cli.ts`).

import path from "node:path";

/** The files whose presence means that the project uses Docker. */
const DOCKER_FILES = [
  "Dockerfile",
  "compose.yaml",
  "compose.yml",
  "docker-compose.yaml",
  "docker-compose.yml",
];

/** A root file name that means Docker: `Dockerfile.dev`, or a Compose override file. */
const DOCKER_NAME = /^(Dockerfile\..+|(docker-)?compose\.override\.ya?ml)$/;

/** The files whose text can call `docker` in a script or a recipe. */
const SCRIPT_FILES = ["justfile", "Justfile", "package.json"];

/** The sockets, in order, that setup tries when `DOCKER_HOST` names no socket. */
const SOCKETS = (home: string) => [
  path.join(home, ".orbstack/run/docker.sock"),
  path.join(home, ".docker/run/docker.sock"),
  "/var/run/docker.sock",
];

/** True when the project has a Docker file, or a `justfile` or `package.json` that calls `docker` as a word. */
export const usesDocker = (
  exists: (name: string) => boolean,
  read: (name: string) => string,
  list: () => string[] = () => [],
): boolean =>
  DOCKER_FILES.some(exists) ||
  list().some((name) => DOCKER_NAME.test(name)) ||
  SCRIPT_FILES.some(
    (f) =>
      exists(f) && /(^|[\s"'`&|;(@-])docker(-compose)?(\s|$)/m.test(read(f)),
  );

/** The socket in use: `DOCKER_HOST` when it is `unix://`, else the first known socket that exists. */
export const dockerSocket = (
  env: NodeJS.ProcessEnv,
  home: string,
  exists: (file: string) => boolean,
): string | undefined => {
  const host = env["DOCKER_HOST"];
  if (host?.startsWith("unix://")) return host.slice("unix://".length);
  return SOCKETS(home).find(exists);
};
