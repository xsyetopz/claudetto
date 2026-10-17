// Runs of `claudetto-setup addons`, the add-on step of setup.
// The `codegraph` here is a STUB Node script in a temporary `bin` folder that logs each call to `calls.log`.
// `PATH` holds only the stub folder, so `agent-browser` and `bunx` are not found.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  installedAddons,
  planAddons,
} from "../../../plugins/claudetto/slices/setup/domain/addons.ts";
import { BUN_MIN } from "../../../plugins/claudetto/slices/setup/limits.ts";
import { writeProgram } from "../../support/fake-program.ts";
import type { Env } from "../../support/repo.ts";
import { PLUGINS, REPO, tmpDir } from "../../support/repo.ts";

type Sandbox = { config: string; project: string; stub: string };

const SCRIPT = path.join(PLUGINS, "claudetto/bin/claudetto-setup");
const STUB = `const fs = require("node:fs");
const path = require("node:path");
fs.appendFileSync(path.join(process.env.STUB_DIR, "calls.log"), process.argv.slice(2).join(" ") + "\\n");
if (process.argv[2] === "--version") console.log("9.9.9");
`;

/** A config folder with `ids` installed, a project folder, and a stub folder with `codegraph`. */
const sandbox = async (ids: string[]) => {
  const root = tmpDir("dc-addons");
  const d = {
    config: path.join(root, "config"),
    project: path.join(root, "project"),
    stub: path.join(root, "stub"),
  };
  for (const dir of Object.values(d)) fs.mkdirSync(dir);
  fs.mkdirSync(path.join(d.config, "plugins"));
  await Bun.write(
    path.join(d.config, "plugins/installed_plugins.json"),
    JSON.stringify({ plugins: Object.fromEntries(ids.map((id) => [id, []])) }),
  );
  await writeProgram(d.stub, "codegraph", STUB);
  return d;
};

const run = (d: Sandbox, args: string[], env: Env = {}) => {
  const r = Bun.spawnSync(
    [process.execPath, "--no-env-file", SCRIPT, "addons", ...args],
    {
      env: {
        CLAUDE_CONFIG_DIR: d.config,
        CLAUDE_PROJECT_DIR: d.project,
        PATH: [d.stub].join(path.delimiter),
        STUB_DIR: d.stub,
        ...env,
      },
    },
  );
  return {
    status: r.exitCode,
    stdout: r.stdout.toString(),
    stderr: r.stderr.toString(),
  };
};

const calls = async (d: Sandbox) => {
  const file = path.join(d.stub, "calls.log");
  return fs.existsSync(file)
    ? (await Bun.file(file).text())
        .trim()
        .split(/\r?\n/)
        .filter((c) => c !== "--version")
    : [];
};

test("no installed add-on prints one line and runs nothing", async () => {
  const d = await sandbox(["claudetto@claudetto"]);
  const r = run(d, ["--apply"]);
  expect(r.status).toBe(0);
  expect(await calls(d)).toStrictEqual([]);
});

test("a preview lists the missing index and the missing `agent-browser`, and runs no step", async () => {
  const d = await sandbox([
    "claudetto-codegraph@claudetto",
    "claudetto-browser@claudetto",
  ]);
  const r = run(d, []);
  expect(r.status, r.stderr).toBe(0);
  expect(r.stdout).toMatch(/codegraph 9\.9\.9, index missing/);
  expect(r.stdout).toMatch(/npm install -g agent-browser/);
  expect(r.stdout).toMatch(/codegraph init -y/);
  expect(await calls(d)).toStrictEqual([]);
});

test("`--apply` runs `codegraph init -y` in the project and no global install", async () => {
  const d = await sandbox(["claudetto-codegraph@claudetto"]);
  expect(run(d, ["--apply"]).status).toBe(0);
  expect(await calls(d)).toStrictEqual(["init -y"]);
});

test("a project with an index gets no step", async () => {
  const d = await sandbox(["claudetto-codegraph@claudetto"]);
  fs.mkdirSync(path.join(d.project, ".codegraph"));
  await Bun.write(path.join(d.project, ".codegraph/codegraph.db"), "");
  run(d, ["--apply"]);
  expect(await calls(d)).toStrictEqual([]);
});

test("an add-on that the user settings turn off is not checked", () => {
  expect(
    installedAddons(
      {
        plugins: {
          "claudetto@claudetto": [],
          "claudetto-browser@claudetto": [],
          "claudetto-lab@claudetto": [],
          "other@market": [],
        },
      },
      { "claudetto-browser@claudetto": false },
    ),
  ).toStrictEqual(["claudetto-lab"]);
});

test("the line of `claudetto-sessions` and `claudetto-lab` names `BUN_MIN` only for an older Bun", () => {
  const plan = (bun: string) =>
    planAddons(["claudetto-sessions", "claudetto-lab"], {
      projectDir: tmpDir("dc-bun"),
      bun,
      version: () => null,
      indexBuilt: false,
    }).lines;
  expect(plan("1.3.9").every((line) => line.includes(`than ${BUN_MIN}`))).toBe(
    true,
  );
  expect(plan(BUN_MIN).some((line) => line.includes(`than ${BUN_MIN}`))).toBe(
    false,
  );
  expect(plan("1.10.0").some((line) => line.includes(`than ${BUN_MIN}`))).toBe(
    false,
  );
});

test("`BUN_MIN` is the version of `engines.bun` in `package.json`", async () => {
  const manifest = await Bun.file(path.join(REPO, "package.json")).json();
  expect(manifest.engines.bun).toBe(`>=${BUN_MIN}`);
});
