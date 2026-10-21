// The Docker step of `claudetto-setup`: a project that uses Docker gets `sandbox.network.allowUnixSockets` with the socket, in the local settings.
// On Linux, Claude Code ignores `allowUnixSockets`, so the step writes `docker *` to `excludedCommands` with an allow rule.

import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/setup/adapters/cli.ts";
import {
  dockerSocket,
  usesDocker,
} from "../../../plugins/claudetto/slices/setup/domain/docker.ts";

const HOME = "/home/u";
const ORB = `${HOME}/.orbstack/run/docker.sock`;
const DESKTOP = `${HOME}/.docker/run/docker.sock`;

/** Runs `claudetto-setup` with `args` in a new project with `files`, and gives the local settings and the output. */
const run = async (
  files: Record<string, string>,
  existing: string[],
  opts: {
    args?: string[];
    times?: number;
    before?: unknown;
    platform?: string;
  } = {},
) => {
  const { args = ["--apply"], times = 1, before, platform = "darwin" } = opts;
  const dir = await mkdtemp(path.join(os.tmpdir(), "docker-"));
  const project = path.join(dir, "project");
  await mkdir(path.join(project, ".claude"), { recursive: true });
  for (const [name, text] of Object.entries(files))
    await Bun.write(path.join(project, name), text);
  const local = path.join(project, ".claude", "settings.local.json");
  if (before) await Bun.write(local, JSON.stringify(before));
  const out: string[] = [];
  const io = { log: (l: string) => out.push(l), error: () => {} };
  const env = { CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: project, HOME };
  for (let i = 0; i < times; i++)
    expect(
      await main(args, env, project, io, (p) => existing.includes(p), platform),
    ).toBe(0);
  const text = (await Bun.file(local).exists())
    ? await Bun.file(local).text()
    : null;
  const settings = text ? JSON.parse(text) : {};
  return {
    sockets: settings.sandbox?.network?.allowUnixSockets,
    excluded: settings.sandbox?.excludedCommands,
    allow: settings.permissions?.allow,
    out,
    text,
    settings,
  };
};

test("setup offers the Docker socket for a project with a `Dockerfile`", async () => {
  const { sockets } = await run({ Dockerfile: "FROM scratch\n" }, [ORB]);
  expect(sockets).toEqual([ORB]);
});

test("setup offers the socket for a `justfile` recipe that calls `docker`", async () => {
  const { sockets } = await run(
    { justfile: "check:\n  docker compose run t\n" },
    [ORB],
  );
  expect(sockets).toEqual([ORB]);
});

test("setup offers the socket for a `package.json` script that calls `docker`", async () => {
  const pkg = JSON.stringify({ scripts: { up: "docker compose up" } });
  const { sockets } = await run({ "package.json": pkg }, [ORB]);
  expect(sockets).toEqual([ORB]);
});

test("setup offers nothing for a project that does not use Docker", async () => {
  const { sockets, out } = await run(
    { justfile: "check:\n  echo dockerless\n", "package.json": "{}" },
    [ORB],
  );
  expect(sockets).toBeUndefined();
  expect(out.join("\n")).not.toContain("allowUnixSockets");
});

test("a second run adds no duplicate, and the entries of the user stay", async () => {
  const { sockets } = await run({ "compose.yaml": "services: {}\n" }, [ORB], {
    times: 2,
    before: { sandbox: { network: { allowUnixSockets: ["/tmp/mine.sock"] } } },
  });
  expect(sockets).toEqual(["/tmp/mine.sock", ORB]);
});

test("a dry run prints the offer and the hint, and writes nothing", async () => {
  const { text, out } = await run({ Dockerfile: "FROM scratch\n" }, [ORB], {
    args: [],
  });
  expect(text).toBeNull();
  expect(out.join("\n")).toContain("allowUnixSockets");
  expect(out.join("\n")).toMatch(/--apply/);
});

test("with `--scope local`, the socket entry stays next to the snippet", async () => {
  const { sockets, text } = await run({ Dockerfile: "FROM scratch\n" }, [ORB], {
    args: ["--apply", "--scope", "local"],
  });
  expect(sockets).toEqual([ORB]);
  expect(text).toContain("allowLocalBinding");
});

test("`--addons` leaves the local settings as they are", async () => {
  const { text } = await run({ Dockerfile: "FROM scratch\n" }, [ORB], {
    args: ["--addons"],
  });
  expect(text).toBeNull();
});

test("on Linux, setup writes `docker *` to `excludedCommands` with an allow rule, and no socket", async () => {
  const { sockets, excluded, allow } = await run(
    { Dockerfile: "FROM scratch\n" },
    [ORB],
    { platform: "linux" },
  );
  expect(sockets).toBeUndefined();
  expect(excluded).toEqual(["docker *"]);
  expect(allow).toEqual(["Bash(docker *)"]);
});

test("on Linux, a second run adds no duplicate, and the entries of the user stay", async () => {
  const { excluded, allow } = await run({ Dockerfile: "x\n" }, [ORB], {
    platform: "linux",
    times: 2,
    before: {
      sandbox: { excludedCommands: ["make *"] },
      permissions: { allow: ["Bash(ls)"] },
    },
  });
  expect(excluded).toEqual(["make *", "docker *"]);
  expect(allow).toEqual(["Bash(ls)", "Bash(docker *)"]);
});

test("on macOS, setup writes no `excludedCommands` entry for `docker *`", async () => {
  const { excluded, allow } = await run({ Dockerfile: "x\n" }, [ORB]);
  expect(excluded).toBeUndefined();
  expect(allow).toBeUndefined();
});

test("off macOS and Linux, setup writes nothing for Docker", async () => {
  const { text } = await run({ Dockerfile: "FROM scratch\n" }, [ORB], {
    platform: "win32",
  });
  expect(text).toBeNull();
});

test("a local settings file that does not parse is reported", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "docker-"));
  const project = path.join(dir, "project");
  await mkdir(path.join(project, ".claude"), { recursive: true });
  await Bun.write(path.join(project, "Dockerfile"), "FROM scratch\n");
  await Bun.write(path.join(project, ".claude", "settings.local.json"), "{");
  const errors: string[] = [];
  const io = { log: () => {}, error: (l: string) => errors.push(l) };
  const env = { CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: project, HOME };
  const status = await main(
    ["--apply"],
    env,
    project,
    io,
    () => true,
    "darwin",
  );
  expect(status).toBe(1);
  expect(errors.join("\n")).toContain("settings.local.json");
});

test("`usesDocker` accepts recipe prefixes, backticks, `docker-compose`, and the root name patterns", () => {
  const has = (names: string[]) => (n: string) => names.includes(n);
  const just = (text: string) => usesDocker(has(["justfile"]), () => text);
  expect(just("t:\n  @docker ps\n")).toBe(true);
  expect(just("t:\n  -docker ps\n")).toBe(true);
  expect(just("v := `docker context show`\n")).toBe(true);
  expect(just("t:\n  docker-compose up\n")).toBe(true);
  expect(just("t:\n  echo dockerless\n")).toBe(false);
  expect(
    usesDocker(
      has([]),
      () => "",
      () => ["Dockerfile.dev"],
    ),
  ).toBe(true);
  expect(
    usesDocker(
      has([]),
      () => "",
      () => ["compose.override.yaml"],
    ),
  ).toBe(true);
  expect(
    usesDocker(
      has([]),
      () => "",
      () => ["docker-compose.override.yml"],
    ),
  ).toBe(true);
});

test("`usesDocker` reads the file names and the scripts", () => {
  const has = (names: string[]) => (n: string) => names.includes(n);
  expect(usesDocker(has(["docker-compose.yml"]), () => "")).toBe(true);
  expect(usesDocker(has([]), () => "")).toBe(false);
});

test("the socket is `DOCKER_HOST`, else the first existing of the known paths", () => {
  const all = () => true;
  expect(dockerSocket({ DOCKER_HOST: "unix:///x/d.sock" }, HOME, all)).toBe(
    "/x/d.sock",
  );
  expect(dockerSocket({ DOCKER_HOST: "tcp://h:1" }, HOME, all)).toBe(ORB);
  expect(
    dockerSocket(
      {},
      HOME,
      (p) => p === DESKTOP || p === "/var/run/docker.sock",
    ),
  ).toBe(DESKTOP);
  expect(dockerSocket({}, HOME, (p) => p === "/var/run/docker.sock")).toBe(
    "/var/run/docker.sock",
  );
  expect(dockerSocket({}, HOME, () => false)).toBeUndefined();
});
